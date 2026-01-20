-- ZN Apartment Management Studio - Supabase Schema
-- Run this SQL in your Supabase dashboard: SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  max_guests INTEGER NOT NULL DEFAULT 2,
  amenities TEXT[] DEFAULT '{}',
  base_price_eur DECIMAL(10,2) NOT NULL DEFAULT 0,
  base_price_fcfa DECIMAL(12,2) NOT NULL DEFAULT 0,
  cleaning_fee_eur DECIMAL(10,2) DEFAULT 0,
  cleaning_fee_fcfa DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  nationality VARCHAR(100),
  country_of_residence VARCHAR(100),
  address TEXT,
  date_of_birth DATE,
  id_type VARCHAR(50),
  id_number VARCHAR(100),
  id_document_url TEXT,
  signature_url TEXT,
  preferred_language VARCHAR(10) DEFAULT 'fr',
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent_eur DECIMAL(12,2) DEFAULT 0,
  total_spent_fcfa DECIMAL(15,2) DEFAULT 0,
  average_rating DECIMAL(3,2),
  is_vip BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_number VARCHAR(20),
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  total_price_eur DECIMAL(10,2) NOT NULL,
  total_price_fcfa DECIMAL(12,2) NOT NULL,
  commission_eur DECIMAL(10,2) DEFAULT 0,
  commission_fcfa DECIMAL(12,2) DEFAULT 0,
  cleaning_fee_eur DECIMAL(10,2) DEFAULT 0,
  cleaning_fee_fcfa DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  source VARCHAR(20) NOT NULL DEFAULT 'direct',
  notes TEXT,
  check_in_notes TEXT,
  checked_in_at TIMESTAMPTZ,
  payment_status VARCHAR(20) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_bookings_is_deleted ON bookings(is_deleted);

-- Booking Comments table
CREATE TABLE IF NOT EXISTS booking_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_comments_booking ON booking_comments(booking_id);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  amount_eur DECIMAL(10,2) NOT NULL,
  amount_fcfa DECIMAL(12,2) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  vendor VARCHAR(255),
  receipt_url TEXT,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring Expenses Templates table
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL,
  vendor VARCHAR(255),
  description TEXT NOT NULL,
  amount_eur DECIMAL(10,2) NOT NULL,
  amount_fcfa DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'todo',
  priority VARCHAR(10) NOT NULL DEFAULT 'medium',
  assigned_to VARCHAR(20),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Requests table
CREATE TABLE IF NOT EXISTS requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  submitted_by VARCHAR(20) NOT NULL,
  resolved_by VARCHAR(20),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request Comments table
CREATE TABLE IF NOT EXISTS request_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mobile Money Transactions table
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- 'deposit' or 'withdrawal'
  amount_eur DECIMAL(10,2) NOT NULL,
  amount_fcfa DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR(255),
  date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance table
CREATE TABLE IF NOT EXISTS maintenance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  cost_eur DECIMAL(10,2) DEFAULT 0,
  cost_fcfa DECIMAL(12,2) DEFAULT 0,
  provider VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  before_photos TEXT[] DEFAULT '{}',
  after_photos TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
  exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 655.957,
  low_balance_threshold DECIMAL(10,2) DEFAULT 100,
  default_currency VARCHAR(10) DEFAULT 'EUR',
  admin_password_hash VARCHAR(255) NOT NULL DEFAULT 'admin123',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
  entity VARCHAR(50) NOT NULL, -- 'property', 'booking', etc.
  entity_id VARCHAR(255) NOT NULL,
  performed_by VARCHAR(20) NOT NULL, -- 'staff' or 'admin'
  previous_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_expenses_property ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_property ON tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_property ON maintenance(property_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- Insert default settings
INSERT INTO settings (id, exchange_rate, low_balance_threshold, default_currency, admin_password_hash)
VALUES ('global', 655.957, 100, 'EUR', 'admin123')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (optional, for production)
-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- etc...

-- Create storage buckets (run these separately in Supabase dashboard or via API)
-- 1. Go to Storage in Supabase dashboard
-- 2. Create buckets: 'property-photos', 'expense-receipts', 'maintenance-photos'
-- 3. Set them as public buckets for easy access

