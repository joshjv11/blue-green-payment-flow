-- Add missing GST/VAT fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'IN',
ADD COLUMN IF NOT EXISTS tax_id_label TEXT,
ADD COLUMN IF NOT EXISTS tax_id_value TEXT;

-- Make email nullable since it's optional in most flows
ALTER TABLE public.customers 
ALTER COLUMN email DROP NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN public.customers.country IS 'ISO country code (IN, US, etc.)';
COMMENT ON COLUMN public.customers.tax_id_label IS 'Label for tax ID (e.g., GSTIN, VAT, Tax ID)';
COMMENT ON COLUMN public.customers.tax_id_value IS 'Actual tax ID value';
