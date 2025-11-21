-- ========================================
-- CREATE MISSING TABLES FOR NEW SUPABASE PROJECT
-- ========================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/sql/new
-- ========================================

-- =========================
-- USER PLANS
-- =========================
CREATE TABLE IF NOT EXISTS public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium', 'enterprise')),
  ai_queries_used INTEGER NOT NULL DEFAULT 0,
  ai_queries_limit INTEGER NOT NULL DEFAULT 3,
  ai_queries_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER set_user_plans_updated_at
BEFORE UPDATE ON public.user_plans
FOR EACH ROW
EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- RLS for user_plans
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_plans_select_own"
    ON public.user_plans FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_plans_modify_own"
    ON public.user_plans FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for user_plans
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON public.user_plans(user_id);

-- =========================
-- PAYMENT TRANSACTIONS
-- =========================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'verified')),
  payment_method TEXT,
  transaction_id TEXT,
  processed BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER set_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- RLS for payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "payment_transactions_select_own"
    ON public.payment_transactions FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "payment_transactions_modify_own"
    ON public.payment_transactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_processed ON public.payment_transactions(processed);

-- =========================
-- USER BADGES (optional - for gamification)
-- =========================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT,
  badge_tier TEXT,
  xp_earned INTEGER,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_badges_select_own"
    ON public.user_badges FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_badges_modify_own"
    ON public.user_badges FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for user_badges
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON public.user_badges(earned_at DESC);

-- =========================
-- USER REWARDS (optional - for rewards system)
-- =========================
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  total_bills_paid INTEGER DEFAULT 0,
  on_time_payments INTEGER DEFAULT 0,
  early_payments INTEGER DEFAULT 0,
  late_payments INTEGER DEFAULT 0,
  total_shields_used INTEGER DEFAULT 0,
  has_streak_insurance BOOLEAN DEFAULT false,
  last_activity_date DATE,
  last_streak_save_date DATE,
  streak_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER set_user_rewards_updated_at
BEFORE UPDATE ON public.user_rewards
FOR EACH ROW
EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- RLS for user_rewards
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_rewards_select_own"
    ON public.user_rewards FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_rewards_modify_own"
    ON public.user_rewards FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for user_rewards
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_tier ON public.user_rewards(tier);

-- =========================
-- HELPER FUNCTIONS
-- =========================

-- Create default user plan function (creates free plan for new users)
CREATE OR REPLACE FUNCTION public.create_default_user_plan(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (
    user_id, 
    plan, 
    ai_queries_used, 
    ai_queries_limit,
    ai_queries_reset_date,
    is_active,
    started_at
  )
  VALUES (
    _user_id,
    'free',
    0,
    3,
    CURRENT_DATE,
    true,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = COALESCE(EXCLUDED.plan, user_plans.plan),
    ai_queries_used = COALESCE(EXCLUDED.ai_queries_used, user_plans.ai_queries_used),
    ai_queries_limit = COALESCE(EXCLUDED.ai_queries_limit, user_plans.ai_queries_limit),
    ai_queries_reset_date = COALESCE(EXCLUDED.ai_queries_reset_date, user_plans.ai_queries_reset_date),
    is_active = COALESCE(EXCLUDED.is_active, user_plans.is_active),
    updated_at = now();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_default_user_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_user_plan(UUID) TO anon;

-- =========================
-- VERIFICATION
-- =========================
SELECT 
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = tablename) as column_count
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_plans', 'payment_transactions', 'user_badges', 'user_rewards')
ORDER BY tablename;

-- Verify function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_default_user_plan';

-- =========================
-- CREATE DEFAULT PLANS FOR EXISTING USERS
-- =========================
-- This creates default free plans for any users who don't have one yet
DO $$
DECLARE
    profile_record RECORD;
BEGIN
    FOR profile_record IN SELECT id FROM public.profiles LOOP
        -- Only create plan if user doesn't have one
        IF NOT EXISTS (
            SELECT 1 FROM public.user_plans WHERE user_id = profile_record.id
        ) THEN
            PERFORM public.create_default_user_plan(profile_record.id);
        END IF;
    END LOOP;
END $$;

