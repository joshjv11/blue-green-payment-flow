-- ========================================
-- FIX LOGIN ISSUES - COMPREHENSIVE SCRIPT
-- ========================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/sql/new
-- ========================================

-- Step 1: Confirm all existing user emails (if email confirmation is blocking login)
-- This allows all existing users to sign in immediately
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmed_at = COALESCE(confirmed_at, now()),
  updated_at = now()
WHERE email_confirmed_at IS NULL OR confirmed_at IS NULL;

-- Verify the update
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Ensure the signup trigger exists and is working
-- This creates profiles automatically when users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();
  
  -- Also create default user plan
  INSERT INTO public.user_plans (
    user_id, 
    plan, 
    ai_queries_used, 
    ai_queries_limit,
    ai_queries_reset_date,
    is_active,
    started_at
  )
  VALUES (
    new.id,
    'free',
    0,
    3,
    CURRENT_DATE,
    true,
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Drop and recreate trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Verify trigger exists
SELECT 
  trigger_name, 
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Step 4: Create profiles for any users that don't have one
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ) as full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 5: Create user plans for any users that don't have one
INSERT INTO public.user_plans (
  user_id, 
  plan, 
  ai_queries_used, 
  ai_queries_limit,
  ai_queries_reset_date,
  is_active,
  started_at
)
SELECT 
  u.id,
  'free',
  0,
  3,
  CURRENT_DATE,
  true,
  now()
FROM auth.users u
LEFT JOIN public.user_plans up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 6: Summary - Check what we fixed
SELECT 
  'Users with confirmed emails' as check_type,
  COUNT(*) as count
FROM auth.users
WHERE email_confirmed_at IS NOT NULL

UNION ALL

SELECT 
  'Users with profiles' as check_type,
  COUNT(*) as count
FROM public.profiles

UNION ALL

SELECT 
  'Users with plans' as check_type,
  COUNT(*) as count
FROM public.user_plans

UNION ALL

SELECT 
  'Users missing profiles' as check_type,
  COUNT(*) as count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 
  'Users missing plans' as check_type,
  COUNT(*) as count
FROM auth.users u
LEFT JOIN public.user_plans up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- ========================================
-- AFTER RUNNING THIS SCRIPT:
-- ========================================
-- 1. All existing users can now sign in (emails confirmed)
-- 2. New signups will automatically get profiles and plans
-- 3. Check Supabase Dashboard → Authentication → Providers
--    → Disable "Confirm email" toggle for faster testing
-- ========================================


