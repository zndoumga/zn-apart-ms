-- Diagnostic script to check booking numbers
-- This will help identify why booking numbers are higher than expected

-- Check all bookings created in 2026 with their booking numbers
SELECT 
    id,
    booking_number,
    created_at,
    check_in,
    EXTRACT(YEAR FROM created_at) as created_year,
    EXTRACT(YEAR FROM check_in) as checkin_year,
    guest_name,
    is_deleted
FROM bookings
WHERE EXTRACT(YEAR FROM created_at) = 2026
ORDER BY created_at ASC;

-- Count bookings created in 2026
SELECT 
    COUNT(*) as total_bookings_created_2026,
    COUNT(CASE WHEN booking_number LIKE '%-26' THEN 1 END) as bookings_with_26_suffix,
    MAX(CASE WHEN booking_number LIKE '%-26' THEN CAST(SUBSTRING(booking_number FROM '^(\d{4})') AS INTEGER) END) as max_number_with_26_suffix
FROM bookings
WHERE EXTRACT(YEAR FROM created_at) = 2026
AND is_deleted = FALSE;

-- Check all bookings with -26 suffix (regardless of creation date)
SELECT 
    booking_number,
    created_at,
    check_in,
    EXTRACT(YEAR FROM created_at) as created_year,
    EXTRACT(YEAR FROM check_in) as checkin_year,
    guest_name
FROM bookings
WHERE booking_number LIKE '%-26'
AND is_deleted = FALSE
ORDER BY CAST(SUBSTRING(booking_number FROM '^(\d{4})') AS INTEGER) ASC;

-- Show the issue: bookings created in different years but with -26 suffix
SELECT 
    booking_number,
    created_at,
    check_in,
    EXTRACT(YEAR FROM created_at) as created_year,
    EXTRACT(YEAR FROM check_in) as checkin_year
FROM bookings
WHERE booking_number LIKE '%-26'
AND EXTRACT(YEAR FROM created_at) != 2026
AND is_deleted = FALSE
ORDER BY created_at ASC;
