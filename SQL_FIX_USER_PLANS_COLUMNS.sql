-- Fix user_plans table to ensure all required columns exist
-- This migration adds started_at and expires_at columns if they don't exist

-- Add started_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_plans' 
    AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.user_plans
    ADD COLUMN started_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add expires_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_plans' 
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.user_plans
    ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_plans' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.user_plans
    ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Update plan constraint to include premium if needed
DO $$ 
BEGIN
  -- Check if constraint exists and needs updating
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_schema = 'public' 
    AND table_name = 'user_plans' 
    AND constraint_name = 'user_plans_plan_check'
  ) THEN
    -- Drop existing constraint
    ALTER TABLE public.user_plans
    DROP CONSTRAINT IF EXISTS user_plans_plan_check;
    
    -- Add new constraint with premium
    ALTER TABLE public.user_plans
    ADD CONSTRAINT user_plans_plan_check 
    CHECK (plan IN ('free', 'pro', 'premium'));
  END IF;
END $$;

-- Update existing rows to have started_at if null
UPDATE public.user_plans
SET started_at = created_at
WHERE started_at IS NULL;

