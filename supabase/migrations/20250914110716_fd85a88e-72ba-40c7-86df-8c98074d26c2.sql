-- Fix the conflicting RLS policies for user_plans
-- Remove the problematic system policy and simplify

-- Drop all existing policies first
DROP POLICY IF EXISTS "System can create user plans during signup" ON public.user_plans;
DROP POLICY IF EXISTS "Users can insert their own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can update their own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can view their own plan" ON public.user_plans;

-- Create simplified, working policies
CREATE POLICY "Users can manage their own plans" ON public.user_plans
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update the handle_new_user function to use security definer properly
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
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  
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