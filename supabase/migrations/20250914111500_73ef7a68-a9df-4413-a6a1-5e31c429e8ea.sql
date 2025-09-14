-- Create a test user plan to verify policies work
-- Use security definer function to bypass RLS for creation
CREATE OR REPLACE FUNCTION public.create_default_user_plan(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (
    user_id, 
    plan, 
    ai_queries_used, 
    ai_queries_limit,
    ai_queries_reset_date
  )
  VALUES (
    _user_id,
    'free',
    0,
    3,
    CURRENT_DATE
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    ai_queries_used = EXCLUDED.ai_queries_used,
    ai_queries_limit = EXCLUDED.ai_queries_limit,
    ai_queries_reset_date = EXCLUDED.ai_queries_reset_date;
END;
$$;

-- Create user plans for any authenticated users that don't have them
DO $$
DECLARE
    profile_record RECORD;
BEGIN
    FOR profile_record IN SELECT id FROM public.profiles LOOP
        PERFORM public.create_default_user_plan(profile_record.id);
    END LOOP;
END $$;