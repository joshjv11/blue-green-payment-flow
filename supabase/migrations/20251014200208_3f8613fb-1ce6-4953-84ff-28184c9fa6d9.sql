-- Fix plan detection for logged-in users

-- 1. Ensure all users have a user_id in user_plans
UPDATE public.user_plans
SET user_id = id
WHERE user_id IS NULL AND id IN (SELECT id FROM auth.users);

-- 2. Drop and recreate user_plan_view with security_invoker
DROP VIEW IF EXISTS public.user_plan_view CASCADE;

CREATE VIEW public.user_plan_view
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  plan,
  is_active,
  expires_at as valid_until,
  (ai_queries_limit - ai_queries_used) as credits_remaining,
  ai_queries_limit,
  ai_queries_used
FROM public.user_plans
WHERE user_id = auth.uid();

-- 3. Ensure RLS on user_plans allows users to see their own plan
DROP POLICY IF EXISTS "Users can view their own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can select their own plan" ON public.user_plans;

CREATE POLICY "Users can select their own plan"
ON public.user_plans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Allow users to update their own plan (for AI query tracking)
DROP POLICY IF EXISTS "Users can update their own plan" ON public.user_plans;

CREATE POLICY "Users can update their own plan"
ON public.user_plans
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Create index for faster plan lookups
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_active ON public.user_plans(user_id, is_active) WHERE is_active = true;