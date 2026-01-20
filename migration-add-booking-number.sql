-- Migration: Add booking_number column to bookings table
-- Run this migration if the booking_number column doesn't exist

-- Add booking_number column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'booking_number'
  ) THEN
    ALTER TABLE bookings ADD COLUMN booking_number VARCHAR(20);
  END IF;
END $$;

-- Add index for booking_number lookups
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings(booking_number);
