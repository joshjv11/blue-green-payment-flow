-- Backfill critical database infrastructure required by frontend features
-- This migration is idempotent and can be run safely multiple times.

-- Ensure pgcrypto is available for encryption/decryption helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared helper to keep updated_at timestamps current
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- expense_tracking_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_tracking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  monthly_income NUMERIC DEFAULT 0,
  daily_budget NUMERIC DEFAULT 0,
  budget_reset_date INTEGER DEFAULT 1 CHECK (budget_reset_date BETWEEN 1 AND 28),

  sms_permission_granted BOOLEAN DEFAULT FALSE,
  sms_auto_import_enabled BOOLEAN DEFAULT FALSE,
  detected_banks TEXT[] DEFAULT ARRAY[]::TEXT[],

  morning_summary_enabled BOOLEAN DEFAULT FALSE,
  morning_summary_time TEXT DEFAULT '09:00',
  mid_day_checkin_enabled BOOLEAN DEFAULT FALSE,
  mid_day_checkin_time TEXT DEFAULT '13:00',
  over_budget_alert_enabled BOOLEAN DEFAULT FALSE,
  end_of_day_report_enabled BOOLEAN DEFAULT FALSE,
  end_of_day_report_time TEXT DEFAULT '21:00',
  unusual_spending_alert_enabled BOOLEAN DEFAULT FALSE,
  recurring_bill_reminders_enabled BOOLEAN DEFAULT FALSE,
  weekly_insights_enabled BOOLEAN DEFAULT FALSE,

  ai_coach_enabled BOOLEAN DEFAULT FALSE,
  ai_coach_frequency TEXT DEFAULT 'weekly' CHECK (ai_coach_frequency IN ('daily','weekly','monthly')),
  ai_coach_style TEXT DEFAULT 'balanced' CHECK (ai_coach_style IN ('strict','balanced','casual')),
  ai_coach_focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],

  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step TEXT DEFAULT 'sms_permission' CHECK (onboarding_step IN ('sms_permission','bank_detection','income_setup','daily_budget','completed')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_tracking_settings_user_id
  ON public.expense_tracking_settings(user_id);

ALTER TABLE public.expense_tracking_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expense tracking settings" ON public.expense_tracking_settings;
DROP POLICY IF EXISTS "Users can insert expense tracking settings" ON public.expense_tracking_settings;
DROP POLICY IF EXISTS "Users can update expense tracking settings" ON public.expense_tracking_settings;

CREATE POLICY "Users can view expense tracking settings"
  ON public.expense_tracking_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert expense tracking settings"
  ON public.expense_tracking_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update expense tracking settings"
  ON public.expense_tracking_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_expense_tracking_settings_updated_at ON public.expense_tracking_settings;
CREATE TRIGGER trg_expense_tracking_settings_updated_at
  BEFORE UPDATE ON public.expense_tracking_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- user_feature_usage (behaviour analytics)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('view','click','submit','export','create','send')),
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_feature_usage_user
  ON public.user_feature_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feature_usage_feature
  ON public.user_feature_usage(feature_name, created_at DESC);

ALTER TABLE public.user_feature_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert feature usage" ON public.user_feature_usage;
DROP POLICY IF EXISTS "Users can view feature usage" ON public.user_feature_usage;
DROP POLICY IF EXISTS "Admins can view all feature usage" ON public.user_feature_usage;

CREATE POLICY "Users can insert feature usage"
  ON public.user_feature_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view feature usage"
  ON public.user_feature_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feature usage"
  ON public.user_feature_usage
  FOR SELECT
  USING (public.is_system_admin());

