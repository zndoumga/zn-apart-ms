import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Table names
export const TABLES = {
  PROPERTIES: 'properties',
  BOOKINGS: 'bookings',
  BOOKING_COMMENTS: 'booking_comments',
  EXPENSES: 'expenses',
  RECURRING_EXPENSES: 'recurring_expenses',
  CUSTOMERS: 'customers',
  TASKS: 'tasks',
  TASK_COMMENTS: 'task_comments',
  REQUESTS: 'requests',
  REQUEST_COMMENTS: 'request_comments',
  MOBILE_MONEY: 'mobile_money_transactions',
  MAINTENANCE: 'maintenance',
  SETTINGS: 'settings',
  AUDIT_LOG: 'audit_log',
} as const;

// Storage bucket names
export const BUCKETS = {
  PROPERTY_PHOTOS: 'property-photos',
  EXPENSE_RECEIPTS: 'expense-receipts',
  MAINTENANCE_PHOTOS: 'maintenance-photos',
  CUSTOMER_DOCUMENTS: 'customer-documents',
} as const;

export default supabase;

