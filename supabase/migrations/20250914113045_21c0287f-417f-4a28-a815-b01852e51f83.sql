-- Skip if admin_users already provisioned (avoids reapplying policies/functions)
DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    RAISE NOTICE 'admin_users already exists; skipping migration 20250914113045.';
    RETURN;
  END IF;

  -- Fix critical security vulnerability: Restrict payment transaction access to actual system administrators only
  -- Current issue: Any user with 'pro'/'enterprise' plan can view ALL payment transactions

  -- First, let's create a proper admin role system
  -- Create admin_users table to track actual system administrators
  CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin',
    granted_by UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- Enable RLS on admin_users
  ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

  -- Only existing admins can manage admin users
  DROP POLICY IF EXISTS "Only admins can manage admin users" ON public.admin_users;
  CREATE POLICY "Only admins can manage admin users"
  ON public.admin_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid()
    )
  );

  -- Create security definer function to check if user is actual admin
  CREATE OR REPLACE FUNCTION public.is_system_admin(p_user_id UUID DEFAULT auth.uid())
  RETURNS BOOLEAN
  LANGUAGE SQL
  SECURITY DEFINER
  STABLE
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = $1
    );
  $$;

  -- Drop the vulnerable existing policies on payment_transactions
  DROP POLICY IF EXISTS "Admins can view all payment transactions" ON public.payment_transactions;
  DROP POLICY IF EXISTS "Admins can update payment transactions" ON public.payment_transactions;

  -- Create secure policies that only allow actual system administrators
  DROP POLICY IF EXISTS "System admins can view all payment transactions" ON public.payment_transactions;
  CREATE POLICY "System admins can view all payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (public.is_system_admin());

  DROP POLICY IF EXISTS "System admins can update payment transactions" ON public.payment_transactions;
  CREATE POLICY "System admins can update payment transactions"
  ON public.payment_transactions
  FOR UPDATE
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

  -- Create policy for system admins to insert payment transactions (for manual entry if needed)
  DROP POLICY IF EXISTS "System admins can insert payment transactions" ON public.payment_transactions;
  CREATE POLICY "System admins can insert payment transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (public.is_system_admin());

  -- Update user_subscriptions table policies to use proper admin check
  DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;
  DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;

  DROP POLICY IF EXISTS "System admins can manage all subscriptions" ON public.user_subscriptions;
  CREATE POLICY "System admins can manage all subscriptions"
  ON public.user_subscriptions
  FOR ALL
  USING (public.is_system_admin());

  -- Create trigger to update updated_at column
  DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
  CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

  -- Insert initial system admin (replace with actual admin email)
  -- Note: This should be updated with the actual admin user ID after deployment
  INSERT INTO public.admin_users (user_id, role, granted_by)
  SELECT id, 'super_admin', id
  FROM auth.users 
  WHERE email = 'admin@invoicenudger.com'  -- Replace with actual admin email
  ON CONFLICT (user_id) DO NOTHING;
END
$$;