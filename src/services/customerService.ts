import { supabase, TABLES } from './supabase';
import { logAction } from './auditService';
import type { Customer, CustomerFormData, UserMode } from '../types';

/**
 * Get all customers
 */
export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from(TABLES.CUSTOMERS)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }

  return (data || []).map(mapCustomerFromDB);
}

/**
 * Get a single customer by ID
 */
export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from(TABLES.CUSTOMERS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching customer:', error);
    throw error;
  }

  return data ? mapCustomerFromDB(data) : null;
}

/**
 * Find customer by email
 */
export async function findCustomerByEmail(email: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from(TABLES.CUSTOMERS)
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error finding customer by email:', error);
    throw error;
  }

  return data ? mapCustomerFromDB(data) : null;
}

/**
 * Create a new customer
 */
export async function createCustomer(
  formData: CustomerFormData,
  performedBy: UserMode
): Promise<Customer> {
  const customerData = {
    name: formData.name,
    email: formData.email || null,
    phone: formData.phone || null,
    nationality: formData.nationality || null,
    preferred_language: formData.preferredLanguage || 'fr',
    notes: formData.notes || null,
    total_bookings: 0,
    total_spent_eur: 0,
    total_spent_fcfa: 0,
    average_rating: null,
    is_vip: false,
    tags: formData.tags || [],
  };

  const { data, error } = await supabase
    .from(TABLES.CUSTOMERS)
    .insert(customerData)
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    throw error;
  }

  const customer = mapCustomerFromDB(data);

  await logAction({
    action: 'create',
    entity: 'customer',
    entityId: customer.id,
    performedBy,
    newData: customer,
  });

  return customer;
}

/**
 * Update a customer
 */
export async function updateCustomer(
  id: string,
  formData: Partial<CustomerFormData>,
  performedBy: UserMode
): Promise<Customer> {
  const currentCustomer = await getCustomer(id);
  if (!currentCustomer) {
    throw new Error('Customer not found');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (formData.name !== undefined) updateData.name = formData.name;
  if (formData.email !== undefined) updateData.email = formData.email;
  if (formData.phone !== undefined) updateData.phone = formData.phone;
  if (formData.nationality !== undefined) updateData.nationality = formData.nationality;
  if (formData.preferredLanguage !== undefined) updateData.preferred_language = formData.preferredLanguage;
  if (formData.notes !== undefined) updateData.notes = formData.notes;
  if (formData.tags !== undefined) updateData.tags = formData.tags;

  const { data, error } = await supabase
    .from(TABLES.CUSTOMERS)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    throw error;
  }

  const updatedCustomer = mapCustomerFromDB(data);

  await logAction({
    action: 'update',
    entity: 'customer',
    entityId: id,
    performedBy,
    previousData: currentCustomer,
    newData: updatedCustomer,
  });

  return updatedCustomer;
}

/**
 * Update customer stats (called after bookings change)
 */
export async function updateCustomerStats(
  customerId: string,
  stats: {
    totalBookings: number;
    totalSpentEUR: number;
    totalSpentFCFA: number;
    averageRating?: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from(TABLES.CUSTOMERS)
    .update({
      total_bookings: stats.totalBookings,
      total_spent_eur: stats.totalSpentEUR,
      total_spent_fcfa: stats.totalSpentFCFA,
      average_rating: stats.averageRating || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);

  if (error) {
    console.error('Error updating customer stats:', error);
    throw error;
  }
}

/**
 * Mark customer as VIP
 */
export async function setCustomerVIP(
  id: string,
  isVIP: boolean,
  performedBy: UserMode
): Promise<Customer> {
  const currentCustomer = await getCustomer(id);
  if (!currentCustomer) {
    throw new Error('Customer not found');
  }

  const { data, error } = await supabase
    .from(TABLES.CUSTOMERS)
    .update({
      is_vip: isVIP,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer VIP status:', error);
    throw error;
  }

  const updatedCustomer = mapCustomerFromDB(data);

  await logAction({
    action: 'update',
    entity: 'customer',
    entityId: id,
    performedBy,
    previousData: currentCustomer,
    newData: updatedCustomer,
  });

  return updatedCustomer;
}

/**
 * Delete a customer
 */
export async function deleteCustomer(
  id: string,
  performedBy: UserMode
): Promise<void> {
  const customer = await getCustomer(id);
  if (!customer) {
    throw new Error('Customer not found');
  }

  const { error } = await supabase
    .from(TABLES.CUSTOMERS)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }

  await logAction({
    action: 'delete',
    entity: 'customer',
    entityId: id,
    performedBy,
    previousData: customer,
  });
}

// Helper function to map database row to Customer type
function mapCustomerFromDB(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string) || undefined,
    phone: (row.phone as string) || undefined,
    nationality: (row.nationality as string) || undefined,
    preferredLanguage: (row.preferred_language as string) || 'fr',
    notes: (row.notes as string) || undefined,
    totalBookings: (row.total_bookings as number) || 0,
    totalSpentEUR: (row.total_spent_eur as number) || 0,
    totalSpentFCFA: (row.total_spent_fcfa as number) || 0,
    averageRating: (row.average_rating as number) || undefined,
    isVIP: (row.is_vip as boolean) || false,
    tags: (row.tags as string[]) || [],
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
