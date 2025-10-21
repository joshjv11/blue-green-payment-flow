-- Make email optional in customers table and add flexible unique constraints

-- Drop NOT NULL constraint on email
ALTER TABLE public.customers 
ALTER COLUMN email DROP NOT NULL;

-- Drop the unique constraint (not just the index)
ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_email_key;

ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_user_id_email_key;

-- Create partial unique index: email must be unique per user, but only when email is present
CREATE UNIQUE INDEX customers_user_email_unique 
ON public.customers (user_id, lower(email)) 
WHERE email IS NOT NULL;

-- Create partial unique index: phone must be unique per user when present
CREATE UNIQUE INDEX customers_user_phone_unique 
ON public.customers (user_id, phone) 
WHERE phone IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN public.customers.email IS 'Customer email (optional) - unique per user when present';
COMMENT ON COLUMN public.customers.phone IS 'Customer phone (optional) - unique per user when present';

-- Reload schema
NOTIFY pgrst, 'reload schema';