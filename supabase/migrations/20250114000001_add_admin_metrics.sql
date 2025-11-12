-- Admin CMS Observability - System Health View
-- This view provides real-time system health metrics for admin dashboard
DO $$
BEGIN
  IF to_regclass('public.app_logs') IS NOT NULL
     AND to_regclass('public.whatsapp_messages') IS NOT NULL
     AND to_regclass('public.payment_transactions') IS NOT NULL THEN
    EXECUTE $VIEW$
      CREATE OR REPLACE VIEW admin_system_health AS
      SELECT
        COALESCE((
          SELECT COUNT(*)
          FROM app_logs
          WHERE level = 'error'
            AND created_at > NOW() - INTERVAL '1 hour'
        ), 0) AS errors_last_hour,
        COALESCE((
          SELECT AVG(EXTRACT(EPOCH FROM (context->>'duration')::numeric))
          FROM app_logs
          WHERE event = 'api_call'
            AND context->>'duration' IS NOT NULL
            AND created_at > NOW() - INTERVAL '1 hour'
        ), 0) AS avg_response_time_sec,
        (SELECT pg_database_size(current_database())::numeric / 1024 / 1024) AS db_size_mb,
        COALESCE((
          SELECT COUNT(DISTINCT user_id)
          FROM app_logs
          WHERE created_at > NOW() - INTERVAL '24 hours'
            AND user_id IS NOT NULL
        ), 0) AS active_users_24h,
        COALESCE((
          SELECT COUNT(*)
          FROM whatsapp_messages
          WHERE status = 'failed'
            AND created_at > NOW() - INTERVAL '1 hour'
        ), 0) AS whatsapp_failures_1h,
        COALESCE((
          SELECT COUNT(*)
          FROM payment_transactions
          WHERE status = 'pending'
            AND created_at < NOW() - INTERVAL '1 hour'
        ), 0) AS stuck_payments,
        COALESCE((
          SELECT COUNT(*)
          FROM pg_stat_activity
          WHERE state = 'active'
            AND datname = current_database()
        ), 0) AS active_connections,
        COALESCE((
          SELECT COUNT(*)
          FROM pg_stat_activity
          WHERE datname = current_database()
        ), 0) AS total_connections;
    $VIEW$;
  ELSE
    EXECUTE $FALLBACK$
      CREATE OR REPLACE VIEW admin_system_health AS
      SELECT
        0::bigint AS errors_last_hour,
        0::numeric AS avg_response_time_sec,
        (SELECT pg_database_size(current_database())::numeric / 1024 / 1024) AS db_size_mb,
        0::bigint AS active_users_24h,
        0::bigint AS whatsapp_failures_1h,
        0::bigint AS stuck_payments,
        COALESCE((
          SELECT COUNT(*)
          FROM pg_stat_activity
          WHERE state = 'active'
            AND datname = current_database()
        ), 0) AS active_connections,
        COALESCE((
          SELECT COUNT(*)
          FROM pg_stat_activity
          WHERE datname = current_database()
        ), 0) AS total_connections;
    $FALLBACK$;
  END IF;
END;
$$;

-- Grant access to authenticated users (admins can access via get-all-users edge function)
-- Views are safe as they aggregate data, but we'll restrict via RLS if needed
COMMENT ON VIEW admin_system_health IS 'Real-time system health metrics for admin dashboard';

