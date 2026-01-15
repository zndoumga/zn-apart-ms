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
 * Find or create a customer based on guest information
 * This is used when creating bookings to ensure customers exist even before check-in
 */
export async function findOrCreateCustomerFromBooking(
  guestName: string,
  guestEmail?: string,
  guestPhone?: string,
  performedBy?: UserMode
): Promise<Customer> {
  // First, try to find existing customer by exact name match (case-insensitive)
  // If two reservations have exactly the same guest name, they should be considered the same customer
  if (guestName && guestName.trim()) {
    const { data: existingByName } = await supabase
      .from(TABLES.CUSTOMERS)
      .select('*')
      .ilike('name', guestName.trim())
      .limit(1)
      .maybeSingle();

    if (existingByName) {
      const customer = mapCustomerFromDB(existingByName);
      // Update email and phone if they're different
      const updateData: Partial<CustomerFormData> = {};
      if (guestEmail && customer.email !== guestEmail) {
        updateData.email = guestEmail;
      }
      if (guestPhone && customer.phone !== guestPhone) {
        updateData.phone = guestPhone;
      }
      if (Object.keys(updateData).length > 0 && performedBy) {
        return await updateCustomer(customer.id, updateData, performedBy);
      }
      return customer;
    }
  }

  // Second, try to find existing customer by email (if name didn't match)
  if (guestEmail) {
    const existingByEmail = await findCustomerByEmail(guestEmail);
    if (existingByEmail) {
      // Update name and phone if they're different
      const updateData: Partial<CustomerFormData> = {};
      if (existingByEmail.name !== guestName.trim()) {
        updateData.name = guestName.trim();
      }
      if (guestPhone && existingByEmail.phone !== guestPhone) {
        updateData.phone = guestPhone;
      }
      if (Object.keys(updateData).length > 0 && performedBy) {
        return await updateCustomer(existingByEmail.id, updateData, performedBy);
      }
      return existingByEmail;
    }
  }

  // Third, try to find by phone if email didn't match
  if (guestPhone) {
    const { data: existingByPhone } = await supabase
      .from(TABLES.CUSTOMERS)
      .select('*')
      .eq('phone', guestPhone)
      .maybeSingle();

    if (existingByPhone) {
      const customer = mapCustomerFromDB(existingByPhone);
      // Update name and email if they're different
      const updateData: Partial<CustomerFormData> = {};
      if (customer.name !== guestName.trim()) {
        updateData.name = guestName.trim();
      }
      if (guestEmail && customer.email !== guestEmail) {
        updateData.email = guestEmail;
      }
      if (Object.keys(updateData).length > 0 && performedBy) {
        return await updateCustomer(customer.id, updateData, performedBy);
      }
      return customer;
    }
  }

  // No existing customer found, create a new one
  const newCustomerData: CustomerFormData = {
    name: guestName.trim(),
    email: guestEmail,
    phone: guestPhone,
  };

  if (performedBy) {
    return await createCustomer(newCustomerData, performedBy);
  } else {
    // Fallback: create without logging if performedBy is not provided
    const customerData = {
      name: guestName,
      email: guestEmail || null,
      phone: guestPhone || null,
      preferred_language: 'fr',
      total_bookings: 0,
      total_spent_eur: 0,
      total_spent_fcfa: 0,
      average_rating: null,
      is_vip: false,
      tags: [],
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

    return mapCustomerFromDB(data);
  }
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

/**
 * Migration function: Create customers for all existing bookings
 * This should be run once to backfill customers from previous bookings
 */
export async function migrateCustomersFromBookings(
  performedBy: UserMode = 'admin'
): Promise<{ created: number; updated: number; errors: number }> {
  const { supabase, TABLES } = await import('./supabase');
  
  // Get all bookings (including soft-deleted ones for migration)
  const { data: allBookings, error: bookingsError } = await supabase
    .from(TABLES.BOOKINGS)
    .select('*')
    .order('created_at', { ascending: true });

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    throw bookingsError;
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  console.log(`Starting migration: ${allBookings?.length || 0} bookings to process...`);

  for (const booking of allBookings || []) {
    try {
      // Skip if booking already has a customer_id
      if (booking.customer_id) {
        continue;
      }

      // Skip if no guest name
      if (!booking.guest_name) {
        console.warn(`Skipping booking ${booking.id}: no guest name`);
        continue;
      }

      // Find or create customer
      const customer = await findOrCreateCustomerFromBooking(
        booking.guest_name,
        booking.guest_email || undefined,
        booking.guest_phone || undefined,
        performedBy
      );

      // Update booking to link customer
      const { error: updateError } = await supabase
        .from(TABLES.BOOKINGS)
        .update({ customer_id: customer.id })
        .eq('id', booking.id);

      if (updateError) {
        console.error(`Error updating booking ${booking.id}:`, updateError);
        errors++;
      } else {
        // Check if customer was newly created (has no bookings yet)
        if (customer.totalBookings === 0) {
          created++;
        } else {
          updated++;
        }
        console.log(`✓ Processed booking ${booking.id} → Customer: ${customer.name}`);
      }
    } catch (error) {
      console.error(`Error processing booking ${booking.id}:`, error);
      errors++;
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`- Created: ${created} new customers`);
  console.log(`- Updated: ${updated} existing customers`);
  console.log(`- Errors: ${errors}`);

  return { created, updated, errors };
}

// Helper function to map database row to Customer type
function mapCustomerFromDB(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string) || undefined,
    phone: (row.phone as string) || undefined,
    nationality: (row.nationality as string) || undefined,
    countryOfResidence: (row.country_of_residence as string) || undefined,
    address: (row.address as string) || undefined,
    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth as string) : undefined,
    idType: (row.id_type as string) || undefined,
    idNumber: (row.id_number as string) || undefined,
    idDocumentUrl: (row.id_document_url as string) || undefined,
    idDocumentBackUrl: (row.id_document_back_url as string) || undefined,
    signatureUrl: (row.signature_url as string) || undefined,
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
