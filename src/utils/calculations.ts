import type { Booking, Expense, Property } from '../types';
import { differenceInDays, differenceInCalendarDays, startOfDay, endOfDay } from 'date-fns';
import { calculateNights } from './dates';

/**
 * Calculate occupancy rate for a period
 * Formula: (booked nights / total available nights) × 100
 * Total available nights = total days in period × number of active properties
 * This represents what percentage of available nights were booked
 */
export function calculateOccupancyRate(
  bookings: Booking[],
  properties: Property[],
  startDate: Date,
  endDate: Date
): number {
  // Calculate total days in the period (inclusive)
  // Use date-fns utilities to avoid timezone issues
  // startDate and endDate should already be normalized from startOfMonth/endOfMonth
  // But we'll normalize them again to be safe
  const periodStart = startOfDay(startDate);
  const periodEnd = startOfDay(endDate);
  
  // For calculations, we need the start of the day after periodEnd
  // For December: periodStart = Dec 1 00:00, periodEnd = Dec 31 00:00, periodEndExclusive = Jan 1 00:00
  const periodEndExclusive = new Date(periodEnd);
  periodEndExclusive.setDate(periodEndExclusive.getDate() + 1);
  
  const totalDays = Math.max(1, differenceInCalendarDays(periodEndExclusive, periodStart));
  
  // Debug: Log input dates
  console.log('Period input dates:', {
    startDateInput: startDate.toISOString().split('T')[0],
    endDateInput: endDate.toISOString().split('T')[0],
    periodStartNormalized: periodStart.toISOString().split('T')[0],
    periodEndNormalized: periodEnd.toISOString().split('T')[0],
  });
  
  // Calculate booked nights within the period
  let bookedNights = 0;
  const bookingDetails: Array<{ guest: string; checkIn: string; checkOut: string; nights: number; status: string }> = [];
  
  for (const booking of bookings) {
    if (booking.status === 'cancelled') continue;
    
    // Normalize booking dates - always create new Date objects
    // Use date-fns utilities to avoid timezone issues
    const checkIn = startOfDay(booking.checkIn);
    const checkOut = startOfDay(booking.checkOut);
    
    // Debug: Log original booking dates
    const originalCheckInStr = booking.checkIn instanceof Date 
      ? booking.checkIn.toISOString().split('T')[0]
      : typeof booking.checkIn === 'string' 
        ? booking.checkIn.split('T')[0]
        : String(booking.checkIn);
    const originalCheckOutStr = booking.checkOut instanceof Date
      ? booking.checkOut.toISOString().split('T')[0]
      : typeof booking.checkOut === 'string'
        ? booking.checkOut.split('T')[0]
        : String(booking.checkOut);
    
    // Check if booking overlaps with the period
    // Booking overlaps if: checkIn <= periodEnd AND checkOut > periodStart
    // Note: checkOut is the check-out date (guest doesn't stay that night)
    // So a booking from Dec 31 to Jan 1 overlaps with December (1 night on Dec 31)
    if (checkOut <= periodStart || checkIn > periodEnd) {
      continue; // No overlap
    }
    
    // Calculate overlap with the period
    // Clamp booking dates to period boundaries - always create new Date objects
    // bookingStart: use the later of checkIn or periodStart
    const bookingStart = startOfDay(new Date(Math.max(checkIn.getTime(), periodStart.getTime())));
    
    // bookingEnd: use the earlier of checkOut or (periodEnd + 1 day)
    // Since checkOut is exclusive, we want to count nights up to (but not including) checkOut
    // For a booking Dec 29 to Jan 4 in December period:
    // - We want to count Dec 29, 30, 31 = 3 nights
    // - So bookingEnd should be Jan 1 (the day after Dec 31, which is periodEnd + 1)
    // - But we clamp to min(checkOut, periodEnd + 1) = min(Jan 4, Jan 1) = Jan 1
    // - Then nights = differenceInCalendarDays(Jan 1, Dec 29) = 3 ✓
    const periodEndPlusOne = new Date(periodEnd);
    periodEndPlusOne.setDate(periodEndPlusOne.getDate() + 1);
    const bookingEnd = startOfDay(new Date(Math.min(checkOut.getTime(), periodEndPlusOne.getTime())));
    
    // Calculate nights directly using differenceInCalendarDays
    // This is the most reliable method as it works with calendar days, not time
    // For Dec 28 to Dec 31: differenceInCalendarDays(Dec 31, Dec 28) = 3 nights ✓
    const nights = differenceInCalendarDays(bookingEnd, bookingStart);
    
    // Debug: Log the night calculation
    console.log(`  Booking: ${booking.guestName}`);
    console.log(`    Original: ${originalCheckInStr} to ${originalCheckOutStr}`);
    console.log(`    Clamped: ${bookingStart.toISOString().split('T')[0]} to ${bookingEnd.toISOString().split('T')[0]}`);
    console.log(`    differenceInCalendarDays result: ${differenceInCalendarDays(bookingEnd, bookingStart)}`);
    console.log(`    Nights calculated: ${nights}`);
    
    if (nights <= 0) {
      console.warn(`    ⚠️ WARNING: Calculated ${nights} nights for ${booking.guestName} - this seems incorrect!`);
    }
    
    bookedNights += nights;
    
    bookingDetails.push({
      guest: booking.guestName,
      checkIn: bookingStart.toISOString().split('T')[0],
      checkOut: bookingEnd.toISOString().split('T')[0],
      nights,
      status: booking.status,
      originalCheckIn: originalCheckInStr,
      originalCheckOut: originalCheckOutStr,
      debug: {
        checkInTime: checkIn.getTime(),
        checkOutTime: checkOut.getTime(),
        bookingStartTime: bookingStart.getTime(),
        bookingEndTime: bookingEnd.getTime(),
        periodStartTime: periodStart.getTime(),
        periodEndTime: periodEnd.getTime(),
        periodEndExclusiveTime: periodEndExclusive.getTime(),
      },
    });
  }
  
  // Calculate total available nights (totalDays × number of active properties)
  const activeProperties = properties.filter((p) => p.status === 'active');
  const numberOfProperties = activeProperties.length;
  const totalAvailableNights = totalDays * Math.max(1, numberOfProperties);
  
  const rate = totalAvailableNights > 0 ? Math.min(100, (bookedNights / totalAvailableNights) * 100) : 0;
  
  // Debug logging - always show
  console.log('=== Occupancy Calculation Debug ===');
  console.log('Period:', {
    start: periodStart.toISOString().split('T')[0],
    end: periodEnd.toISOString().split('T')[0],
    endPlusOne: new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalDays,
    numberOfProperties,
    totalAvailableNights,
  });
  console.log('Bookings analyzed:', bookingDetails.length);
  console.log('Booking details:', bookingDetails);
  console.log('Total booked nights:', bookedNights);
  console.log('Occupancy rate:', rate.toFixed(2) + '%');
  console.log('Calculation:', `${bookedNights} nights / ${totalAvailableNights} available nights (${totalDays} days × ${numberOfProperties} properties) = ${rate.toFixed(2)}%`);
  console.log('===================================');
  
  return rate;
}

