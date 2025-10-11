-- Add short_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN short_id TEXT UNIQUE;

-- Backfill existing profiles with short_id
UPDATE public.profiles 
SET short_id = UPPER(SUBSTRING(ENCODE(DIGEST(id::text, 'sha256'), 'hex') FROM 1 FOR 8))
WHERE short_id IS NULL;

-- Create trigger function to auto-generate short_id on profile insert
CREATE OR REPLACE FUNCTION public.set_profile_short_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := UPPER(SUBSTRING(ENCODE(DIGEST(NEW.id::text, 'sha256'), 'hex') FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating short_id
CREATE TRIGGER trg_set_profile_short_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_short_id();

-- Create user_plan_changes audit table
CREATE TABLE public.user_plan_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_plan TEXT NOT NULL,
  new_plan TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_plan_changes
ALTER TABLE public.user_plan_changes ENABLE ROW LEVEL SECURITY;

-- Only admins can view plan change history
CREATE POLICY "Admins can view plan changes"
ON public.user_plan_changes
FOR SELECT
USING (public.is_system_admin());

-- System can insert plan changes
CREATE POLICY "System can insert plan changes"
ON public.user_plan_changes
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_user_plan_changes_user_id ON public.user_plan_changes(user_id, changed_at DESC);

-- Create trigger function to normalize user plan
CREATE OR REPLACE FUNCTION public.normalize_user_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.plan := LOWER(TRIM(NEW.plan));
  RETURN NEW;
END;
$$;

-- Create trigger for normalizing plan on user_plans
CREATE TRIGGER trg_normalize_user_plan
BEFORE INSERT OR UPDATE ON public.user_plans
FOR EACH ROW
EXECUTE FUNCTION public.normalize_user_plan();