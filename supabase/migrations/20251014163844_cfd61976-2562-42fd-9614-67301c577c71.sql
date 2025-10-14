-- Create daily bonus tracking table
CREATE TABLE public.daily_bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bonus_date DATE NOT NULL DEFAULT CURRENT_DATE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  reward_type TEXT NOT NULL,
  reward_value JSONB NOT NULL,
  streak_day INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bonus_date)
);

-- Create temporary unlocks table
CREATE TABLE public.temporary_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unlock_type TEXT NOT NULL,
  unlock_data JSONB NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collectibles table
CREATE TABLE public.user_collectibles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collectible_id TEXT NOT NULL,
  collectible_name TEXT NOT NULL,
  collectible_type TEXT NOT NULL,
  rarity TEXT NOT NULL,
  image_url TEXT,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, collectible_id)
);

-- Enable RLS
ALTER TABLE public.daily_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collectibles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_bonuses
CREATE POLICY "Users can view their own daily bonuses"
  ON public.daily_bonuses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily bonuses"
  ON public.daily_bonuses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily bonuses"
  ON public.daily_bonuses FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for temporary_unlocks
CREATE POLICY "Users can view their own temporary unlocks"
  ON public.temporary_unlocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own temporary unlocks"
  ON public.temporary_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own temporary unlocks"
  ON public.temporary_unlocks FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_collectibles
CREATE POLICY "Users can view their own collectibles"
  ON public.user_collectibles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collectibles"
  ON public.user_collectibles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_daily_bonuses_user_date ON public.daily_bonuses(user_id, bonus_date);
CREATE INDEX idx_temporary_unlocks_user_active ON public.temporary_unlocks(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_collectibles_user ON public.user_collectibles(user_id);

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