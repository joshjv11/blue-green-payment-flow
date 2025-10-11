-- Fix search_path for normalize_user_plan function
CREATE OR REPLACE FUNCTION public.normalize_user_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.plan := LOWER(TRIM(NEW.plan));
  RETURN NEW;
END;
$$;