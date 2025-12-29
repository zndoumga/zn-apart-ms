import { supabase, TABLES } from './supabase';
import type { RecurringExpense, RecurringExpenseFormData } from '../types';

/**
 * Get all recurring expense templates
 */
export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from(TABLES.RECURRING_EXPENSES)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recurring expenses:', error);
    throw error;
  }

  return (data || []).map(mapRecurringExpenseFromDB);
}

/**
 * Get a single recurring expense by ID
 */
export async function getRecurringExpense(id: string): Promise<RecurringExpense | null> {
  const { data, error } = await supabase
    .from(TABLES.RECURRING_EXPENSES)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching recurring expense:', error);
    throw error;
  }

  return data ? mapRecurringExpenseFromDB(data) : null;
}

/**
 * Create a new recurring expense template
 */
export async function createRecurringExpense(
  formData: RecurringExpenseFormData
): Promise<RecurringExpense> {
  const expenseData = {
    property_id: formData.propertyId || null,
    category: formData.category,
    vendor: formData.vendor || null,
    description: formData.description,
    amount_eur: formData.amountEUR,
    amount_fcfa: formData.amountFCFA,
  };

  const { data, error } = await supabase
    .from(TABLES.RECURRING_EXPENSES)
    .insert(expenseData)
    .select()
    .single();

  if (error) {
    console.error('Error creating recurring expense:', error);
    throw error;
  }

  return mapRecurringExpenseFromDB(data);
}

/**
 * Update a recurring expense template
 */
export async function updateRecurringExpense(
  id: string,
  formData: Partial<RecurringExpenseFormData>
): Promise<RecurringExpense> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (formData.propertyId !== undefined) updateData.property_id = formData.propertyId || null;
  if (formData.category !== undefined) updateData.category = formData.category;
  if (formData.vendor !== undefined) updateData.vendor = formData.vendor || null;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.amountEUR !== undefined) updateData.amount_eur = formData.amountEUR;
  if (formData.amountFCFA !== undefined) updateData.amount_fcfa = formData.amountFCFA;

  const { data, error } = await supabase
    .from(TABLES.RECURRING_EXPENSES)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating recurring expense:', error);
    throw error;
  }

  return mapRecurringExpenseFromDB(data);
}

/**
 * Delete a recurring expense template
 */
export async function deleteRecurringExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.RECURRING_EXPENSES)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting recurring expense:', error);
    throw error;
  }
}

// Helper function to map database row to RecurringExpense type
function mapRecurringExpenseFromDB(row: Record<string, unknown>): RecurringExpense {
  return {
    id: row.id as string,
    propertyId: (row.property_id as string) || undefined,
    category: row.category as RecurringExpense['category'],
    vendor: (row.vendor as string) || undefined,
    description: row.description as string,
    amountEUR: row.amount_eur as number,
    amountFCFA: row.amount_fcfa as number,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

