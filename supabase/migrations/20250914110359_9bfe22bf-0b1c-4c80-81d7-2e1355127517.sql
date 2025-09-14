-- Fix RLS policy for user_plans table to allow proper creation
-- The current policy is too restrictive and blocking user plan creation

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can update their own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can view their own plan" ON public.user_plans;

-- Create new policies that properly handle user plan creation and management
CREATE POLICY "Users can insert their own plan" ON public.user_plans
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plan" ON public.user_plans
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own plan" ON public.user_plans
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow system to create default user plans during signup
CREATE POLICY "System can create user plans during signup" ON public.user_plans
FOR INSERT 
WITH CHECK (true);

-- Update the handle_new_user function to ensure it works properly
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
  );
  
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
  );
  
  RETURN new;
END;
$$;