-- Fix RLS policies and create missing user plans
-- First, temporarily disable RLS to create user plans for existing users
ALTER TABLE public.user_plans DISABLE ROW LEVEL SECURITY;

-- Create user plans for any existing users that don't have them
INSERT INTO public.user_plans (user_id, plan, ai_queries_used, ai_queries_limit, ai_queries_reset_date)
SELECT 
  p.id,
  'free',
  0,
  3,
  CURRENT_DATE
FROM public.profiles p
LEFT JOIN public.user_plans up ON p.id = up.user_id
WHERE up.user_id IS NULL;

-- Re-enable RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policy and create a more permissive one
DROP POLICY IF EXISTS "Users can manage their own plans" ON public.user_plans;

-- Create separate policies for better control
CREATE POLICY "Users can view their own plan" ON public.user_plans
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan" ON public.user_plans
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plan" ON public.user_plans
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow system functions to create plans during signup
CREATE POLICY "System can create user plans" ON public.user_plans
FOR INSERT 
WITH CHECK (true);

-- Update the trigger to use ON CONFLICT properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert profile first  
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  -- Insert user plan with proper defaults
  INSERT INTO public.user_plans (
    user_id, 
    plan, 
    ai_queries_used, 
    ai_queries_limit,
    ai_queries_reset_date
  )
  VALUES (
    new.id,
    'free',
    0,
    3,
    CURRENT_DATE
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;