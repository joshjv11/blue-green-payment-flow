-- Fix security warnings: Set search_path for functions to prevent SQL injection
-- Address linter warnings about mutable search_path

-- Update log_payment_access function with proper search_path
CREATE OR REPLACE FUNCTION public.log_payment_access(
  p_action TEXT,
  p_payment_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.payment_access_log (
    accessed_by,
    action,
    payment_transaction_id,
    notes
  ) VALUES (
    auth.uid(),
    p_action,
    p_payment_id,
    p_notes
  );
END;
$$;

-- Update require_payment_access_verification function with proper search_path
CREATE OR REPLACE FUNCTION public.require_payment_access_verification()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only system admins can access payment data
  IF NOT public.is_system_admin() THEN
    RETURN FALSE;
  END IF;
  
  -- Log the access attempt
  PERFORM public.log_payment_access('access_check');
  
  RETURN TRUE;
END;
$$;