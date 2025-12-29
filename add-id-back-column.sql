-- Add column for ID document back (verso) to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_document_back_url TEXT;

