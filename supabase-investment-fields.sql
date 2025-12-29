-- Add investment and rent fields to properties table
-- Run this SQL in your Supabase SQL editor

ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_price_eur DECIMAL(10,2) DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_price_fcfa DECIMAL(12,2) DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS purchase_price_eur DECIMAL(10,2) DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS purchase_price_fcfa DECIMAL(12,2) DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS travaux_eur DECIMAL(10,2) DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS travaux_fcfa DECIMAL(12,2) DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS meubles_eur DECIMAL(10,2) DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS meubles_fcfa DECIMAL(12,2) DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS equipement_eur DECIMAL(10,2) DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS equipement_fcfa DECIMAL(12,2) DEFAULT 0;

