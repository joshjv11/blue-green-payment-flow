-- ==========================================
-- Add JSONB snapshot columns to sales_orders
-- ==========================================

-- Add billing_snapshot column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'billing_snapshot'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN billing_snapshot jsonb;
  END IF;
END $$;

-- Add shipping_snapshot column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'shipping_snapshot'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN shipping_snapshot jsonb;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN public.sales_orders.billing_snapshot IS 'Customer billing info as JSON: name, email, phone, address, city, state, postal_code, country, gstin';
COMMENT ON COLUMN public.sales_orders.shipping_snapshot IS 'Shipping address info as JSON (if different from billing)';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';