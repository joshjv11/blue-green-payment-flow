-- Add type column to customers table to distinguish between customers and suppliers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'customer' CHECK (type IN ('customer', 'supplier'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);

-- Update existing records to have 'customer' as default type
UPDATE customers SET type = 'customer' WHERE type IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE customers ALTER COLUMN type SET NOT NULL;

COMMENT ON COLUMN customers.type IS 'Type of customer record: customer or supplier';