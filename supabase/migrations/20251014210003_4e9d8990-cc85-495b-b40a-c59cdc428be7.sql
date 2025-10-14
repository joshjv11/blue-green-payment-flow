-- Drop and recreate user_plan_view with all required columns
DROP VIEW IF EXISTS public.user_plan_view;

CREATE VIEW public.user_plan_view
WITH (security_invoker = true)
AS
SELECT 
  up.user_id,
  COALESCE(up.plan, 'free') as plan,
  COALESCE(up.is_active, true) as is_active,
  up.expires_at as valid_until,
  COALESCE(up.ai_queries_limit - up.ai_queries_used, 0) as credits_remaining,
  up.ai_queries_limit,
  up.ai_queries_used,
  up.ai_queries_reset_date,
  up.created_at,
  up.updated_at
FROM public.user_plans up
WHERE up.user_id = auth.uid();

-- Grant access to authenticated users
GRANT SELECT ON public.user_plan_view TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';