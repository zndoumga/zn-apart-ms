-- Migration: Merge 'cleaning' category into 'cleaning_material'
-- This script updates all expenses with category 'cleaning' to 'cleaning_material'

UPDATE expenses 
SET category = 'cleaning_material' 
WHERE category = 'cleaning';

-- Verify the update
SELECT 
    category,
    COUNT(*) as count
FROM expenses
WHERE category IN ('cleaning', 'cleaning_material')
GROUP BY category;

-- Should show only 'cleaning_material' with all expenses
