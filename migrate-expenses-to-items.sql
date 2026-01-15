-- Migration script: Convert existing expenses to have expense items
-- This script creates one expense_item for each existing expense
-- using the expense description as the item name

INSERT INTO expense_items (expense_id, item_name, quantity, amount_eur, amount_fcfa)
SELECT 
  id as expense_id,
  COALESCE(description, 'Expense Item') as item_name,
  1 as quantity,
  amount_eur,
  amount_fcfa
FROM expenses
WHERE id NOT IN (SELECT expense_id FROM expense_items WHERE expense_id IS NOT NULL);

-- Optional: Clear description field if you want to use it only for notes
-- UPDATE expenses SET description = NULL WHERE description IS NOT NULL;

