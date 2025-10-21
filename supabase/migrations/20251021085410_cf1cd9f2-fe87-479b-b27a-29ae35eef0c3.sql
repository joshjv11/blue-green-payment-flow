-- ==========================================
-- Add financial columns to sales_orders
-- ==========================================

-- Add subtotal column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN subtotal numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add tax_amount column if it doesn't exist (check current state)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN tax_amount numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add grand_total column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'grand_total'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN grand_total numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add amount_paid column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN amount_paid numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add balance_due computed column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'balance_due'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN balance_due numeric(12,2) GENERATED ALWAYS AS (grand_total - amount_paid) STORED;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN public.sales_orders.subtotal IS 'Sum of all line items before tax';
COMMENT ON COLUMN public.sales_orders.tax_amount IS 'Total tax amount (CGST + SGST + IGST)';
COMMENT ON COLUMN public.sales_orders.grand_total IS 'Final total including tax (subtotal + tax_amount)';
COMMENT ON COLUMN public.sales_orders.amount_paid IS 'Amount paid by customer (0 for unpaid sales)';
COMMENT ON COLUMN public.sales_orders.balance_due IS 'Computed: grand_total - amount_paid';

-- Backfill existing rows with computed totals (if any exist with NULL values)
UPDATE public.sales_orders
SET 
  subtotal = COALESCE(total_amount, 0),
  grand_total = COALESCE(total_amount, 0) + COALESCE(tax_amount, 0),
  amount_paid = COALESCE(amount_paid, 0)
WHERE subtotal = 0 OR grand_total = 0;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';