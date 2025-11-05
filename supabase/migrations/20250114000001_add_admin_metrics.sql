-- Admin CMS Observability - System Health View
-- This view provides real-time system health metrics for admin dashboard

CREATE OR REPLACE VIEW admin_system_health AS
SELECT
  -- Edge Function Performance / Error Tracking
  COALESCE((
    SELECT COUNT(*) 
    FROM app_logs
    WHERE level = 'error'
    AND created_at > NOW() - INTERVAL '1 hour'
  ), 0) as errors_last_hour,

  -- Average Response Time (if duration is stored in context JSONB)
  COALESCE((
    SELECT AVG(EXTRACT(EPOCH FROM (context->>'duration')::numeric))
    FROM app_logs
    WHERE event = 'api_call'
    AND context->>'duration' IS NOT NULL
    AND created_at > NOW() - INTERVAL '1 hour'
  ), 0) as avg_response_time_sec,

  -- Database Size
  (SELECT pg_database_size(current_database())::numeric / 1024 / 1024) as db_size_mb,

  -- Active Users (last 24 hours)
  COALESCE((
    SELECT COUNT(DISTINCT user_id) 
    FROM app_logs
    WHERE created_at > NOW() - INTERVAL '24 hours'
    AND user_id IS NOT NULL
  ), 0) as active_users_24h,

  -- WhatsApp Failures (last 1 hour)
  COALESCE((
    SELECT COUNT(*) 
    FROM whatsapp_messages
    WHERE status = 'failed'
    AND created_at > NOW() - INTERVAL '1 hour'
  ), 0) as whatsapp_failures_1h,

  -- Stuck Payments (pending > 1 hour)
  COALESCE((
    SELECT COUNT(*) 
    FROM payment_transactions
    WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '1 hour'
  ), 0) as stuck_payments,

  -- Active Database Connections
  COALESCE((
    SELECT COUNT(*) 
    FROM pg_stat_activity
    WHERE state = 'active'
    AND datname = current_database()
  ), 0) as active_connections,

  -- Total Active Connections (including idle)
  COALESCE((
    SELECT COUNT(*) 
    FROM pg_stat_activity
    WHERE datname = current_database()
  ), 0) as total_connections;

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

CREATE OR REPLACE VIEW admin_financial_metrics AS
SELECT
  -- Revenue Metrics (last 30 days)
  COUNT(DISTINCT user_id) as total_paying_users,
  COALESCE(SUM(amount), 0) as total_revenue,
  COALESCE(AVG(amount), 0) as avg_payment_amount,
  
  -- Payment Success Rate
  CASE 
    WHEN COUNT(*) = 0 THEN 0
    ELSE (COUNT(*) FILTER (WHERE status = 'verified')::numeric / COUNT(*) * 100)
  END as payment_success_rate,
  
  -- Plan Distribution
  (SELECT COUNT(*) FROM user_plans WHERE plan = 'pro' AND is_active = true) as pro_users,
  (SELECT COUNT(*) FROM user_plans WHERE plan = 'premium' AND is_active = true) as premium_users,
  (SELECT COUNT(*) FROM user_plans WHERE plan = 'free' OR plan IS NULL) as free_users,
  
  -- Churn Risk (users who haven't logged in 30 days)
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
  ), 0) as inactive_users_30d,
  
  -- Monthly Recurring Revenue (MRR) estimate
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
  ), 0) as estimated_mrr,
  
  -- Revenue this month
  COALESCE((
    SELECT SUM(amount)
    FROM payment_transactions
    WHERE status = 'verified'
    AND created_at >= date_trunc('month', CURRENT_DATE)
  ), 0) as revenue_this_month,
  
  -- Revenue last month
  COALESCE((
    SELECT SUM(amount)
    FROM payment_transactions
    WHERE status = 'verified'
    AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    AND created_at < date_trunc('month', CURRENT_DATE)
  ), 0) as revenue_last_month
FROM payment_transactions
WHERE created_at > NOW() - INTERVAL '30 days';

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

-- RLS Policies
CREATE POLICY "Users can insert their own feature usage"
  ON user_feature_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feature usage"
  ON user_feature_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feature usage"
  ON user_feature_usage
  FOR SELECT
  TO authenticated
  USING (public.is_system_admin());

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
CREATE POLICY "Users can insert security events for themselves"
  ON security_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all security events"
  ON security_events
  FOR SELECT
  TO authenticated
  USING (public.is_system_admin());

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

-- ============================================
-- 5. User Insights View (Predictive Analytics)
-- ============================================

CREATE OR REPLACE VIEW admin_user_insights AS
SELECT
  p.id as user_id,
  p.email,
  up.plan,
  up.is_active as plan_active,
  
  -- Engagement Score (0-100)
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
  )) as engagement_score,
  
  -- Churn Risk (0-100, higher = more risk)
  CASE
    WHEN (SELECT MAX(created_at) FROM app_logs WHERE user_id = p.id) IS NULL THEN 90
    WHEN (SELECT MAX(created_at) FROM app_logs WHERE user_id = p.id) < NOW() - INTERVAL '30 days' THEN 90
    WHEN (SELECT MAX(created_at) FROM app_logs WHERE user_id = p.id) < NOW() - INTERVAL '14 days' THEN 60
    WHEN (SELECT MAX(created_at) FROM app_logs WHERE user_id = p.id) < NOW() - INTERVAL '7 days' THEN 30
    ELSE 10
  END as churn_risk_score,
  
  -- Upsell Potential (free users with high usage)
  CASE
    WHEN (up.plan = 'free' OR up.plan IS NULL)
    AND (
      (SELECT COUNT(*) FROM whatsapp_messages WHERE user_id = p.id) > 50
      OR (SELECT COUNT(*) FROM bills WHERE user_id = p.id) > 20
      OR (SELECT COUNT(*) FROM invoices WHERE user_id = p.id) > 10
    )
    THEN true
    ELSE false
  END as upsell_candidate,
  
  -- Last activity
  (SELECT MAX(created_at) FROM app_logs WHERE user_id = p.id) as last_activity,
  
  -- User stats
  COALESCE((SELECT COUNT(*) FROM bills WHERE user_id = p.id), 0) as total_bills,
  COALESCE((SELECT COUNT(*) FROM invoices WHERE user_id = p.id), 0) as total_invoices,
  COALESCE((SELECT COUNT(*) FROM whatsapp_messages WHERE user_id = p.id), 0) as total_whatsapp_messages,
  
  -- Account age
  EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400 as account_age_days
FROM profiles p
LEFT JOIN user_plans up ON up.user_id = p.id;

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

