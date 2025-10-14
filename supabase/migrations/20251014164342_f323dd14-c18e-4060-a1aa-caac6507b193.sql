-- Create streak shields table
CREATE TABLE public.streak_shields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shield_type TEXT NOT NULL, -- 'basic', 'premium', 'insurance'
  earned_method TEXT NOT NULL, -- 'activity', 'purchase', 'bonus', 'reward'
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create streak history table
CREATE TABLE public.streak_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  streak_length INTEGER NOT NULL,
  broke_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  was_protected BOOLEAN NOT NULL DEFAULT false,
  protection_method TEXT, -- 'shield', 'insurance', null
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add streak protection fields to user_rewards
ALTER TABLE public.user_rewards
ADD COLUMN last_streak_save_date DATE,
ADD COLUMN total_shields_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN has_streak_insurance BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN streak_expires_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.streak_shields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for streak_shields
CREATE POLICY "Users can view their own streak shields"
  ON public.streak_shields FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak shields"
  ON public.streak_shields FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak shields"
  ON public.streak_shields FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for streak_history
CREATE POLICY "Users can view their own streak history"
  ON public.streak_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak history"
  ON public.streak_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_streak_shields_user_active ON public.streak_shields(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_streak_history_user ON public.streak_history(user_id, created_at DESC);

-- Function to calculate streak expiration
CREATE OR REPLACE FUNCTION public.calculate_streak_expiration(p_last_activity_date DATE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Streak expires at end of day (23:59:59) after last activity
  RETURN (p_last_activity_date + INTERVAL '1 day' + INTERVAL '23 hours 59 minutes 59 seconds');
END;
$$;

-- Function to purchase streak shield with XP
CREATE OR REPLACE FUNCTION public.purchase_streak_shield(
  p_user_id UUID,
  p_shield_type TEXT,
  p_xp_cost INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_xp INTEGER;
  v_shield_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current XP
  SELECT total_xp INTO v_current_xp
  FROM public.user_rewards
  WHERE user_id = p_user_id;
  
  IF v_current_xp IS NULL OR v_current_xp < p_xp_cost THEN
    RAISE EXCEPTION 'Insufficient XP to purchase shield';
  END IF;
  
  -- Deduct XP
  UPDATE public.user_rewards
  SET total_xp = total_xp - p_xp_cost,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Set expiration based on type
  IF p_shield_type = 'basic' THEN
    v_expires_at := now() + INTERVAL '7 days';
  ELSIF p_shield_type = 'premium' THEN
    v_expires_at := now() + INTERVAL '30 days';
  ELSE -- insurance
    v_expires_at := now() + INTERVAL '365 days';
  END IF;
  
  -- Create shield
  INSERT INTO public.streak_shields (user_id, shield_type, earned_method, expires_at)
  VALUES (p_user_id, p_shield_type, 'purchase', v_expires_at)
  RETURNING id INTO v_shield_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'shield_id', v_shield_id,
    'remaining_xp', v_current_xp - p_xp_cost
  );
END;
$$;

-- Function to use streak shield
CREATE OR REPLACE FUNCTION public.use_streak_shield(
  p_user_id UUID,
  p_shield_type TEXT DEFAULT 'basic'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shield_id UUID;
  v_current_streak INTEGER;
BEGIN
  -- Find available shield
  SELECT id INTO v_shield_id
  FROM public.streak_shields
  WHERE user_id = p_user_id
    AND is_active = true
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND shield_type = p_shield_type
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_shield_id IS NULL THEN
    RAISE EXCEPTION 'No available % shield found', p_shield_type;
  END IF;
  
  -- Mark shield as used
  UPDATE public.streak_shields
  SET used_at = now(),
      is_active = false
  WHERE id = v_shield_id;
  
  -- Update user rewards
  UPDATE public.user_rewards
  SET total_shields_used = total_shields_used + 1,
      last_streak_save_date = CURRENT_DATE,
      streak_expires_at = public.calculate_streak_expiration(CURRENT_DATE),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING current_streak INTO v_current_streak;
  
  RETURN jsonb_build_object(
    'success', true,
    'shield_id', v_shield_id,
    'streak_saved', v_current_streak
  );
END;
$$;

-- Function to award streak shield
CREATE OR REPLACE FUNCTION public.award_streak_shield(
  p_user_id UUID,
  p_shield_type TEXT,
  p_earned_method TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shield_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set expiration
  IF p_shield_type = 'insurance' THEN
    v_expires_at := now() + INTERVAL '365 days';
  ELSE
    v_expires_at := now() + INTERVAL '30 days';
  END IF;
  
  -- Create shield
  INSERT INTO public.streak_shields (user_id, shield_type, earned_method, expires_at)
  VALUES (p_user_id, p_shield_type, p_earned_method, v_expires_at)
  RETURNING id INTO v_shield_id;
  
  RETURN v_shield_id;
END;
$$;