import { supabase, TABLES } from './supabase';
import { logAction } from './auditService';
import type { Booking, BookingFormData, BookingStatus, UserMode } from '../types';

/**
 * Get all bookings (excluding soft-deleted)
 */
export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .select('*')
    .neq('is_deleted', true)
    .order('check_in', { ascending: false });

  if (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }

  return (data || []).map(mapBookingFromDB);
}

/**
 * Get bookings by property ID (excluding soft-deleted)
 */
export async function getBookingsByProperty(propertyId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .select('*')
    .eq('property_id', propertyId)
    .neq('is_deleted', true)
    .order('check_in', { ascending: false });

  if (error) {
    console.error('Error fetching bookings by property:', error);
    throw error;
  }

  return (data || []).map(mapBookingFromDB);
}

/**
 * Get bookings by customer ID (excluding soft-deleted)
 */
export async function getBookingsByCustomer(customerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .select('*')
    .eq('customer_id', customerId)
    .neq('is_deleted', true)
    .order('check_in', { ascending: false });

  if (error) {
    console.error('Error fetching bookings by customer:', error);
    throw error;
  }

  return (data || []).map(mapBookingFromDB);
}

/**
 * Get bookings within a date range (excluding soft-deleted)
 */
export async function getBookingsInRange(
  startDate: Date,
  endDate: Date
): Promise<Booking[]> {
  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .select('*')
    .neq('is_deleted', true)
    .gte('check_out', startDate.toISOString())
    .lte('check_in', endDate.toISOString())
    .order('check_in', { ascending: true });

  if (error) {
    console.error('Error fetching bookings in range:', error);
    throw error;
  }

  return (data || []).map(mapBookingFromDB);
}

/**
 * Get a single booking by ID
 */
export async function getBooking(id: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching booking:', error);
    throw error;
  }

  return data ? mapBookingFromDB(data) : null;
}

/**
 * Create a new booking
 */
// Helper to convert string or Date to ISO string
function toISOString(value: string | Date): string {
  if (typeof value === 'string') {
    return new Date(value).toISOString();
  }
  return value.toISOString();
}

export async function createBooking(
  formData: BookingFormData,
  performedBy: UserMode
): Promise<Booking> {
  const bookingData = {
    property_id: formData.propertyId,
    customer_id: formData.customerId || null,
    guest_name: formData.guestName,
    guest_email: formData.guestEmail || null,
    guest_phone: formData.guestPhone || null,
    check_in: toISOString(formData.checkIn),
    check_out: toISOString(formData.checkOut),
    guests: formData.guests,
    total_price_eur: formData.totalPriceEUR,
    total_price_fcfa: formData.totalPriceFCFA,
    commission_eur: formData.commissionEUR || 0,
    commission_fcfa: formData.commissionFCFA || 0,
    cleaning_fee_eur: formData.cleaningFeeEUR || 0,
    cleaning_fee_fcfa: formData.cleaningFeeFCFA || 0,
    status: formData.status || 'confirmed',
    source: formData.source,
    notes: formData.notes || null,
    payment_status: formData.paymentStatus || 'pending',
  };

  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .insert(bookingData)
    .select()
    .single();

  if (error) {
    console.error('Error creating booking:', error);
    throw error;
  }

  const booking = mapBookingFromDB(data);

  await logAction({
    action: 'create',
    entity: 'booking',
    entityId: booking.id,
    performedBy,
    newData: booking,
  });

  return booking;
}

/**
 * Update a booking
 */
