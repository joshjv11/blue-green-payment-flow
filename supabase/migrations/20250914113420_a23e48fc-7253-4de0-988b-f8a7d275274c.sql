-- Enhanced security for payment transactions to prevent data theft
-- Address security finding: Customer Payment Data Could Be Stolen by Hackers

-- Create audit log table for payment data access
CREATE TABLE IF NOT EXISTS public.payment_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_by UUID NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  action TEXT NOT NULL, -- 'view', 'update', 'export'
  payment_transaction_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.payment_access_log ENABLE ROW LEVEL SECURITY;

-- Only system admins can view audit logs
CREATE POLICY "System admins can view payment access logs"
ON public.payment_access_log
FOR SELECT
USING (public.is_system_admin());

-- System can insert audit logs (for tracking)
CREATE POLICY "System can insert payment access logs"
ON public.payment_access_log
FOR INSERT
WITH CHECK (true);

-- Create function to log payment data access
CREATE OR REPLACE FUNCTION public.log_payment_access(
  p_action TEXT,
  p_payment_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add additional security checks for payment data access
-- Create function that requires elevated privileges for sensitive operations
CREATE OR REPLACE FUNCTION public.require_payment_access_verification()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_verification TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only system admins can access payment data
  IF NOT public.is_system_admin() THEN
    RETURN FALSE;
  END IF;
  
  -- Log the access attempt
  PERFORM public.log_payment_access('verification_check');
  
  RETURN TRUE;
END;
$$;

-- Update payment_transactions policies with enhanced security
DROP POLICY IF EXISTS "System admins can view all payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "System admins can update payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "System admins can insert payment transactions" ON public.payment_transactions;

-- Enhanced policies that log access and require verification
CREATE POLICY "System admins can view payment transactions with logging"
ON public.payment_transactions
FOR SELECT
USING (
  public.require_payment_access_verification() = TRUE
);

CREATE POLICY "System admins can update payment transactions with audit"
ON public.payment_transactions
FOR UPDATE
USING (
  public.require_payment_access_verification() = TRUE
)
WITH CHECK (
  public.require_payment_access_verification() = TRUE
);

CREATE POLICY "System admins can insert payment transactions with audit"
ON public.payment_transactions
FOR INSERT
WITH CHECK (
  public.require_payment_access_verification() = TRUE
);

-- Improve admin user creation security
-- Add approval workflow for new admins
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Update admin_users policy to be more restrictive
DROP POLICY IF EXISTS "Only admins can manage admin users" ON public.admin_users;

-- Only existing approved admins can view admin users
CREATE POLICY "Approved admins can view admin users"
ON public.admin_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND status = 'approved'
  )
);

-- Only existing approved admins can create new admin users (but they start as pending)
CREATE POLICY "Approved admins can create pending admin users"
ON public.admin_users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND status = 'approved'
  )
  AND NEW.status = 'pending'
);

-- Only super admins can approve new admin users
CREATE POLICY "Super admins can approve admin users"
ON public.admin_users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND status = 'approved' AND role = 'super_admin'
  )
);

-- Update the is_system_admin function to check for approved status
CREATE OR REPLACE FUNCTION public.is_system_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = $1 AND status = 'approved'
  );
$$;

-- Update existing admin users to approved status
UPDATE public.admin_users SET status = 'approved' WHERE status IS NULL OR status = 'pending';

-- Create trigger to update updated_at on admin_users
CREATE OR REPLACE FUNCTION public.notify_admin_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log admin user creation
  INSERT INTO public.payment_access_log (
    accessed_by,
    action,
    notes
  ) VALUES (
    COALESCE(NEW.granted_by, auth.uid()),
    'admin_user_created',
    'New admin user created: ' || COALESCE(NEW.role, 'admin') || ' status: ' || COALESCE(NEW.status, 'pending')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER admin_creation_audit
  AFTER INSERT ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_creation();