-- Create RPC function to fetch system health (more secure than direct view access)
CREATE OR REPLACE FUNCTION public.get_admin_system_health()
RETURNS TABLE (
  errors_last_hour INTEGER,
  avg_response_time_sec NUMERIC,
  db_size_mb NUMERIC,
  active_users_24h INTEGER,
  whatsapp_failures_1h INTEGER,
  stuck_payments INTEGER,
  active_connections INTEGER,
  total_connections INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can view system health';
  END IF;

  RETURN QUERY
  SELECT * FROM admin_system_health;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_system_health() TO authenticated;

COMMENT ON FUNCTION public.get_admin_system_health() IS 'Security definer function for admins to retrieve system health metrics';

-- ============================================
-- 2. Financial Metrics View
-- ============================================

DO $$
BEGIN
  IF to_regclass('public.payment_transactions') IS NOT NULL
     AND to_regclass('public.user_plans') IS NOT NULL
     AND to_regclass('public.app_logs') IS NOT NULL THEN
    EXECUTE $VIEW$
      CREATE OR REPLACE VIEW admin_financial_metrics AS
      SELECT
        COUNT(DISTINCT user_id) AS total_paying_users,
        COALESCE(SUM(amount), 0) AS total_revenue,
        COALESCE(AVG(amount), 0) AS avg_payment_amount,
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE status = 'verified')::numeric / COUNT(*) * 100)
        END AS payment_success_rate,
        (SELECT COUNT(*) FROM user_plans WHERE plan = 'pro' AND is_active = true) AS pro_users,
        (SELECT COUNT(*) FROM user_plans WHERE plan = 'premium' AND is_active = true) AS premium_users,
        (SELECT COUNT(*) FROM user_plans WHERE plan = 'free' OR plan IS NULL) AS free_users,
        COALESCE((
          SELECT COUNT(DISTINCT user_id)
          FROM app_logs
          WHERE user_id IS NOT NULL
            AND created_at < NOW() - INTERVAL '30 days'
            AND user_id NOT IN (
              SELECT DISTINCT user_id
              FROM app_logs
              WHERE created_at > NOW() - INTERVAL '30 days'
            )
        ), 0) AS inactive_users_30d,
        COALESCE((
          SELECT SUM(
            CASE
              WHEN plan = 'pro' THEN 100
              WHEN plan = 'premium' THEN 999
              ELSE 0
            END
          )
          FROM user_plans
          WHERE is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
        ), 0) AS estimated_mrr,
        COALESCE((
          SELECT SUM(amount)
          FROM payment_transactions
          WHERE status = 'verified'
            AND created_at >= date_trunc('month', CURRENT_DATE)
        ), 0) AS revenue_this_month,
        COALESCE((
          SELECT SUM(amount)
          FROM payment_transactions
          WHERE status = 'verified'
            AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
            AND created_at < date_trunc('month', CURRENT_DATE)
        ), 0) AS revenue_last_month
      FROM payment_transactions
      WHERE created_at > NOW() - INTERVAL '30 days';
    $VIEW$;
  ELSE
    EXECUTE $FALLBACK$
      CREATE OR REPLACE VIEW admin_financial_metrics AS
      SELECT
        0::bigint AS total_paying_users,
        0::numeric AS total_revenue,
        0::numeric AS avg_payment_amount,
        0::numeric AS payment_success_rate,
        0::bigint AS pro_users,
        0::bigint AS premium_users,
        0::bigint AS free_users,
        0::bigint AS inactive_users_30d,
        0::numeric AS estimated_mrr,
        0::numeric AS revenue_this_month,
        0::numeric AS revenue_last_month;
    $FALLBACK$;
  END IF;
END;
$$;

COMMENT ON VIEW admin_financial_metrics IS 'Financial metrics for admin dashboard (30-day window)';

