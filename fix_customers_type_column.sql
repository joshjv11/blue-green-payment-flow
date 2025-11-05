-- Fix: Add type column to customers table
-- Run this in Supabase SQL Editor to fix the "Could not find the 'type' column" error

-- Add type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'type'
  ) THEN
    -- Add the column with default value
    ALTER TABLE public.customers 
    ADD COLUMN type TEXT DEFAULT 'customer';
    
    -- Update existing records
    UPDATE public.customers SET type = 'customer' WHERE type IS NULL;
    
    -- Add check constraint (drop if exists first)
    ALTER TABLE public.customers 
    DROP CONSTRAINT IF EXISTS customers_type_check;
    
    ALTER TABLE public.customers 
    ADD CONSTRAINT customers_type_check 
    CHECK (type IN ('customer', 'supplier'));
    
    -- Create index
    CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(type);
    
    -- Make NOT NULL
    ALTER TABLE public.customers ALTER COLUMN type SET NOT NULL;
    
    -- Add comment
    COMMENT ON COLUMN public.customers.type IS 'Type of customer record: customer or supplier';
    
    RAISE NOTICE '✅ Added type column to customers table';
  ELSE
    RAISE NOTICE 'ℹ️ Type column already exists';
  END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'customers'
AND column_name = 'type';

