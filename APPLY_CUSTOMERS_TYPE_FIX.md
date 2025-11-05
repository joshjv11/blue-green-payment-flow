# Fix: Add `type` Column to Customers Table

## Problem
The edge functions `create-sale-v2` and `create-purchase-v2` are trying to insert records with a `type` column in the `customers` table, but this column doesn't exist in your database schema, causing the error:

```
Could not find the 'type' column of 'customers' in the schema cache Code: PGRST204
```

## Solution

Run this SQL migration in your Supabase SQL Editor:

```sql
-- Add type column to customers table to distinguish between customers and suppliers
-- This migration is idempotent and safe to run multiple times

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
    -- Add the column with default value
    ALTER TABLE public.customers 
    ADD COLUMN type TEXT DEFAULT 'customer';
    
    -- Update existing records to have 'customer' as default type
    UPDATE public.customers SET type = 'customer' WHERE type IS NULL;
    
    -- Add check constraint
    ALTER TABLE public.customers 
    ADD CONSTRAINT customers_type_check 
    CHECK (type IN ('customer', 'supplier'));
    
    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(type);
    
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
```

## Steps to Apply

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the SQL above
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for the success message

## Verification

After running the migration, verify it worked by running:

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'customers'
AND column_name = 'type';
```

You should see the `type` column with:
- `data_type`: `text`
- `column_default`: `'customer'`
- `is_nullable`: `NO`

## What This Does

- Adds a `type` column to the `customers` table
- Sets default value to `'customer'` for existing records
- Adds a constraint to only allow `'customer'` or `'supplier'` values
- Creates an index for better query performance
- Makes the column NOT NULL for data integrity
- Reloads the PostgREST schema cache so the API recognizes the new column

After this migration, your Sales and Purchases pages should work correctly!