-- Create RPC function to fetch financial metrics
CREATE OR REPLACE FUNCTION public.get_admin_financial_metrics()
RETURNS TABLE (
  total_paying_users BIGINT,
  total_revenue NUMERIC,
  avg_payment_amount NUMERIC,
  payment_success_rate NUMERIC,
  pro_users BIGINT,
  premium_users BIGINT,
  free_users BIGINT,
  inactive_users_30d BIGINT,
  estimated_mrr NUMERIC,
  revenue_this_month NUMERIC,
  revenue_last_month NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can view financial metrics';
  END IF;

  RETURN QUERY
  SELECT * FROM admin_financial_metrics;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_admin_financial_metrics() TO authenticated;

COMMENT ON FUNCTION public.get_admin_financial_metrics() IS 'Security definer function for admins to retrieve financial metrics';

-- ============================================
-- 3. Feature Usage Tracking Table
-- ============================================

CREATE TABLE IF NOT EXISTS user_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  action_type TEXT CHECK (action_type IN ('view', 'click', 'submit', 'export', 'create', 'send')),
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON user_feature_usage(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON user_feature_usage(feature_name, created_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_created_at ON user_feature_usage(created_at DESC);

-- Enable RLS
ALTER TABLE user_feature_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.ensure_policy(
  p_name text,
  p_table text,
  p_cmd text,
  p_using text,
  p_check text,
  p_role text DEFAULT 'authenticated'
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cmd text := upper(p_cmd);
  using_clause text := '';
  check_clause text := '';
  effective_check text := p_check;
  effective_using text := p_using;
BEGIN
  IF cmd = 'INSERT' THEN
    IF effective_check IS NULL THEN
      effective_check := COALESCE(effective_using, 'TRUE');
    END IF;
    effective_using := NULL;
  ELSE
    IF effective_using IS NULL THEN
      effective_using := 'TRUE';
    END IF;
  END IF;

  IF effective_using IS NOT NULL THEN
    using_clause := format(' USING (%s)', effective_using);
  END IF;

  IF effective_check IS NOT NULL THEN
    check_clause := format(' WITH CHECK (%s)', effective_check);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = p_name AND tablename = p_table
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR %s TO %I%s%s',
      p_name,
      p_table,
      cmd,
      p_role,
      using_clause,
      check_clause
    );
  END IF;
END;
$$;

-- RLS Policies
SELECT public.ensure_policy(
  'Users can insert their own feature usage',
  'user_feature_usage',
  'INSERT',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can view their own feature usage',
  'user_feature_usage',
  'SELECT',
  'auth.uid() = user_id',
  NULL
);

SELECT public.ensure_policy(
  'Admins can view all feature usage',
  'user_feature_usage',
  'SELECT',
  'public.is_system_admin()',
  NULL
);

COMMENT ON TABLE user_feature_usage IS 'Tracks user feature usage for analytics and optimization';

-- Function to get feature usage stats (last 7 days)
CREATE OR REPLACE FUNCTION public.get_feature_usage_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  feature_name TEXT,
  usage_count BIGINT,
  unique_users BIGINT,
  last_used TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can view feature usage stats';
  END IF;

  RETURN QUERY
  SELECT 
    ufu.feature_name,
    COUNT(*) as usage_count,
    COUNT(DISTINCT ufu.user_id) as unique_users,
    MAX(ufu.created_at) as last_used
  FROM user_feature_usage ufu
  WHERE ufu.created_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY ufu.feature_name
  ORDER BY usage_count DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_feature_usage_stats(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_feature_usage_stats(INTEGER) IS 'Get feature usage statistics for admin dashboard';

-- ============================================
-- 4. Security Events Table
-- ============================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('failed_login', 'rate_limit_hit', 'suspicious_api_call', 'payment_fraud_attempt', 'unauthorized_access', 'abnormal_activity')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
SELECT public.ensure_policy(
  'Users can insert security events for themselves',
  'security_events',
  'INSERT',
  'auth.uid() = user_id OR user_id IS NULL',
  'auth.uid() = user_id OR user_id IS NULL'
);

SELECT public.ensure_policy(
  'Admins can view all security events',
  'security_events',
  'SELECT',
  'public.is_system_admin()',
  NULL
);

COMMENT ON TABLE security_events IS 'Tracks security events and abuse detection';

-- Function to get security events (last 24 hours)
CREATE OR REPLACE FUNCTION public.get_security_events(
  p_severity TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  user_id UUID,
  ip_address INET,
  severity TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can view security events';
  END IF;

  RETURN QUERY
  SELECT 
    se.id,
    se.event_type,
    se.user_id,
    se.ip_address,
    se.severity,
    se.created_at,
    se.metadata
  FROM security_events se
  WHERE se.created_at > NOW() - INTERVAL '24 hours'
    AND (p_severity IS NULL OR se.severity = p_severity)
  ORDER BY se.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_security_events(TEXT, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_security_events(TEXT, INTEGER) IS 'Get security events for admin dashboard (last 24 hours)';

DROP FUNCTION IF EXISTS public.ensure_policy(text, text, text, text, text, text);

-- ============================================
-- 5. User Insights View (Predictive Analytics)
-- ============================================

DO $$
BEGIN
  IF to_regclass('public.app_logs') IS NOT NULL
     AND to_regclass('public.whatsapp_messages') IS NOT NULL
     AND to_regclass('public.invoices') IS NOT NULL
     AND to_regclass('public.bills') IS NOT NULL THEN
    EXECUTE $VIEW$
      CREATE OR REPLACE VIEW admin_user_insights AS
      SELECT
        p.id AS user_id,
        p.email,
        up.plan,
        up.is_active AS plan_active,
        LEAST(100, (
          COALESCE((
            SELECT COUNT(*)
            FROM app_logs
            WHERE user_id = p.id
              AND created_at > NOW() - INTERVAL '7 days'
          ), 0) * 2 +
          COALESCE((
            SELECT COUNT(*)
            FROM whatsapp_messages
            WHERE user_id = p.id
              AND created_at > NOW() - INTERVAL '7 days'
          ), 0) * 5 +
          COALESCE((
            SELECT COUNT(*)
            FROM invoices
            WHERE user_id = p.id
              AND created_at > NOW() - INTERVAL '7 days'
          ), 0) * 3 +
          COALESCE((
            SELECT COUNT(*)
            FROM bills
            WHERE user_id = p.id
              AND created_at > NOW() - INTERVAL '7 days'
          ), 0) * 2
        )) AS engagement_score,
        CASE
          WHEN (SELECT MAX(created_at) FROM app_logs WHERE user_id = p.id) IS NULL THEN 90
          WHEN (SELECT MAX(created_at) FROM app_logs WHERE user_id = p.id) < NOW() - INTERVAL '30 days' THEN 90
          WHEN (SELECT MAX(created_at) FROM app_logs WHERE user_id = p.id) < NOW() - INTERVAL '14 days' THEN 60
          WHEN (SELECT MAX(created_at) FROM app_logs WHERE user_id = p.id) < NOW() - INTERVAL '7 days' THEN 30
          ELSE 10
        END AS churn_risk_score,
        CASE
          WHEN (up.plan = 'free' OR up.plan IS NULL)
           AND (
             (SELECT COUNT(*) FROM whatsapp_messages WHERE user_id = p.id) > 50
             OR (SELECT COUNT(*) FROM bills WHERE user_id = p.id) > 20
             OR (SELECT COUNT(*) FROM invoices WHERE user_id = p.id) > 10
           )
          THEN true
          ELSE false
        END AS upsell_candidate,
        (SELECT MAX(created_at) FROM app_logs WHERE user_id = p.id) AS last_activity,
        COALESCE((SELECT COUNT(*) FROM bills WHERE user_id = p.id), 0) AS total_bills,
        COALESCE((SELECT COUNT(*) FROM invoices WHERE user_id = p.id), 0) AS total_invoices,
        COALESCE((SELECT COUNT(*) FROM whatsapp_messages WHERE user_id = p.id), 0) AS total_whatsapp_messages,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(p.created_at, NOW()))) / 86400 AS account_age_days
      FROM profiles p
      LEFT JOIN user_plans up ON up.user_id = p.id;
    $VIEW$;
  ELSE
    EXECUTE $FALLBACK$
      CREATE OR REPLACE VIEW admin_user_insights AS
      SELECT
        p.id AS user_id,
        p.email,
        up.plan,
        up.is_active AS plan_active,
        0::integer AS engagement_score,
        50::integer AS churn_risk_score,
        false AS upsell_candidate,
        NULL::timestamptz AS last_activity,
        0::bigint AS total_bills,
        0::bigint AS total_invoices,
        0::bigint AS total_whatsapp_messages,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(p.created_at, NOW()))) / 86400 AS account_age_days
      FROM profiles p
      LEFT JOIN user_plans up ON up.user_id = p.id;
    $FALLBACK$;
  END IF;
END;
$$;

COMMENT ON VIEW admin_user_insights IS 'Predictive analytics for user engagement, churn risk, and upsell opportunities';

-- Create RPC function to fetch user insights
CREATE OR REPLACE FUNCTION public.get_admin_user_insights(
  p_sort_by TEXT DEFAULT 'churn_risk_score',
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  plan TEXT,
  plan_active BOOLEAN,
  engagement_score INTEGER,
  churn_risk_score INTEGER,
  upsell_candidate BOOLEAN,
  last_activity TIMESTAMPTZ,
  total_bills BIGINT,
  total_invoices BIGINT,
  total_whatsapp_messages BIGINT,
  account_age_days NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can view user insights';
  END IF;

  RETURN QUERY
  SELECT 
    ui.user_id,
    ui.email,
    ui.plan,
    ui.plan_active,
    ui.engagement_score,
    ui.churn_risk_score,
    ui.upsell_candidate,
    ui.last_activity,
    ui.total_bills,
    ui.total_invoices,
    ui.total_whatsapp_messages,
    ui.account_age_days
  FROM admin_user_insights ui
  ORDER BY 
    CASE p_sort_by
      WHEN 'churn_risk_score' THEN ui.churn_risk_score
      WHEN 'engagement_score' THEN ui.engagement_score
      WHEN 'upsell_candidate' THEN CASE WHEN ui.upsell_candidate THEN 1 ELSE 0 END
      WHEN 'last_activity' THEN EXTRACT(EPOCH FROM COALESCE(ui.last_activity, '1970-01-01'::timestamptz))
      ELSE ui.churn_risk_score
    END DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_admin_user_insights(TEXT, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_admin_user_insights(TEXT, INTEGER) IS 'Get user insights with sorting and filtering for admin dashboard';

