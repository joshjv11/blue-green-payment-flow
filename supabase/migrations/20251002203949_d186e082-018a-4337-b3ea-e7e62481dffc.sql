-- Add is_active field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create RPC function to set user active status (admin only)
CREATE OR REPLACE FUNCTION public.set_user_active_status(
  target_user_id UUID,
  active_status BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only system admins can change user status
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only admins can change user status';
  END IF;
  
  UPDATE public.profiles
  SET is_active = active_status,
      updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;

-- Create RPC function to get user stats
CREATE OR REPLACE FUNCTION public.get_user_stats(target_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  invoice_count BIGINT,
  bill_count BIGINT,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only system admins can view user stats
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only admins can view user stats';
  END IF;
  
  RETURN QUERY
  SELECT 
    target_user_id as user_id,
    (SELECT COUNT(*) FROM public.invoices WHERE user_id = target_user_id) as invoice_count,
    (SELECT COUNT(*) FROM public.bills WHERE user_id = target_user_id) as bill_count,
    (SELECT last_sign_in_at FROM auth.users WHERE id = target_user_id) as last_sign_in_at,
    (SELECT confirmed_at FROM auth.users WHERE id = target_user_id) as email_confirmed_at;
END;
$$;

-- Update RLS policies on profiles to allow admins to manage all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR public.is_system_admin()
);

CREATE POLICY "Users can update their own profile or admins can update all"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id 
  OR public.is_system_admin()
)
WITH CHECK (
  auth.uid() = id 
  OR public.is_system_admin()
);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.is_system_admin());