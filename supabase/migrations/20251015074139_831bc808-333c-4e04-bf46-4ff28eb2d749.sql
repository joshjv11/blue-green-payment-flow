-- Force PostgREST schema cache reload
-- This ensures all recent table changes (like customers.email being nullable) are recognized
NOTIFY pgrst, 'reload schema';

-- Verify customers table structure matches expected schema
-- (This is informational - the table should already have these columns)
COMMENT ON TABLE public.customers IS 'Customer records with nullable email, party_gstin, tax_id fields';
COMMENT ON COLUMN public.customers.email IS 'Customer email - nullable for flexibility';
COMMENT ON COLUMN public.customers.party_gstin IS 'GST Identification Number for Indian customers';
COMMENT ON COLUMN public.customers.tax_id_label IS 'Custom tax ID label (e.g., VAT, TIN)';
COMMENT ON COLUMN public.customers.tax_id_value IS 'Tax identification value';
COMMENT ON COLUMN public.customers.country IS 'Customer country code (defaults to IN for India)';