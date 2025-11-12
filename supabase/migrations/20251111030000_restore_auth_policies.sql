-- Ensure profiles table accepts self-service operations
DO $$
BEGIN
  PERFORM 1
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view their own profile';
  IF NOT FOUND THEN
    EXECUTE 'CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id)';
  END IF;

  PERFORM 1
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert their own profile';
  IF NOT FOUND THEN
    EXECUTE 'CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)';
  END IF;

  PERFORM 1
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update their own profile';
  IF NOT FOUND THEN
    EXECUTE 'CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
  END IF;

  PERFORM 1
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_plans' AND policyname = 'Users can view their own plan';
  IF NOT FOUND THEN
    EXECUTE 'CREATE POLICY "Users can view their own plan" ON public.user_plans FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;

  PERFORM 1
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_plans' AND policyname = 'Users can insert their own plan';
  IF NOT FOUND THEN
    EXECUTE 'CREATE POLICY "Users can insert their own plan" ON public.user_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;

  PERFORM 1
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_plans' AND policyname = 'Users can update their own plan';
  IF NOT FOUND THEN
    EXECUTE 'CREATE POLICY "Users can update their own plan" ON public.user_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;

  PERFORM 1
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'payment_transactions' AND policyname = 'Users can view their own payment transactions';
  IF NOT FOUND THEN
    EXECUTE 'CREATE POLICY "Users can view their own payment transactions" ON public.payment_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
END$$;

-- Recreate signup helper to seed profiles & plans
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  INSERT INTO public.user_plans (user_id, plan, ai_queries_used, ai_queries_limit, ai_queries_reset_date)
  VALUES (new.id, 'free', 0, 3, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill plans/profiles for existing auth users without records
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_plans (user_id, plan, ai_queries_used, ai_queries_limit, ai_queries_reset_date)
SELECT u.id, 'free', 0, 3, CURRENT_DATE
FROM auth.users u
LEFT JOIN public.user_plans up ON up.user_id = u.id
WHERE up.user_id IS NULL;
