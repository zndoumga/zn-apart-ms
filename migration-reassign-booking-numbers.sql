-- Migration: Reassign booking numbers sequentially based on check-in date and year
-- Format: XXXX-YY (e.g., 0001-25, 0002-25, etc.)
-- Numbers are assigned sequentially within each year based on check-in date

DO $$
DECLARE
    booking_record RECORD;
    current_year INTEGER;
    year_short TEXT;
    booking_counter INTEGER;
    new_booking_number TEXT;
    prev_year INTEGER := NULL;
BEGIN
    -- Loop through all bookings ordered by check-in date (oldest first)
    FOR booking_record IN 
        SELECT id, check_in
        FROM bookings
        WHERE is_deleted = FALSE
        ORDER BY check_in ASC
    LOOP
        -- Extract year from check-in date
        current_year := EXTRACT(YEAR FROM booking_record.check_in);
        year_short := RIGHT(current_year::TEXT, 2);
        
        -- If this is a new year, reset the counter
        IF prev_year IS NULL OR prev_year != current_year THEN
            booking_counter := 0;
            prev_year := current_year;
        END IF;
        
        -- Increment counter for this booking
        booking_counter := booking_counter + 1;
        
        -- Generate booking number: XXXX-YY format
        new_booking_number := LPAD(booking_counter::TEXT, 4, '0') || '-' || year_short;
        
        -- Update the booking with the new number
        UPDATE bookings
        SET booking_number = new_booking_number
        WHERE id = booking_record.id;
        
        -- Optional: Log progress (uncomment if needed)
        -- RAISE NOTICE 'Assigned % to booking % (check-in: %)', new_booking_number, booking_record.id, booking_record.check_in;
    END LOOP;
    
    RAISE NOTICE 'Booking numbers reassigned successfully';
END $$;

-- Verify the results
SELECT 
    booking_number,
    check_in,
    EXTRACT(YEAR FROM check_in) as year,
    guest_name
FROM bookings
WHERE is_deleted = FALSE
ORDER BY check_in ASC
LIMIT 20;

-- Show count per year
SELECT 
    EXTRACT(YEAR FROM check_in) as year,
    COUNT(*) as booking_count,
    MIN(booking_number) as first_number,
    MAX(booking_number) as last_number
FROM bookings
WHERE is_deleted = FALSE AND booking_number IS NOT NULL
GROUP BY EXTRACT(YEAR FROM check_in)
ORDER BY year;