-- ---------------------------------------------------------------------------
-- security_events (abuse / monitoring)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'failed_login','rate_limit_hit','suspicious_api_call','payment_fraud_attempt','unauthorized_access','abnormal_activity'
  )),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at
  ON public.security_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_user
  ON public.security_events(user_id, created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert security events" ON public.security_events;
DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;

CREATE POLICY "Users can insert security events"
  ON public.security_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view security events"
  ON public.security_events
  FOR SELECT
  USING (public.is_system_admin());

-- ---------------------------------------------------------------------------
-- itc_mismatch_alerts (GST reconciliation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itc_mismatch_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gstin TEXT NOT NULL,
  invoice_number TEXT,
  vendor_name TEXT,
  mismatch_type TEXT NOT NULL,
  difference_amount NUMERIC DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itc_mismatch_alerts_user
  ON public.itc_mismatch_alerts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_itc_mismatch_alerts_resolved
  ON public.itc_mismatch_alerts(is_resolved, created_at DESC);

ALTER TABLE public.itc_mismatch_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ITC mismatch alerts" ON public.itc_mismatch_alerts;
DROP POLICY IF EXISTS "Users can insert ITC mismatch alerts" ON public.itc_mismatch_alerts;
DROP POLICY IF EXISTS "Users can update ITC mismatch alerts" ON public.itc_mismatch_alerts;

CREATE POLICY "Users can view ITC mismatch alerts"
  ON public.itc_mismatch_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert ITC mismatch alerts"
  ON public.itc_mismatch_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update ITC mismatch alerts"
  ON public.itc_mismatch_alerts
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_itc_mismatch_alerts_updated_at ON public.itc_mismatch_alerts;
CREATE TRIGGER trg_itc_mismatch_alerts_updated_at
  BEFORE UPDATE ON public.itc_mismatch_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Ensure sales_orders has IRN column
-- ---------------------------------------------------------------------------
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS irn TEXT;

-- ---------------------------------------------------------------------------
-- Helper function for decrypting GSTN credentials
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrypt_gstn_password(
  encrypted_password TEXT,
  user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_suffix TEXT := current_setting('app.settings.encryption_key', true);
  key TEXT;
BEGIN
  IF encrypted_password IS NULL THEN
    RETURN NULL;
  END IF;

  key := user_id::text || 'GST_SALT_v1';
  IF secret_suffix IS NOT NULL AND secret_suffix <> '' THEN
    key := key || '_' || secret_suffix;
  END IF;

  RETURN pgp_sym_decrypt(decode(encrypted_password, 'base64'), key);
EXCEPTION WHEN others THEN
  RAISE WARNING 'decrypt_gstn_password failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrypt_gstn_password(TEXT, UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- KPI helper RPCs (lightweight implementations without analytics views)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sales_kpis(p_from DATE, p_to DATE)
RETURNS TABLE(
  orders INT,
  gmv NUMERIC,
  tax NUMERIC,
  avg_order_value NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*)::INT AS orders,
    COALESCE(SUM(grand_total), 0) AS gmv,
    COALESCE(SUM(tax_amount), 0) AS tax,
    CASE WHEN COUNT(*) > 0
         THEN COALESCE(SUM(grand_total), 0) / COUNT(*)
         ELSE 0 END AS avg_order_value
  FROM public.sales_orders
  WHERE user_id = auth.uid()
    AND transaction_date >= p_from
    AND transaction_date <= p_to;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_kpis(DATE, DATE) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_purchases_kpis(p_from DATE, p_to DATE)
RETURNS TABLE(
  bills INT,
  spend NUMERIC,
  tax NUMERIC,
  avg_bill_value NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*)::INT AS bills,
    COALESCE(SUM(grand_total), 0) AS spend,
    COALESCE(SUM(tax_amount), 0) AS tax,
    CASE WHEN COUNT(*) > 0
         THEN COALESCE(SUM(grand_total), 0) / COUNT(*)
         ELSE 0 END AS avg_bill_value
  FROM public.purchase_orders
  WHERE user_id = auth.uid()
    AND transaction_date >= p_from
    AND transaction_date <= p_to;
$$;

GRANT EXECUTE ON FUNCTION public.get_purchases_kpis(DATE, DATE) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_inventory_kpis()
RETURNS TABLE(
  total_skus INT,
  total_value NUMERIC,
  low_stock_count INT,
  critical_count INT,
  avg_turnover_days NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  RETURN QUERY
  WITH product_data AS (
    SELECT 
      id,
      name,
      COALESCE(stock_qty, 0) AS stock_qty,
      COALESCE(reorder_level, 0) AS reorder_level,
      COALESCE(purchase_price, 0) * COALESCE(stock_qty, 0) AS stock_value
    FROM public.products
    WHERE user_id = v_user
  ),
  recent_sales AS (
    SELECT
      COALESCE(ol.product_id, p.id) AS product_id,
      SUM(ol.quantity) AS qty
    FROM public.order_lines ol
    JOIN public.sales_orders so ON so.id = ol.order_id AND ol.order_type = 'sale'
    LEFT JOIN public.products p
      ON (p.id = ol.product_id)
      OR (p.user_id = so.user_id AND p.name = ol.product_name)
    WHERE so.user_id = v_user
      AND so.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY COALESCE(ol.product_id, p.id)
  )
  SELECT 
    COUNT(*)::INT AS total_skus,
    COALESCE(SUM(stock_value), 0) AS total_value,
    SUM(CASE WHEN stock_qty <= GREATEST(reorder_level, 0) THEN 1 ELSE 0 END)::INT AS low_stock_count,
    SUM(CASE WHEN stock_qty <= GREATEST(reorder_level * 0.5, 0) THEN 1 ELSE 0 END)::INT AS critical_count,
    COALESCE(AVG(
      CASE WHEN rs.qty IS NOT NULL AND rs.qty > 0 AND stock_qty > 0
           THEN 30.0 * stock_qty::NUMERIC / rs.qty
           ELSE NULL END
    ), 0) AS avg_turnover_days
  FROM product_data pd
  LEFT JOIN recent_sales rs ON rs.product_id = pd.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_kpis() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Admin system health summary
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_system_health()
RETURNS TABLE (
  errors_last_hour INT,
  avg_response_time_sec NUMERIC,
  db_size_mb NUMERIC,
  active_users_24h INT,
  whatsapp_failures_1h INT,
  stuck_payments INT,
  active_connections INT,
  total_connections INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_app_logs BOOLEAN := to_regclass('public.app_logs') IS NOT NULL;
  has_whatsapp BOOLEAN := to_regclass('public.whatsapp_messages') IS NOT NULL;
  has_payments BOOLEAN := to_regclass('public.payment_transactions') IS NOT NULL;
  active_conn INT := (SELECT COALESCE(numbackends, 0) FROM pg_stat_database WHERE datname = current_database());
  total_conn INT := (SELECT COALESCE(SUM(numbackends), 0) FROM pg_stat_database);
BEGIN
  RETURN QUERY
  SELECT
    CASE WHEN has_app_logs THEN (
      SELECT COUNT(*) FROM public.app_logs WHERE level = 'error' AND created_at >= now() - INTERVAL '1 hour'
    ) ELSE 0 END AS errors_last_hour,
    0::NUMERIC AS avg_response_time_sec,
    pg_database_size(current_database()) / 1024::NUMERIC / 1024::NUMERIC AS db_size_mb,
    CASE WHEN has_app_logs THEN (
      SELECT COUNT(DISTINCT user_id) FROM public.app_logs WHERE created_at >= now() - INTERVAL '24 hours' AND user_id IS NOT NULL
    ) ELSE 0 END AS active_users_24h,
    CASE WHEN has_whatsapp THEN (
      SELECT COUNT(*) FROM public.whatsapp_messages WHERE status = 'failed' AND created_at >= now() - INTERVAL '1 hour'
    ) ELSE 0 END AS whatsapp_failures_1h,
    CASE WHEN has_payments THEN (
      SELECT COUNT(*) FROM public.payment_transactions WHERE status = 'pending'
    ) ELSE 0 END AS stuck_payments,
    COALESCE(active_conn, 0) AS active_connections,
    COALESCE(total_conn, 0) AS total_connections;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_system_health() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Ensure admin_users table and is_system_admin helper exist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_system_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_system_admin(UUID) TO authenticated, service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage admin_users" ON public.admin_users;

CREATE POLICY "Admins manage admin_users"
  ON public.admin_users
  FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- ---------------------------------------------------------------------------
-- Create lightweight payment_transactions table if it is still missing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  provider TEXT,
  provider_payment_id TEXT,
  provider_signature TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payment_transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users insert own payment_transactions" ON public.payment_transactions;

CREATE POLICY "Users view own payment_transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own payment_transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System admins manage payment_transactions" ON public.payment_transactions;

CREATE POLICY "System admins manage payment_transactions"
  ON public.payment_transactions
  FOR ALL
  USING (public.is_system_admin());
