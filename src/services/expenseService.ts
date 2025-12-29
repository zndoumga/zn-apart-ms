import { supabase, TABLES } from './supabase';
import { uploadFile, deleteFile } from './storageService';
import { logAction } from './auditService';
import { createTransaction, getTransactionByReference, deleteTransaction } from './mobileMoneyService';
import type { Expense, ExpenseFormData, UserMode } from '../types';

// Helper to convert string or Date to ISO string
function toISOString(value: string | Date): string {
  if (typeof value === 'string') {
    return new Date(value).toISOString();
  }
  return value.toISOString();
}

/**
 * Get all expenses
 */
export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from(TABLES.EXPENSES)
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }

  return (data || []).map(mapExpenseFromDB);
}

/**
 * Get expenses by property ID
 */
export async function getExpensesByProperty(propertyId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from(TABLES.EXPENSES)
    .select('*')
    .eq('property_id', propertyId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses by property:', error);
    throw error;
  }

  return (data || []).map(mapExpenseFromDB);
}

/**
 * Get expenses within a date range
 */
export async function getExpensesInRange(
  startDate: Date,
  endDate: Date
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from(TABLES.EXPENSES)
    .select('*')
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses in range:', error);
    throw error;
  }

  return (data || []).map(mapExpenseFromDB);
}

/**
 * Get a single expense by ID
 */
export async function getExpense(id: string): Promise<Expense | null> {
  const { data, error } = await supabase
    .from(TABLES.EXPENSES)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching expense:', error);
    throw error;
  }

  return data ? mapExpenseFromDB(data) : null;
}

/**
 * Create a new expense
 */
export async function createExpense(
  formData: ExpenseFormData,
  receipt: File | null,
  performedBy: UserMode
): Promise<Expense> {
  let receiptUrl: string | null = null;
  if (receipt) {
    receiptUrl = await uploadFile(receipt, 'EXPENSE_RECEIPTS', 'receipts');
  }

  const expenseData = {
    property_id: formData.propertyId || null,
    category: formData.category,
    description: formData.description,
    amount_eur: formData.amountEUR,
    amount_fcfa: formData.amountFCFA,
    date: toISOString(formData.date),
    vendor: formData.vendor || null,
    receipt_url: receiptUrl,
    notes: formData.notes || null,
    is_recurring: formData.isRecurring || false,
    recurring_frequency: formData.recurringFrequency || null,
  };

  const { data, error } = await supabase
    .from(TABLES.EXPENSES)
    .insert(expenseData)
    .select()
    .single();

  if (error) {
    console.error('Error creating expense:', error);
    throw error;
  }

  const expense = mapExpenseFromDB(data);

  // If paid from mobile money, create a withdrawal transaction
  if (formData.paidFromMobileMoney) {
    try {
      await createTransaction(
        {
          type: 'withdrawal',
          amountEUR: formData.amountEUR,
          amountFCFA: formData.amountFCFA,
          description: `Dépense: ${formData.description}${formData.vendor ? ` (${formData.vendor})` : ''}`,
          date: formData.date,
          reference: expense.id,
        },
        performedBy
      );
    } catch (error) {
      console.error('Error creating mobile money transaction for expense:', error);
      // Don't throw - expense is already created, just log the error
    }
  }

  await logAction({
    action: 'create',
    entity: 'expense',
    entityId: expense.id,
    performedBy,
    newData: expense,
  });

  return expense;
}

/**
 * Update an expense
 */
