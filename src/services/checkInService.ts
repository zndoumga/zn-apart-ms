import { supabase, TABLES, BUCKETS } from './supabase';
import type { CheckInFormData, Customer, UserMode } from '../types';
import { logAction } from './auditService';

/**
 * Upload a file to customer documents bucket
 */
export async function uploadCustomerDocument(
  file: File | Blob,
  customerId: string,
  type: 'id' | 'signature'
): Promise<string> {
  const timestamp = Date.now();
  const extension = file instanceof File ? file.name.split('.').pop() : 'png';
  const fileName = `${customerId}/${type}_${timestamp}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKETS.CUSTOMER_DOCUMENTS)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Error uploading customer document:', uploadError);
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKETS.CUSTOMER_DOCUMENTS)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Convert base64 data URL to Blob
 */
function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Process check-in: create or update customer, upload documents
 */
export async function processCheckIn(
  bookingId: string,
  checkInData: CheckInFormData,
  idFile: File | null,
  signatureDataUrl: string | null,
  performedBy: UserMode
): Promise<Customer> {
  // First, check if customer exists by email or create new
  let customerId: string | null = null;
  
  if (checkInData.email) {
    const { data: existingCustomer } = await supabase
      .from(TABLES.CUSTOMERS)
      .select('id')
      .eq('email', checkInData.email)
      .single();
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
    }
  }

  // Prepare customer data
  const customerData: Record<string, unknown> = {
    name: checkInData.guestName,
    email: checkInData.email || null,
    phone: checkInData.phone || null,
    nationality: checkInData.nationality,
    country_of_residence: checkInData.countryOfResidence || null,
    address: checkInData.address || null,
    date_of_birth: checkInData.dateOfBirth || null,
    id_type: checkInData.idType,
    id_number: checkInData.idNumber,
    updated_at: new Date().toISOString(),
  };

  let customer: Customer;

  if (customerId) {
    // Update existing customer
    const { data, error } = await supabase
      .from(TABLES.CUSTOMERS)
      .update(customerData)
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
    customer = mapCustomerFromDB(data);
  } else {
    // Create new customer
    const { data, error } = await supabase
      .from(TABLES.CUSTOMERS)
      .insert({
        ...customerData,
        total_bookings: 1,
        total_spent_eur: 0,
        total_spent_fcfa: 0,
        is_vip: false,
        tags: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
    customer = mapCustomerFromDB(data);
    customerId = customer.id;
  }

  // Upload ID document if provided
  if (idFile) {
    const idDocumentUrl = await uploadCustomerDocument(idFile, customerId, 'id');
    await supabase
      .from(TABLES.CUSTOMERS)
      .update({ id_document_url: idDocumentUrl })
      .eq('id', customerId);
    customer.idDocumentUrl = idDocumentUrl;
  }

  // Upload signature if provided
  if (signatureDataUrl) {
    const signatureBlob = dataURLtoBlob(signatureDataUrl);
    const signatureUrl = await uploadCustomerDocument(signatureBlob, customerId, 'signature');
    await supabase
      .from(TABLES.CUSTOMERS)
      .update({ signature_url: signatureUrl })
      .eq('id', customerId);
    customer.signatureUrl = signatureUrl;
  }

  // Link customer to booking and update booking status
  await supabase
    .from(TABLES.BOOKINGS)
    .update({ 
      customer_id: customerId,
      status: 'checked_in',
      check_in_notes: checkInData.checkInNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  // Log the action
  await logAction({
    action: 'update',
    entity: 'booking',
    entityId: bookingId,
    performedBy,
    newData: { action: 'check_in', customerId },
  });

  return customer;
}

/**
 * Get customer by ID
 */
export async function getCustomer(customerId: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from(TABLES.CUSTOMERS)
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching customer:', error);
    throw error;
  }

  return data ? mapCustomerFromDB(data) : null;
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
    idType: (row.id_type as Customer['idType']) || undefined,
    idNumber: (row.id_number as string) || undefined,
    idDocumentUrl: (row.id_document_url as string) || undefined,
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

