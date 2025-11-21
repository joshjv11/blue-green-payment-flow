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
-- TEMPORARY UNLOCKS (optional - for temporary feature access)
-- =========================
CREATE TABLE IF NOT EXISTS public.temporary_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlock_type TEXT NOT NULL,
  unlock_data JSONB NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for temporary_unlocks
ALTER TABLE public.temporary_unlocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "temporary_unlocks_select_own"
    ON public.temporary_unlocks FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "temporary_unlocks_modify_own"
    ON public.temporary_unlocks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for temporary_unlocks
CREATE INDEX IF NOT EXISTS idx_temporary_unlocks_user_id ON public.temporary_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_temporary_unlocks_expires_at ON public.temporary_unlocks(expires_at);
CREATE INDEX IF NOT EXISTS idx_temporary_unlocks_is_active ON public.temporary_unlocks(is_active);

-- =========================
-- STREAK SHIELDS (optional - for streak protection)
-- =========================
CREATE TABLE IF NOT EXISTS public.streak_shields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shield_type TEXT NOT NULL CHECK (shield_type IN ('basic', 'premium', 'insurance')),
  earned_method TEXT NOT NULL CHECK (earned_method IN ('activity', 'purchase', 'bonus', 'reward')),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for streak_shields
ALTER TABLE public.streak_shields ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "streak_shields_select_own"
    ON public.streak_shields FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "streak_shields_modify_own"
    ON public.streak_shields FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for streak_shields
CREATE INDEX IF NOT EXISTS idx_streak_shields_user_id ON public.streak_shields(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_shields_is_active ON public.streak_shields(is_active);
CREATE INDEX IF NOT EXISTS idx_streak_shields_used_at ON public.streak_shields(used_at);

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
-- DAILY BONUSES TABLE (optional - for daily reward system)
-- =========================
CREATE TABLE IF NOT EXISTS public.daily_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_date DATE NOT NULL DEFAULT CURRENT_DATE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  reward_type TEXT NOT NULL,
  reward_value JSONB NOT NULL,
  streak_day INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bonus_date)
);

-- RLS for daily_bonuses
ALTER TABLE public.daily_bonuses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "daily_bonuses_select_own"
    ON public.daily_bonuses FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "daily_bonuses_modify_own"
    ON public.daily_bonuses FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for daily_bonuses
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_user_date ON public.daily_bonuses(user_id, bonus_date);

-- =========================
-- DAILY BONUS FUNCTIONS
-- =========================

-- Function to check if user can claim daily bonus
CREATE OR REPLACE FUNCTION public.can_claim_daily_bonus(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_bonus RECORD;
BEGIN
  SELECT * INTO v_last_bonus
  FROM public.daily_bonuses
  WHERE user_id = p_user_id
    AND bonus_date = CURRENT_DATE;
  
  RETURN (NOT FOUND) OR (v_last_bonus.claimed_at IS NULL);
END;
$$;

-- Function to generate random reward
CREATE OR REPLACE FUNCTION public.generate_daily_reward()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward_type TEXT;
  v_reward_value JSONB;
  v_random INTEGER;
  v_theme_names TEXT[] := ARRAY['Cosmic', 'Neon', 'Vintage', 'Ocean', 'Forest'];
  v_theme_idx INTEGER;
BEGIN
  v_random := FLOOR(RANDOM() * 100)::INTEGER;
  
  IF v_random < 40 THEN
    v_reward_type := 'xp';
    v_reward_value := jsonb_build_object(
      'amount', 10 + FLOOR(RANDOM() * 91)::INTEGER,
      'multiplier', 1 + (RANDOM() * 0.5)
    );
  ELSIF v_random < 65 THEN
    v_reward_type := 'badge_boost';
    v_reward_value := jsonb_build_object(
      'boost_percentage', 10 + FLOOR(RANDOM() * 40)::INTEGER
    );
  ELSIF v_random < 85 THEN
    v_reward_type := 'premium_access';
    v_reward_value := jsonb_build_object(
      'duration_hours', (1 + FLOOR(RANDOM() * 7)::INTEGER) * 24,
      'features', jsonb_build_array('ai_unlimited', 'analytics', 'export')
    );
  ELSIF v_random < 95 THEN
    v_theme_idx := 1 + FLOOR(RANDOM() * 5)::INTEGER;
    v_reward_type := 'theme';
    v_reward_value := jsonb_build_object(
      'theme_id', 'special_' || FLOOR(RANDOM() * 10)::TEXT,
      'theme_name', v_theme_names[v_theme_idx],
      'duration_days', 7
    );
  ELSE
    v_reward_type := 'collectible';
    v_reward_value := jsonb_build_object(
      'rarity', CASE 
        WHEN RANDOM() < 0.6 THEN 'rare'
        WHEN RANDOM() < 0.9 THEN 'epic'
        ELSE 'legendary'
      END,
      'collectible_id', 'collectible_' || FLOOR(RANDOM() * 100)::TEXT
    );
  END IF;
  
  RETURN jsonb_build_object(
    'type', v_reward_type,
    'value', v_reward_value
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_claim_daily_bonus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_claim_daily_bonus(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_daily_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_reward() TO anon;

-- =========================
-- VERIFICATION
-- =========================
SELECT 
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = tablename) as column_count
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_plans', 'payment_transactions', 'user_badges', 'user_rewards', 'temporary_unlocks', 'streak_shields', 'daily_bonuses')
ORDER BY tablename;

-- Verify functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('create_default_user_plan', 'can_claim_daily_bonus', 'generate_daily_reward')
ORDER BY routine_name;

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

