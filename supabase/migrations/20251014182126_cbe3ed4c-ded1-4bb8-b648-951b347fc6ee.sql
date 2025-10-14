-- Add new columns to user_plans table for 3-tier system
ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Update plan column constraint to include premium
ALTER TABLE public.user_plans
  DROP CONSTRAINT IF EXISTS user_plans_plan_check;

ALTER TABLE public.user_plans
  ADD CONSTRAINT user_plans_plan_check 
  CHECK (plan IN ('free', 'pro', 'premium'));

-- Create a view for easy plan status checks
CREATE OR REPLACE VIEW public.user_plan_status AS
SELECT 
  user_id,
  plan,
  is_active,
  COALESCE(expires_at > now(), true) AS not_expired,
  (plan = 'pro' AND is_active) AS is_pro,
  (plan = 'premium' AND is_active AND COALESCE(expires_at > now(), true)) AS is_premium
FROM public.user_plans;

-- Grant access to the view
GRANT SELECT ON public.user_plan_status TO authenticated;

-- Create function to check plan access level
CREATE OR REPLACE FUNCTION public.check_plan_access(required_plan text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan_name text;
  plan_rank integer;
  required_rank integer;
BEGIN
  -- Get user's current plan
  SELECT plan INTO user_plan_name
  FROM public.user_plans
  WHERE user_id = auth.uid()
    AND is_active = true
    AND COALESCE(expires_at > now(), true);
  
  -- Default to free if no plan found
  user_plan_name := COALESCE(user_plan_name, 'free');
  
  -- Assign ranks: free=1, pro=2, premium=3
  plan_rank := CASE user_plan_name
    WHEN 'free' THEN 1
    WHEN 'pro' THEN 2
    WHEN 'premium' THEN 3
    ELSE 1
  END;
  
  required_rank := CASE required_plan
    WHEN 'free' THEN 1
    WHEN 'pro' THEN 2
    WHEN 'premium' THEN 3
    ELSE 1
  END;
  
  RETURN plan_rank >= required_rank;
END;
$$;