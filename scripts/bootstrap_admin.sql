-- Bootstrap Admin Script
-- Usage: psql $DATABASE_URL -v email='your-email@example.com' -f scripts/bootstrap_admin.sql
-- Or via Supabase SQL Editor: Replace :email with your email

UPDATE public.profiles 
SET 
  is_admin = true,
  is_active = true,
  updated_at = now()
WHERE lower(email) = lower(:'email');

-- Verify the change
SELECT 
  id,
  email,
  full_name,
  is_admin,
  is_active,
  created_at
FROM public.profiles
WHERE lower(email) = lower(:'email');
