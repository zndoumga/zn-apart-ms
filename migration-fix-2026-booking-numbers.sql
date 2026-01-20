-- Migration: Fix booking numbers for bookings created in 2026
-- This will reassign sequential numbers starting from 0001-26 for all bookings created in 2026
-- This fixes the issue where numbers were assigned based on check-in date during migration

DO $$
DECLARE
    booking_record RECORD;
    booking_counter INTEGER := 0;
    new_booking_number TEXT;
BEGIN
    -- Loop through all bookings created in 2026, ordered by creation date (oldest first)
    FOR booking_record IN 
        SELECT id, created_at
        FROM bookings
        WHERE EXTRACT(YEAR FROM created_at) = 2026
        AND is_deleted = FALSE
        ORDER BY created_at ASC
    LOOP
        -- Increment counter for this booking
        booking_counter := booking_counter + 1;
        
        -- Generate booking number: XXXX-26 format
        new_booking_number := LPAD(booking_counter::TEXT, 4, '0') || '-26';
        
        -- Update the booking with the new number
        UPDATE bookings
        SET booking_number = new_booking_number
        WHERE id = booking_record.id;
        
        -- Optional: Log progress (uncomment if needed)
        -- RAISE NOTICE 'Assigned % to booking % (created: %)', new_booking_number, booking_record.id, booking_record.created_at;
    END LOOP;
    
    RAISE NOTICE 'Fixed booking numbers for % bookings created in 2026', booking_counter;
END $$;

-- Verify the results
SELECT 
    booking_number,
    created_at,
    check_in,
    guest_name
FROM bookings
WHERE EXTRACT(YEAR FROM created_at) = 2026
AND is_deleted = FALSE
ORDER BY created_at ASC;

-- Show summary
SELECT 
    COUNT(*) as total_bookings_2026,
    MIN(booking_number) as first_number,
    MAX(booking_number) as last_number
FROM bookings
WHERE EXTRACT(YEAR FROM created_at) = 2026
AND booking_number LIKE '%-26'
AND is_deleted = FALSE;