/**
 * Calculate total nights booked in a period
 * Similar to occupancy calculation but returns the total nights
 */
export function calculateNightsBooked(
  bookings: Booking[],
  startDate: Date,
  endDate: Date
): number {
  const validBookings = bookings.filter((b) => b.status !== 'cancelled');
  
  // Normalize period dates
  const periodStart = startOfDay(startDate);
  const periodEnd = startOfDay(endDate);
  const periodEndPlusOne = new Date(periodEnd);
  periodEndPlusOne.setDate(periodEndPlusOne.getDate() + 1);
  
  let totalNights = 0;
  
  for (const booking of validBookings) {
    // Normalize booking dates
    const checkIn = startOfDay(booking.checkIn);
    const checkOut = startOfDay(booking.checkOut);
    
    // Check if booking overlaps with the period
    if (checkOut <= periodStart || checkIn > periodEnd) {
      continue; // No overlap
    }
    
    // Calculate nights within the period
    const bookingStart = startOfDay(new Date(Math.max(checkIn.getTime(), periodStart.getTime())));
    const bookingEnd = startOfDay(new Date(Math.min(checkOut.getTime(), periodEndPlusOne.getTime())));
    const nights = differenceInCalendarDays(bookingEnd, bookingStart);
    
    if (nights > 0) {
      totalNights += nights;
    }
  }
  
  return totalNights;
}

/**
 * Calculate average night price for a period
 * Formula: total revenue / nights booked
 */
export function calculateAverageNightPrice(
  bookings: Booking[],
  startDate: Date,
  endDate: Date
): { EUR: number; FCFA: number } {
  const revenue = calculateTotalRevenue(bookings, startDate, endDate);
  const nights = calculateNightsBooked(bookings, startDate, endDate);
  
  if (nights === 0) {
    return { EUR: 0, FCFA: 0 };
  }
  
  return {
    EUR: Math.round((revenue.EUR / nights) * 100) / 100,
    FCFA: Math.round((revenue.FCFA / nights) * 100) / 100,
  };
}

