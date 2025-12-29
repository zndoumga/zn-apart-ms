import { supabase, TABLES } from './supabase';
import { logAction } from './auditService';
import type { MobileMoneyTransaction, TransferFormData, UserMode } from '../types';

// Helper to convert string or Date to ISO string
function toISOString(value: string | Date): string {
  if (typeof value === 'string') {
    return new Date(value).toISOString();
  }
  return value.toISOString();
}

/**
 * Get all mobile money transactions
 */
export async function getMobileMoneyTransactions(): Promise<MobileMoneyTransaction[]> {
  const { data, error } = await supabase
    .from(TABLES.MOBILE_MONEY)
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching mobile money transactions:', error);
    throw error;
  }

  return (data || []).map(mapTransactionFromDB);
}

/**
 * Get transactions within a date range
 */
export async function getTransactionsInRange(
  startDate: Date,
  endDate: Date
): Promise<MobileMoneyTransaction[]> {
  const { data, error } = await supabase
    .from(TABLES.MOBILE_MONEY)
    .select('*')
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions in range:', error);
    throw error;
  }

  return (data || []).map(mapTransactionFromDB);
}

/**
 * Get current balance (sum of all transactions)
 */
export async function getCurrentBalance(): Promise<{
  balanceEUR: number;
  balanceFCFA: number;
}> {
  const { data, error } = await supabase
    .from(TABLES.MOBILE_MONEY)
    .select('type, amount_eur, amount_fcfa');

  if (error) {
    console.error('Error calculating balance:', error);
    throw error;
  }

  let balanceEUR = 0;
  let balanceFCFA = 0;

  (data || []).forEach((tx) => {
    const amountEUR = tx.amount_eur as number;
    const amountFCFA = tx.amount_fcfa as number;
    
    if (tx.type === 'deposit') {
      balanceEUR += amountEUR;
      balanceFCFA += amountFCFA;
    } else {
      balanceEUR -= amountEUR;
      balanceFCFA -= amountFCFA;
    }
  });

  return { balanceEUR, balanceFCFA };
}

/**
 * Create a new transaction (deposit or withdrawal)
 */
export async function createTransaction(
  formData: TransferFormData,
  performedBy: UserMode
): Promise<MobileMoneyTransaction> {
  const transactionData = {
    type: formData.type,
    amount_eur: formData.amountEUR,
    amount_fcfa: formData.amountFCFA,
    description: formData.description,
    reference: formData.reference || null,
    date: toISOString(formData.date),
  };

  const { data, error } = await supabase
    .from(TABLES.MOBILE_MONEY)
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }

  const transaction = mapTransactionFromDB(data);

  await logAction({
    action: 'create',
    entity: 'mobile_money',
    entityId: transaction.id,
    performedBy,
    newData: transaction,
  });

  return transaction;
}

/**
 * Get transaction by reference (e.g., expense ID)
 */
export async function getTransactionByReference(reference: string): Promise<MobileMoneyTransaction | null> {
  const { data, error } = await supabase
    .from(TABLES.MOBILE_MONEY)
    .select('*')
    .eq('reference', reference)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching transaction by reference:', error);
    throw error;
  }

  return data ? mapTransactionFromDB(data) : null;
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  id: string,
  formData: TransferFormData,
  performedBy: UserMode
): Promise<MobileMoneyTransaction> {
  const currentTransaction = await supabase
    .from(TABLES.MOBILE_MONEY)
    .select('*')
    .eq('id', id)
    .single();

  if (currentTransaction.error) {
    console.error('Error fetching transaction:', currentTransaction.error);
    throw currentTransaction.error;
  }

  const updateData = {
    type: formData.type,
    amount_eur: formData.amountEUR,
    amount_fcfa: formData.amountFCFA,
    description: formData.description,
    reference: formData.reference || null,
    date: toISOString(formData.date),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLES.MOBILE_MONEY)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }

  const transaction = mapTransactionFromDB(data);

  await logAction({
    action: 'update',
    entity: 'mobile_money',
    entityId: id,
    performedBy,
    previousData: mapTransactionFromDB(currentTransaction.data),
    newData: transaction,
  });

  return transaction;
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(
  id: string,
  performedBy: UserMode
): Promise<void> {
  const { data: transaction, error: fetchError } = await supabase
    .from(TABLES.MOBILE_MONEY)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching transaction:', fetchError);
    throw fetchError;
  }

  const { error } = await supabase
    .from(TABLES.MOBILE_MONEY)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }

  await logAction({
    action: 'delete',
    entity: 'mobile_money',
    entityId: id,
    performedBy,
    previousData: mapTransactionFromDB(transaction),
  });
}

// Helper function to map database row to MobileMoneyTransaction type
function mapTransactionFromDB(row: Record<string, unknown>): MobileMoneyTransaction {
  return {
    id: row.id as string,
    type: row.type as MobileMoneyTransaction['type'],
    amountEUR: row.amount_eur as number,
    amountFCFA: row.amount_fcfa as number,
    description: row.description as string,
    reference: (row.reference as string) || undefined,
    date: new Date(row.date as string),
    createdAt: new Date(row.created_at as string),
  };
}
