-- Enable admin access to user_plans table while maintaining user security
-- Uses existing is_system_admin() function which checks the admin_users table

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Users can view their own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can update their own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can insert their own plan" ON public.user_plans;

-- Create comprehensive admin + user policies
CREATE POLICY "Users and admins can view plans"
ON public.user_plans
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_system_admin()
);

CREATE POLICY "Users and admins can update plans"
ON public.user_plans
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.is_system_admin()
)
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_system_admin()
);

CREATE POLICY "Users and admins can insert plans"
ON public.user_plans
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_system_admin()
);

CREATE POLICY "Admins can delete plans"
ON public.user_plans
FOR DELETE
USING (public.is_system_admin());

-- Add helpful comments
COMMENT ON TABLE public.user_plans IS 'User subscription plans with admin override access';
COMMENT ON COLUMN public.user_plans.plan IS 'Plan tier: free, pro, or premium';
COMMENT ON COLUMN public.user_plans.is_active IS 'Whether the plan is currently active';
COMMENT ON COLUMN public.user_plans.expires_at IS 'Plan expiration date (null for free plans)';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';