/**
 * Calculate Average Daily Rate (ADR)
 * Formula: total revenue / nights booked
 */
export function calculateADR(bookings: Booking[]): number {
  const validBookings = bookings.filter((b) => b.status !== 'cancelled');
  
  if (validBookings.length === 0) return 0;
  
  const totalRevenue = validBookings.reduce((sum, b) => sum + b.totalPriceEUR, 0);
  const totalNights = validBookings.reduce((sum, b) => {
    return sum + Math.max(1, differenceInDays(b.checkOut, b.checkIn));
  }, 0);
  
  return totalNights > 0 ? totalRevenue / totalNights : 0;
}

/**
 * Calculate Revenue per Available Room (RevPAR)
 * Formula: total revenue / available room nights
 */
export function calculateRevPAR(
  bookings: Booking[],
  properties: Property[],
  startDate: Date,
  endDate: Date
): number {
  const activeProperties = properties.filter((p) => p.status === 'active');
  if (activeProperties.length === 0) return 0;
  
  const totalDays = Math.max(1, differenceInDays(endDate, startDate) + 1);
  const totalAvailableNights = totalDays * activeProperties.length;
  
  const totalRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.totalPriceEUR, 0);
  
  return totalRevenue / totalAvailableNights;
}

/**
 * Calculate average length of stay
 */
export function calculateAvgStayLength(bookings: Booking[]): number {
  const validBookings = bookings.filter((b) => b.status !== 'cancelled');
  
  if (validBookings.length === 0) return 0;
  
  const totalNights = validBookings.reduce((sum, b) => {
    return sum + Math.max(1, differenceInDays(b.checkOut, b.checkIn));
  }, 0);
  
  return totalNights / validBookings.length;
}

/**
 * Calculate booking lead time (average days in advance)
 */
export function calculateBookingLeadTime(bookings: Booking[]): number {
  const validBookings = bookings.filter((b) => b.status !== 'cancelled');
  
  if (validBookings.length === 0) return 0;
  
  const totalLeadDays = validBookings.reduce((sum, b) => {
    return sum + Math.max(0, differenceInDays(b.checkIn, b.createdAt));
  }, 0);
  
  return totalLeadDays / validBookings.length;
}

/**
 * Calculate cancellation rate
 */
export function calculateCancellationRate(bookings: Booking[]): number {
  if (bookings.length === 0) return 0;
  
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
  return (cancelled / bookings.length) * 100;
}

/**
 * Calculate expense ratio
 * Formula: (expenses / revenue) × 100%
 */
export function calculateExpenseRatio(
  totalExpenses: number,
  totalRevenue: number
): number {
  if (totalRevenue === 0) return 0;
  return (totalExpenses / totalRevenue) * 100;
}

/**
 * Calculate net profit
 */
export function calculateNetProfit(
  totalRevenue: number,
  totalExpenses: number
): number {
  return totalRevenue - totalExpenses;
}

/**
 * Calculate revenue by property
 */
export function calculateRevenueByProperty(
  bookings: Booking[],
  properties: Property[]
): Record<string, number> {
  const revenueByProperty: Record<string, number> = {};
  
  // Initialize with 0 for all properties
  properties.forEach((p) => {
    revenueByProperty[p.id] = 0;
  });
  
  // Sum up revenue
  bookings
    .filter((b) => b.status !== 'cancelled')
    .forEach((b) => {
      revenueByProperty[b.propertyId] =
        (revenueByProperty[b.propertyId] || 0) + b.totalPriceEUR;
    });
  
  return revenueByProperty;
}

/**
 * Calculate expenses by category
 */