export async function updateExpense(
  id: string,
  formData: Partial<ExpenseFormData>,
  newReceipt: File | null,
  performedBy: UserMode
): Promise<Expense> {
  const currentExpense = await getExpense(id);
  if (!currentExpense) {
    throw new Error('Expense not found');
  }

  let receiptUrl = currentExpense.receiptUrl;

  // Handle receipt change
  if (newReceipt) {
    // Delete old receipt if exists
    if (currentExpense.receiptUrl) {
      await deleteFile(currentExpense.receiptUrl, 'EXPENSE_RECEIPTS');
    }
    receiptUrl = await uploadFile(newReceipt, 'EXPENSE_RECEIPTS', 'receipts');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    receipt_url: receiptUrl,
  };

  if (formData.propertyId !== undefined) updateData.property_id = formData.propertyId;
  if (formData.category !== undefined) updateData.category = formData.category;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.amountEUR !== undefined) updateData.amount_eur = formData.amountEUR;
  if (formData.amountFCFA !== undefined) updateData.amount_fcfa = formData.amountFCFA;
  if (formData.date !== undefined) updateData.date = toISOString(formData.date);
  if (formData.vendor !== undefined) updateData.vendor = formData.vendor;
  if (formData.notes !== undefined) updateData.notes = formData.notes;
  if (formData.isRecurring !== undefined) updateData.is_recurring = formData.isRecurring;
  if (formData.recurringFrequency !== undefined) updateData.recurring_frequency = formData.recurringFrequency;

  const { data, error } = await supabase
    .from(TABLES.EXPENSES)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating expense:', error);
    throw error;
  }

  const updatedExpense = mapExpenseFromDB(data);

  // Handle mobile money transaction
  const existingTransaction = await getTransactionByReference(id);
  const shouldHaveTransaction = formData.paidFromMobileMoney === true;
  const hasTransaction = !!existingTransaction;

  if (shouldHaveTransaction && !hasTransaction) {
    // Create transaction if checkbox is checked but no transaction exists
    try {
      await createTransaction(
        {
          type: 'withdrawal',
          amountEUR: updatedExpense.amountEUR,
          amountFCFA: updatedExpense.amountFCFA,
          description: `Dépense: ${updatedExpense.description}${updatedExpense.vendor ? ` (${updatedExpense.vendor})` : ''}`,
          date: updatedExpense.date,
          reference: id,
        },
        performedBy
      );
    } catch (error) {
      console.error('Error creating mobile money transaction for expense:', error);
    }
  } else if (!shouldHaveTransaction && hasTransaction) {
    // Delete transaction if checkbox is unchecked but transaction exists
    try {
      await deleteTransaction(existingTransaction.id, performedBy);
    } catch (error) {
      console.error('Error deleting mobile money transaction for expense:', error);
    }
  } else if (shouldHaveTransaction && hasTransaction) {
    // Update transaction if amount or description changed
    if (
      existingTransaction.amountEUR !== updatedExpense.amountEUR ||
      existingTransaction.amountFCFA !== updatedExpense.amountFCFA ||
      !existingTransaction.description.includes(updatedExpense.description)
    ) {
      // Delete old and create new (simpler than updating)
      try {
        await deleteTransaction(existingTransaction.id, performedBy);
        await createTransaction(
          {
            type: 'withdrawal',
            amountEUR: updatedExpense.amountEUR,
            amountFCFA: updatedExpense.amountFCFA,
            description: `Dépense: ${updatedExpense.description}${updatedExpense.vendor ? ` (${updatedExpense.vendor})` : ''}`,
            date: updatedExpense.date,
            reference: id,
          },
          performedBy
        );
      } catch (error) {
        console.error('Error updating mobile money transaction for expense:', error);
      }
    }
  }

  await logAction({
    action: 'update',
    entity: 'expense',
    entityId: id,
    performedBy,
    previousData: currentExpense,
    newData: updatedExpense,
  });

  return updatedExpense;
}

/**
 * Delete an expense
 */
export async function deleteExpense(
  id: string,
  performedBy: UserMode
): Promise<void> {
  const expense = await getExpense(id);
  if (!expense) {
    throw new Error('Expense not found');
  }

  // Delete receipt if exists
  if (expense.receiptUrl) {
    await deleteFile(expense.receiptUrl, 'EXPENSE_RECEIPTS');
  }

  const { error } = await supabase
    .from(TABLES.EXPENSES)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }

  await logAction({
    action: 'delete',
    entity: 'expense',
    entityId: id,
    performedBy,
    previousData: expense,
  });
}

/**
 * Bulk create expenses (for import)
 */
export async function bulkCreateExpenses(
  expenses: ExpenseFormData[],
  performedBy: UserMode
): Promise<Expense[]> {
  const expenseDataArray = expenses.map((formData) => ({
    property_id: formData.propertyId || null,
    category: formData.category,
    description: formData.description,
    amount_eur: formData.amountEUR,
    amount_fcfa: formData.amountFCFA,
    date: toISOString(formData.date),
    vendor: formData.vendor || null,
    receipt_url: null,
    notes: formData.notes || null,
    is_recurring: formData.isRecurring || false,
    recurring_frequency: formData.recurringFrequency || null,
  }));

  const { data, error } = await supabase
    .from(TABLES.EXPENSES)
    .insert(expenseDataArray)
    .select();

  if (error) {
    console.error('Error bulk creating expenses:', error);
    throw error;
  }

  const createdExpenses = (data || []).map(mapExpenseFromDB);

  // Log the bulk import action
  await logAction({
    action: 'create',
    entity: 'expense',
    entityId: 'bulk-import',
    performedBy,
    newData: { count: createdExpenses.length, expenseIds: createdExpenses.map(e => e.id) },
  });

  return createdExpenses;
}

// Helper function to map database row to Expense type
function mapExpenseFromDB(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    propertyId: (row.property_id as string) || undefined,
    category: row.category as Expense['category'],
    description: row.description as string,
    amountEUR: row.amount_eur as number,
    amountFCFA: row.amount_fcfa as number,
    date: new Date(row.date as string),
    vendor: (row.vendor as string) || undefined,
    receiptUrl: (row.receipt_url as string) || undefined,
    notes: (row.notes as string) || undefined,
    isRecurring: (row.is_recurring as boolean) || false,
    recurringFrequency: (row.recurring_frequency as Expense['recurringFrequency']) || undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
