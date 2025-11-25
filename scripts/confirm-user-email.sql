-- Manually Confirm User Email
-- Run this in Supabase SQL Editor to confirm joshuavaz55@gmail.com immediately

-- Update the user's email_confirmed_at timestamp
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmed_at = COALESCE(confirmed_at, now()),
  updated_at = now()
WHERE email = 'joshuavaz55@gmail.com';

-- Verify the update
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users
WHERE email = 'joshuavaz55@gmail.com';

-- Should show email_confirmed_at and confirmed_at are now set to current timestamp
-- This allows the user to sign in immediately



