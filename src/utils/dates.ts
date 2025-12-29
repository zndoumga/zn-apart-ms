import {
  format,
  formatDistanceToNow,
  differenceInDays,
  differenceInCalendarDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  subYears,
  isWithinInterval,
  parseISO,
  isValid,
} from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Format date in DD/MM/YYYY format (European standard)
 */
export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return format(d, formatStr, { locale: fr });
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Format date for display (short format)
 */
export function formatDateShort(date: Date | string): string {
  return formatDate(date, 'dd MMM yyyy');
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

/**
 * Format date for input fields (ISO format)
 */
export function formatForInput(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
}

/**
 * Calculate number of nights between two dates
 */
export function calculateNights(checkIn: Date | string, checkOut: Date | string): number {
  const start = typeof checkIn === 'string' ? parseISO(checkIn) : checkIn;
  const end = typeof checkOut === 'string' ? parseISO(checkOut) : checkOut;
  return Math.max(1, differenceInCalendarDays(end, start));
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return isWithinInterval(date, { start: startDate, end: endDate });
}

/**
 * Get preset date ranges
 */
export function getDateRangePreset(preset: string): { startDate: Date; endDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  
  switch (preset) {
    case 'today':
      return { startDate: today, endDate: endOfToday };
    
    case 'last7days':
      return { startDate: subDays(today, 6), endDate: endOfToday };
    
    case 'last30days':
      return { startDate: subDays(today, 29), endDate: endOfToday };
    
    case 'thisMonth':
      return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
    
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    }
    
    case 'thisYear':
      return { startDate: startOfYear(today), endDate: endOfYear(today) };
    
    case 'lastYear': {
      const lastYear = subYears(today, 1);
      return { startDate: startOfYear(lastYear), endDate: endOfYear(lastYear) };
    }
    
    default:
      return { startDate: startOfMonth(today), endDate: endOfToday };
  }
}

/**
 * Date range preset options
 */
export const DATE_RANGE_PRESETS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'last7days', label: '7 derniers jours' },
  { value: 'last30days', label: '30 derniers jours' },
  { value: 'thisMonth', label: 'Ce mois' },
  { value: 'lastMonth', label: 'Mois dernier' },
  { value: 'thisYear', label: 'Cette année' },
  { value: 'lastYear', label: 'Année dernière' },
  { value: 'custom', label: 'Personnalisé' },
];

/**
 * Get month name
 */
export function getMonthName(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: fr });
}

/**
 * Get days in month
 */
export function getDaysInMonth(date: Date): number {
  return differenceInDays(endOfMonth(date), startOfMonth(date)) + 1;
}

/**
 * Format booking date range
 */
export function formatBookingRange(checkIn: Date, checkOut: Date): string {
  const nights = calculateNights(checkIn, checkOut);
  return `${formatDateShort(checkIn)} - ${formatDateShort(checkOut)} (${nights} nuit${nights > 1 ? 's' : ''})`;
}

/**
 * Check if booking overlaps with date range
 */
export function bookingOverlapsRange(
  bookingCheckIn: Date,
  bookingCheckOut: Date,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  return bookingCheckIn <= rangeEnd && bookingCheckOut >= rangeStart;
}

/**
 * Get first day of month
 */
export function getFirstDayOfMonth(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfMonth(d);
}

/**
 * Get last day of month
 */
export function getLastDayOfMonth(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return endOfMonth(d);
}

