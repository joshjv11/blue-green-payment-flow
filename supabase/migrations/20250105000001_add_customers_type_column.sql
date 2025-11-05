-- Add type column to customers table to distinguish between customers and suppliers
-- This migration is idempotent and safe to run multiple times

-- Check if column exists, if not add it
DO $$
BEGIN
  -- Add type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.customers 
    ADD COLUMN type TEXT DEFAULT 'customer';
    
    -- Add check constraint
    ALTER TABLE public.customers 
    ADD CONSTRAINT customers_type_check 
    CHECK (type IN ('customer', 'supplier'));
    
    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(type);
    
    -- Update existing records to have 'customer' as default type
    UPDATE public.customers SET type = 'customer' WHERE type IS NULL;
    
    -- Make the column NOT NULL after setting defaults
    ALTER TABLE public.customers ALTER COLUMN type SET NOT NULL;
    
    -- Add comment
    COMMENT ON COLUMN public.customers.type IS 'Type of customer record: customer or supplier';
    
    RAISE NOTICE 'Added type column to customers table';
  ELSE
    RAISE NOTICE 'Type column already exists in customers table';
  END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

