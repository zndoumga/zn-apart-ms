-- Migration: Clear all booking numbers
-- This will set all booking_number values to NULL
-- Run this before reassigning booking numbers sequentially

UPDATE bookings 
SET booking_number = NULL 
WHERE booking_number IS NOT NULL;

-- Verify the update
SELECT COUNT(*) as bookings_with_numbers 
FROM bookings 
WHERE booking_number IS NOT NULL;
-- Should return 0
