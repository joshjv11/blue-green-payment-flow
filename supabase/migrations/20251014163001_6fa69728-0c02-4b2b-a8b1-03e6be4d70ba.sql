-- ============================================
-- InvoiceFlow Gamification System
-- ============================================

-- User Rewards & XP Tracking
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_bills_paid INTEGER NOT NULL DEFAULT 0,
  early_payments INTEGER NOT NULL DEFAULT 0,
  on_time_payments INTEGER NOT NULL DEFAULT 0,
  late_payments INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- User Badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT,
  badge_tier TEXT CHECK (badge_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  xp_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, badge_id)
);

-- XP Transaction Log
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  description TEXT,
  related_bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_rewards
CREATE POLICY "Users can view their own rewards"
  ON public.user_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rewards"
  ON public.user_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards"
  ON public.user_rewards FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_badges
CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for xp_transactions
CREATE POLICY "Users can view their own XP transactions"
  ON public.xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP transactions"
  ON public.xp_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_rewards_user_id ON public.user_rewards(user_id);
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON public.xp_transactions(created_at DESC);

-- Function to calculate user level from XP
CREATE OR REPLACE FUNCTION public.calculate_user_level(xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Level formula: Level = floor(sqrt(XP / 100)) + 1
  -- Level 1: 0-99 XP, Level 2: 100-399 XP, Level 3: 400-899 XP, etc.
  RETURN GREATEST(1, FLOOR(SQRT(xp / 100.0)) + 1);
END;
$$;

-- Function to calculate tier from level
CREATE OR REPLACE FUNCTION public.calculate_user_tier(level INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF level >= 15 THEN RETURN 'diamond';
  ELSIF level >= 10 THEN RETURN 'platinum';
  ELSIF level >= 6 THEN RETURN 'gold';
  ELSIF level >= 3 THEN RETURN 'silver';
  ELSE RETURN 'bronze';
  END IF;
END;
$$;

-- Function to award XP and update rewards
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_action_type TEXT,
  p_xp_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_related_bill_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rewards RECORD;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_new_tier TEXT;
  v_old_level INTEGER;
  v_level_up BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  -- Get current rewards
  SELECT * INTO v_rewards
  FROM public.user_rewards
  WHERE user_id = p_user_id;
  
  -- Initialize if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO public.user_rewards (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_rewards;
  END IF;
  
  v_old_level := v_rewards.current_level;
  v_new_xp := v_rewards.total_xp + p_xp_amount;
  v_new_level := public.calculate_user_level(v_new_xp);
  v_new_tier := public.calculate_user_tier(v_new_level);
  v_level_up := v_new_level > v_old_level;
  
  -- Update rewards
  UPDATE public.user_rewards
  SET 
    total_xp = v_new_xp,
    current_level = v_new_level,
    tier = v_new_tier,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO public.xp_transactions (user_id, action_type, xp_amount, description, related_bill_id)
  VALUES (p_user_id, p_action_type, p_xp_amount, p_description, p_related_bill_id);
  
  -- Build result
  v_result := jsonb_build_object(
    'xp_awarded', p_xp_amount,
    'total_xp', v_new_xp,
    'new_level', v_new_level,
    'new_tier', v_new_tier,
    'level_up', v_level_up,
    'old_level', v_old_level
  );
  
  RETURN v_result;
END;
$$;

-- Trigger to automatically initialize user rewards on profile creation
CREATE OR REPLACE FUNCTION public.initialize_user_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_rewards (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER initialize_rewards_on_user_create
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_rewards();

-- Update timestamp trigger
CREATE TRIGGER update_user_rewards_timestamp
  BEFORE UPDATE ON public.user_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();