export function calculateExpensesByCategory(
  expenses: Expense[]
): Record<string, number> {
  return expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amountEUR;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Calculate monthly revenue
 */
export function calculateMonthlyRevenue(
  bookings: Booking[],
  year: number
): number[] {
  const monthlyRevenue = new Array(12).fill(0);
  
  bookings
    .filter((b) => b.status !== 'cancelled')
    .forEach((b) => {
      const month = b.checkIn.getMonth();
      const bookingYear = b.checkIn.getFullYear();
      if (bookingYear === year) {
        monthlyRevenue[month] += b.totalPriceEUR;
      }
    });
  
  return monthlyRevenue;
}

/**
 * Calculate monthly expenses
 */
export function calculateMonthlyExpenses(
  expenses: Expense[],
  year: number
): number[] {
  const monthlyExpenses = new Array(12).fill(0);
  
  expenses.forEach((e) => {
    const month = e.date.getMonth();
    const expenseYear = e.date.getFullYear();
    if (expenseYear === year) {
      monthlyExpenses[month] += e.amountEUR;
    }
  });
  
  return monthlyExpenses;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Get today's occupancy (which properties are occupied)
 */
export function getTodayOccupancy(
  bookings: Booking[],
  properties: Property[]
): {
  occupied: number;
  total: number;
  rate: number;
  occupiedProperties: string[];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const activeProperties = properties.filter((p) => p.status === 'active');
  
  const occupiedProperties = bookings
    .filter(
      (b) =>
        b.status !== 'cancelled' &&
        b.checkIn <= today &&
        b.checkOut > today
    )
    .map((b) => b.propertyId);
  
  const uniqueOccupied = [...new Set(occupiedProperties)];
  
  return {
    occupied: uniqueOccupied.length,
    total: activeProperties.length,
    rate: activeProperties.length > 0
      ? (uniqueOccupied.length / activeProperties.length) * 100
      : 0,
    occupiedProperties: uniqueOccupied,
  };
}

/**
 * Calculate total revenue for a period
 */
export function calculateTotalRevenue(
  bookings: Booking[],
  startDate?: Date,
  endDate?: Date
): { EUR: number; FCFA: number } {
  const validBookings = bookings.filter((b) => b.status !== 'cancelled');
  
  // If no date range is provided, calculate total revenue for all bookings
  if (!startDate || !endDate) {
    return validBookings.reduce(
      (sum, b) => ({
        EUR: sum.EUR + b.totalPriceEUR,
        FCFA: sum.FCFA + b.totalPriceFCFA,
      }),
      { EUR: 0, FCFA: 0 }
    );
  }
  
  // Normalize period dates
  const periodStart = startOfDay(startDate);
  const periodEnd = startOfDay(endDate);
  const periodEndPlusOne = new Date(periodEnd);
  periodEndPlusOne.setDate(periodEndPlusOne.getDate() + 1);
  
  let totalRevenueEUR = 0;
  let totalRevenueFCFA = 0;
  
  for (const booking of validBookings) {
    // Normalize booking dates
    const checkIn = startOfDay(booking.checkIn);
    const checkOut = startOfDay(booking.checkOut);
    
    // Check if booking overlaps with the period
    if (checkOut <= periodStart || checkIn > periodEnd) {
      continue; // No overlap
    }
    
    // Calculate total nights for the booking
    const totalNights = differenceInCalendarDays(checkOut, checkIn);
    if (totalNights <= 0) continue;
    
    // Calculate nights within the period
    const bookingStart = startOfDay(new Date(Math.max(checkIn.getTime(), periodStart.getTime())));
    const bookingEnd = startOfDay(new Date(Math.min(checkOut.getTime(), periodEndPlusOne.getTime())));
    const nightsInPeriod = differenceInCalendarDays(bookingEnd, bookingStart);
    
    if (nightsInPeriod <= 0) continue;
    
    // Calculate proportional revenue
    // Example: Booking 600 EUR for 6 nights, 3 nights in period = 300 EUR
    const revenueProportion = nightsInPeriod / totalNights;
    totalRevenueEUR += booking.totalPriceEUR * revenueProportion;
    totalRevenueFCFA += booking.totalPriceFCFA * revenueProportion;
  }
  
  return {
    EUR: Math.round(totalRevenueEUR * 100) / 100, // Round to 2 decimal places
    FCFA: Math.round(totalRevenueFCFA * 100) / 100,
  };
}

/**
 * Calculate total expenses for a period
 */
export function calculateTotalExpenses(
  expenses: Expense[],
  startDate?: Date,
  endDate?: Date
): { EUR: number; FCFA: number } {
  let filteredExpenses = expenses;
  
  if (startDate) {
    filteredExpenses = filteredExpenses.filter((e) => e.date >= startDate);
  }
  
  if (endDate) {
    filteredExpenses = filteredExpenses.filter((e) => e.date <= endDate);
  }
  
  return filteredExpenses.reduce(
    (sum, e) => ({
      EUR: sum.EUR + e.amountEUR,
      FCFA: sum.FCFA + e.amountFCFA,
    }),
    { EUR: 0, FCFA: 0 }
  );
}

