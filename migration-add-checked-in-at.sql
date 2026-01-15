-- Migration: Add checked_in_at column to bookings table
-- Run this SQL in your Supabase dashboard: SQL Editor

-- Add checked_in_at column if it doesn't exist
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Add check_in_notes column if it doesn't exist (for completeness)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS check_in_notes TEXT;

