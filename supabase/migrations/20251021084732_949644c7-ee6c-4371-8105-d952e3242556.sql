-- ==========================================
-- Make email optional in customers table
-- and add flexible unique constraints
-- ==========================================

-- 1. Drop NOT NULL constraint on email
ALTER TABLE public.customers 
  ALTER COLUMN email DROP NOT NULL;

-- 2. Drop existing unique constraints if they exist
DROP INDEX IF EXISTS customers_email_key;
DROP INDEX IF EXISTS customers_user_id_email_key;
DROP INDEX IF EXISTS customers_user_email_partial_uniq;
DROP INDEX IF EXISTS customers_user_phone_partial_uniq;

-- 3. Create partial unique index: email must be unique per user when present
CREATE UNIQUE INDEX customers_user_email_partial_uniq 
  ON public.customers (user_id, lower(email)) 
  WHERE email IS NOT NULL AND email <> '';

-- 4. Create partial unique index: phone must be unique per user when present
CREATE UNIQUE INDEX customers_user_phone_partial_uniq 
  ON public.customers (user_id, phone) 
  WHERE phone IS NOT NULL AND phone <> '';

-- 5. Add helpful comments
COMMENT ON COLUMN public.customers.email IS 'Optional customer email. Unique per user when provided (case-insensitive).';
COMMENT ON COLUMN public.customers.phone IS 'Optional customer phone/WhatsApp. Unique per user when provided.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';