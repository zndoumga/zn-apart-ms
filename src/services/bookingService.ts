import { supabase, TABLES } from './supabase';
import { logAction } from './auditService';
import type { Booking, BookingFormData, BookingStatus, UserMode } from '../types';
import { startOfDay } from 'date-fns';

/**
 * Automatically update bookings to checked_out if check-out date has passed
 */
async function autoUpdateCheckedOutBookings(): Promise<void> {
  const today = startOfDay(new Date());
  
  // Find all bookings that are past their check-out date and not already checked_out or cancelled
  const { data: expiredBookings, error: fetchError } = await supabase
    .from(TABLES.BOOKINGS)
    .select('id, check_out, status')
    .neq('is_deleted', true)
    .neq('status', 'checked_out')
    .neq('status', 'cancelled')
    .lt('check_out', today.toISOString());

  if (fetchError) {
    console.error('Error fetching expired bookings:', fetchError);
    return;
  }

  if (!expiredBookings || expiredBookings.length === 0) {
    return;
  }

  // Update all expired bookings to checked_out
  const bookingIds = expiredBookings.map(b => b.id);
  const { error: updateError } = await supabase
    .from(TABLES.BOOKINGS)
    .update({ 
      status: 'checked_out',
      updated_at: new Date().toISOString()
    })
    .in('id', bookingIds);

  if (updateError) {
    console.error('Error updating expired bookings to checked_out:', updateError);
  } else if (expiredBookings.length > 0) {
    console.log(`Auto-updated ${expiredBookings.length} booking(s) to checked_out status`);
  }
}

/**
 * Assign booking numbers to existing bookings that don't have one
 * This is a migration function that should be called when needed
 */
export async function assignBookingNumbersToExisting(): Promise<void> {
  // Get all bookings without booking numbers, ordered by creation date
  const { data: bookingsWithoutNumbers, error } = await supabase
    .from(TABLES.BOOKINGS)
    .select('id, created_at')
    .or('booking_number.is.null,booking_number.eq.')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching bookings without numbers:', error);
    return;
  }

  if (!bookingsWithoutNumbers || bookingsWithoutNumbers.length === 0) {
    return;
  }

  // Group by year and assign numbers
  const bookingsByYear = new Map<number, typeof bookingsWithoutNumbers>();
  
  bookingsWithoutNumbers.forEach(booking => {
    const year = new Date(booking.created_at as string).getFullYear();
    if (!bookingsByYear.has(year)) {
      bookingsByYear.set(year, []);
    }
    bookingsByYear.get(year)!.push(booking);
  });

  // Assign booking numbers for each year
  for (const [year, bookings] of bookingsByYear.entries()) {
    const yearShort = year.toString().substring(2);
    
    // Get all bookings for this year to find max number
    const { data: allBookings, error: fetchError } = await supabase
      .from(TABLES.BOOKINGS)
      .select('booking_number, created_at')
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error(`Error fetching bookings for year ${year}:`, fetchError);
      continue;
    }

    // Find max number
    let maxNumber = 0;
    if (allBookings) {
      allBookings.forEach(b => {
        if (b.booking_number) {
          const match = b.booking_number.match(/^(\d{4})-\d{2}$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });
    }

    // Assign numbers to bookings without numbers
    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      maxNumber++;
      const bookingNumber = `${maxNumber.toString().padStart(4, '0')}-${yearShort}`;
      
      await supabase
        .from(TABLES.BOOKINGS)
        .update({ booking_number: bookingNumber })
        .eq('id', booking.id);
    }
  }
}

/**
 * Get all bookings (excluding soft-deleted)
 */
export async function getBookings(): Promise<Booking[]> {
  // Automatically update expired bookings first, then fetch
  await autoUpdateCheckedOutBookings();

  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .select('*')
    .neq('is_deleted', true)
    .order('check_in', { ascending: false });

  if (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }

  const bookings = (data || []).map(mapBookingFromDB);
  
  // Check if any bookings are missing booking numbers and assign them
  // Do this synchronously to ensure numbers are assigned before returning
  const bookingsWithoutNumbers = bookings.filter(b => !b.bookingNumber);
  if (bookingsWithoutNumbers.length > 0) {
    // Assign numbers - wait for completion to ensure consistency
    try {
      await assignBookingNumbersToExisting();
      // Re-fetch bookings to get updated numbers
      const { data: updatedData } = await supabase
        .from(TABLES.BOOKINGS)
        .select('*')
        .neq('is_deleted', true)
        .order('check_in', { ascending: false });
      
      if (updatedData) {
        return updatedData.map(mapBookingFromDB);
      }
    } catch (err) {
      console.error('Error assigning booking numbers:', err);
    }
  }

  return bookings;
}

/**
 * Get bookings by property ID (excluding soft-deleted)
 */
