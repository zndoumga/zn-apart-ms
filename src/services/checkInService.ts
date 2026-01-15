import { supabase, TABLES, BUCKETS } from './supabase';
import type { CheckInFormData, Customer, UserMode } from '../types';
import { logAction } from './auditService';
import { getCustomer } from './customerService';

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
  idFileFront: File | null,
  idFileBack: File | null,
  signatureDataUrl: string | null,
  performedBy: UserMode
): Promise<Customer> {
  // Get the booking to find the customer
  const { getBooking } = await import('./bookingService');
  const booking = await getBooking(bookingId);
  
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Customer should already exist from booking creation
  // If not, find or create one
  let customerId: string | null = booking.customerId || null;
  
  if (!customerId) {
    // Fallback: try to find by email or create
    const { findOrCreateCustomerFromBooking } = await import('./customerService');
    try {
      const customer = await findOrCreateCustomerFromBooking(
        checkInData.guestName,
        checkInData.email,
        checkInData.phone,
        performedBy
      );
      customerId = customer.id;
    } catch (error) {
      console.error('Error finding/creating customer during check-in:', error);
      throw new Error('Could not find or create customer');
    }
  }

  // Get existing customer
  let customer = await getCustomer(customerId);
  
  if (!customer) {
    throw new Error('Customer not found');
  }

  // Prepare customer update data (only update fields that are provided)
  const customerData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Update basic info if provided
  if (checkInData.guestName) customerData.name = checkInData.guestName;
  if (checkInData.email) customerData.email = checkInData.email;
  if (checkInData.phone) customerData.phone = checkInData.phone;
  if (checkInData.nationality) customerData.nationality = checkInData.nationality;
  if (checkInData.countryOfResidence !== undefined) customerData.country_of_residence = checkInData.countryOfResidence;
  if (checkInData.address !== undefined) customerData.address = checkInData.address;
  if (checkInData.dateOfBirth) customerData.date_of_birth = checkInData.dateOfBirth;
  if (checkInData.idType) customerData.id_type = checkInData.idType;
  if (checkInData.idNumber) customerData.id_number = checkInData.idNumber;

  // Update customer with new information
  const { data: updatedCustomerData, error: updateError } = await supabase
    .from(TABLES.CUSTOMERS)
    .update(customerData)
    .eq('id', customerId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating customer:', updateError);
    throw updateError;
  }
  
  // Re-fetch customer to get updated data
  customer = await getCustomer(customerId);
  if (!customer) {
    throw new Error('Customer not found after update');
  }

  // Upload ID document front if provided
  if (idFileFront) {
    const idDocumentUrl = await uploadCustomerDocument(idFileFront, customerId, 'id_front');
    await supabase
      .from(TABLES.CUSTOMERS)
      .update({ id_document_url: idDocumentUrl })
      .eq('id', customerId);
    customer.idDocumentUrl = idDocumentUrl;
  }

  // Upload ID document back if provided
  if (idFileBack) {
    const idDocumentBackUrl = await uploadCustomerDocument(idFileBack, customerId, 'id_back');
    await supabase
      .from(TABLES.CUSTOMERS)
      .update({ id_document_back_url: idDocumentBackUrl })
      .eq('id', customerId);
    customer.idDocumentBackUrl = idDocumentBackUrl;
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

  // Record check-in date and time
  const checkedInAt = new Date().toISOString();

  // Link customer to booking, update booking status, and overwrite guest name with check-in form name
  await supabase
    .from(TABLES.BOOKINGS)
    .update({ 
      customer_id: customerId,
      status: 'checked_in',
      guest_name: checkInData.guestName.trim(), // Overwrite guest name with name from check-in form
      guest_email: checkInData.email || booking.guestEmail || null,
      guest_phone: checkInData.phone || booking.guestPhone || null,
      check_in_notes: checkInData.checkInNotes || null,
      checked_in_at: checkedInAt, // Record the exact date and time of check-in
      updated_at: checkedInAt,
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
 * Undo check-in: revert booking status from checked_in back to confirmed
 */
export async function undoCheckIn(
  bookingId: string,
  performedBy: UserMode
): Promise<void> {
  const { getBooking } = await import('./bookingService');
  const booking = await getBooking(bookingId);
  
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status !== 'checked_in') {
    throw new Error('Booking is not checked in');
  }

  // Revert booking status to confirmed and clear check-in timestamp
  const { error } = await supabase
    .from(TABLES.BOOKINGS)
    .update({ 
      status: 'confirmed',
      checked_in_at: null, // Clear check-in timestamp when undoing
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Error undoing check-in:', error);
    throw error;
  }

  // Log the action
  await logAction({
    action: 'update',
    entity: 'booking',
    entityId: bookingId,
    performedBy,
    previousData: { status: 'checked_in' },
    newData: { status: 'confirmed', action: 'undo_check_in' },
  });
}