export async function updateBooking(
  id: string,
  formData: Partial<BookingFormData>,
  performedBy: UserMode
): Promise<Booking> {
  const currentBooking = await getBooking(id);
  if (!currentBooking) {
    throw new Error('Booking not found');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (formData.propertyId !== undefined) updateData.property_id = formData.propertyId;
  if (formData.customerId !== undefined) updateData.customer_id = formData.customerId;
  if (formData.guestName !== undefined) updateData.guest_name = formData.guestName;
  if (formData.guestEmail !== undefined) updateData.guest_email = formData.guestEmail;
  if (formData.guestPhone !== undefined) updateData.guest_phone = formData.guestPhone;
  if (formData.checkIn !== undefined) updateData.check_in = toISOString(formData.checkIn);
  if (formData.checkOut !== undefined) updateData.check_out = toISOString(formData.checkOut);
  if (formData.guests !== undefined) updateData.guests = formData.guests;
  if (formData.totalPriceEUR !== undefined) updateData.total_price_eur = formData.totalPriceEUR;
  if (formData.totalPriceFCFA !== undefined) updateData.total_price_fcfa = formData.totalPriceFCFA;
  if (formData.commissionEUR !== undefined) updateData.commission_eur = formData.commissionEUR;
  if (formData.commissionFCFA !== undefined) updateData.commission_fcfa = formData.commissionFCFA;
  if (formData.cleaningFeeEUR !== undefined) updateData.cleaning_fee_eur = formData.cleaningFeeEUR;
  if (formData.cleaningFeeFCFA !== undefined) updateData.cleaning_fee_fcfa = formData.cleaningFeeFCFA;
  if (formData.status !== undefined) updateData.status = formData.status;
  if (formData.source !== undefined) updateData.source = formData.source;
  if (formData.notes !== undefined) updateData.notes = formData.notes;
  if (formData.paymentStatus !== undefined) updateData.payment_status = formData.paymentStatus;

  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating booking:', error);
    throw error;
  }

  const updatedBooking = mapBookingFromDB(data);

  await logAction({
    action: 'update',
    entity: 'booking',
    entityId: id,
    performedBy,
    previousData: currentBooking,
    newData: updatedBooking,
  });

  return updatedBooking;
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  performedBy: UserMode
): Promise<Booking> {
  return updateBooking(id, { status }, performedBy);
}

/**
 * Soft delete a booking (sets is_deleted to true)
 */
export async function deleteBooking(
  id: string,
  performedBy: UserMode
): Promise<void> {
  const booking = await getBooking(id);
  if (!booking) {
    throw new Error('Booking not found');
  }

  const { error } = await supabase
    .from(TABLES.BOOKINGS)
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error deleting booking:', error);
    throw error;
  }

  await logAction({
    action: 'delete',
    entity: 'booking',
    entityId: id,
    performedBy,
    previousData: booking,
  });
}

/**
 * Bulk create bookings (for import functionality)
 */
export async function bulkCreateBookings(
  bookingsData: BookingFormData[],
  performedBy: UserMode
): Promise<Booking[]> {
  const insertData = bookingsData.map((formData) => ({
    property_id: formData.propertyId,
    customer_id: formData.customerId || null,
    guest_name: formData.guestName,
    guest_email: formData.guestEmail || null,
    guest_phone: formData.guestPhone || null,
    check_in: toISOString(formData.checkIn),
    check_out: toISOString(formData.checkOut),
    guests: formData.guests,
    total_price_eur: formData.totalPriceEUR,
    total_price_fcfa: formData.totalPriceFCFA,
    commission_eur: formData.commissionEUR || 0,
    commission_fcfa: formData.commissionFCFA || 0,
    cleaning_fee_eur: formData.cleaningFeeEUR || 0,
    cleaning_fee_fcfa: formData.cleaningFeeFCFA || 0,
    status: formData.status || 'confirmed',
    source: formData.source,
    notes: formData.notes || null,
    payment_status: formData.paymentStatus || 'pending',
    is_deleted: false,
  }));

  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .insert(insertData)
    .select();

  if (error) {
    console.error('Error bulk creating bookings:', error);
    throw error;
  }

  const createdBookings = (data || []).map(mapBookingFromDB);

  // Log the bulk import action
  await logAction({
    action: 'create',
    entity: 'booking',
    entityId: 'bulk-import',
    performedBy,
    newData: { count: createdBookings.length, bookingIds: createdBookings.map(b => b.id) },
  });

  return createdBookings;
}

// Helper function to map database row to Booking type
function mapBookingFromDB(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    propertyId: row.property_id as string,
    customerId: (row.customer_id as string) || undefined,
    guestName: row.guest_name as string,
    guestEmail: (row.guest_email as string) || undefined,
    guestPhone: (row.guest_phone as string) || undefined,
    checkIn: new Date(row.check_in as string),
    checkOut: new Date(row.check_out as string),
    guests: row.guests as number,
    totalPriceEUR: row.total_price_eur as number,
    totalPriceFCFA: row.total_price_fcfa as number,
    commissionEUR: (row.commission_eur as number) || 0,
    commissionFCFA: (row.commission_fcfa as number) || 0,
    cleaningFeeEUR: (row.cleaning_fee_eur as number) || 0,
    cleaningFeeFCFA: (row.cleaning_fee_fcfa as number) || 0,
    status: row.status as Booking['status'],
    source: row.source as Booking['source'],
    notes: (row.notes as string) || undefined,
    checkInNotes: (row.check_in_notes as string) || undefined,
    paymentStatus: row.payment_status as Booking['paymentStatus'],
    isDeleted: (row.is_deleted as boolean) || false,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