export async function getBookingsByProperty(propertyId: string): Promise<Booking[]> {
  // Automatically update expired bookings first
  await autoUpdateCheckedOutBookings();

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
  // Automatically update expired bookings first
  await autoUpdateCheckedOutBookings();

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
  // Automatically update expired bookings first
  await autoUpdateCheckedOutBookings();

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
  // Import customer service
  const { findOrCreateCustomerFromBooking } = await import('./customerService');

  // Find or create customer based on guest information
  // This ensures customers exist even before check-in, including cancelled bookings
  let customerId = formData.customerId;
  
  if (!customerId && formData.guestName) {
    try {
      const customer = await findOrCreateCustomerFromBooking(
        formData.guestName,
        formData.guestEmail,
        formData.guestPhone,
        performedBy
      );
      customerId = customer.id;
    } catch (error) {
      console.error('Error finding/creating customer:', error);
      // Continue with booking creation even if customer creation fails
    }
  }

  // Generate booking number based on current date
  const bookingNumber = await generateBookingNumber(new Date());

  const bookingData = {
    booking_number: bookingNumber,
    property_id: formData.propertyId,
    customer_id: customerId || null,
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

  // If guest information is being updated, find or create customer
  const { findOrCreateCustomerFromBooking } = await import('./customerService');
  let customerId = formData.customerId !== undefined ? formData.customerId : currentBooking.customerId;

  // If guest info changed and no customerId is explicitly set, find/create customer
  if (
    !customerId &&
    (formData.guestName || formData.guestEmail || formData.guestPhone) &&
    formData.guestName
  ) {
    try {
      const guestName = formData.guestName || currentBooking.guestName;
      const guestEmail = formData.guestEmail !== undefined ? formData.guestEmail : currentBooking.guestEmail;
      const guestPhone = formData.guestPhone !== undefined ? formData.guestPhone : currentBooking.guestPhone;
      
      const customer = await findOrCreateCustomerFromBooking(
        guestName,
        guestEmail,
        guestPhone,
        performedBy
      );
      customerId = customer.id;
    } catch (error) {
      console.error('Error finding/creating customer:', error);
      // Continue with booking update even if customer creation fails
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (formData.propertyId !== undefined) updateData.property_id = formData.propertyId;
  if (customerId !== undefined) updateData.customer_id = customerId;
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
  // Generate booking numbers for all bookings
  // Sort by check-in date to maintain chronological order
  const sortedData = [...bookingsData].sort((a, b) => 
    new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()
  );

  const insertData = [];
  const currentDate = new Date();
  
  for (let i = 0; i < sortedData.length; i++) {
    const formData = sortedData[i];
    // Use check-in date for booking number generation, or current date if check-in is in the future
    const dateForNumber = new Date(formData.checkIn) > currentDate 
      ? new Date(formData.checkIn) 
      : currentDate;
    
    const bookingNumber = await generateBookingNumber(dateForNumber);
    
    insertData.push({
      booking_number: bookingNumber,
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
    });
  }

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

/**
 * Generate booking number in format: XXXX-YY (e.g., 0001-26)
 * Sequential by year based on creation date
 * Numbers are assigned based on chronological order of creation
 */
export async function generateBookingNumber(createdAt: Date): Promise<string> {
  const year = createdAt.getFullYear();
  const yearShort = year.toString().substring(2);
  
  // Get ALL bookings for this year (including deleted) to ensure proper sequential numbering
  // Order by created_at to maintain chronological order
  const { data: bookings, error } = await supabase
    .from(TABLES.BOOKINGS)
    .select('booking_number, created_at')
    .gte('created_at', `${year}-01-01T00:00:00.000Z`)
    .lt('created_at', `${year + 1}-01-01T00:00:00.000Z`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching bookings for number generation:', error);
    // Fallback: use timestamp-based number
    const timestamp = Date.now();
    const fallbackNumber = (timestamp % 10000).toString().padStart(4, '0');
    return `${fallbackNumber}-${yearShort}`;
  }

  // Find the highest booking number for this year
  // This ensures we continue from the last assigned number
  let maxNumber = 0;
  if (bookings && bookings.length > 0) {
    bookings.forEach(booking => {
      if (booking.booking_number) {
        // Match pattern: XXXX-YY (e.g., 0001-26)
        const match = booking.booking_number.match(/^(\d{4})-\d{2}$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });
  }

  // Generate next booking number - sequential
  const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
  return `${nextNumber}-${yearShort}`;
}

// Helper function to map database row to Booking type
function mapBookingFromDB(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    bookingNumber: (row.booking_number as string) || undefined,
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
    checkedInAt: row.checked_in_at ? new Date(row.checked_in_at as string) : undefined,
    paymentStatus: row.payment_status as Booking['paymentStatus'],
    isDeleted: (row.is_deleted as boolean) || false,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
