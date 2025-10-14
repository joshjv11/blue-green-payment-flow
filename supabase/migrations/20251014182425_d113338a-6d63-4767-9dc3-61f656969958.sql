-- Create a view for easy premium status checks
CREATE OR REPLACE VIEW public.user_is_premium AS
SELECT 
  user_id,
  plan,
  is_active,
  expires_at,
  (
    plan = 'premium' 
    AND is_active = TRUE 
    AND COALESCE(expires_at > now(), true)
  ) AS is_premium,
  (
    plan IN ('pro', 'premium')
    AND is_active = TRUE 
    AND COALESCE(expires_at > now(), true)
  ) AS has_pro_access
FROM public.user_plans;

-- Grant access to authenticated users
GRANT SELECT ON public.user_is_premium TO authenticated;

-- Create a function to check if subscription is expiring soon (within 7 days)
CREATE OR REPLACE FUNCTION public.is_subscription_expiring_soon()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expiry_date timestamptz;
BEGIN
  SELECT expires_at INTO expiry_date
  FROM public.user_plans
  WHERE user_id = auth.uid()
    AND is_active = true
    AND plan IN ('pro', 'premium');
  
  IF expiry_date IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN expiry_date <= (now() + interval '7 days');
END;
$$;

-- Create a function to auto-deactivate expired plans
CREATE OR REPLACE FUNCTION public.deactivate_expired_plans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_plans
  SET is_active = false
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND is_active = true;
END;
$$;