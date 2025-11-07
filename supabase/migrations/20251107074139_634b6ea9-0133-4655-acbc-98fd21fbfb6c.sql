-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_reminder_settings JSONB DEFAULT '{"enabled": false, "reminder_days": [3, 1, 0]}'::jsonb;

-- Create gstn_credentials table for storing GSTN API credentials
CREATE TABLE IF NOT EXISTS gstn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gstin TEXT NOT NULL,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  api_endpoint TEXT NOT NULL DEFAULT 'https://api.mastergst.com/gst',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, gstin)
);

-- Create einvoice_queue table for bulk E-Invoice processing
CREATE TABLE IF NOT EXISTS einvoice_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_message TEXT,
  irn TEXT,
  ack_no TEXT,
  ack_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(sales_order_id)
);

-- Enable RLS on new tables
ALTER TABLE gstn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE einvoice_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for gstn_credentials
CREATE POLICY "Users manage own GSTN credentials" ON gstn_credentials
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for einvoice_queue
CREATE POLICY "Users view own e-invoice queue" ON einvoice_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage e-invoice queue" ON einvoice_queue
  FOR ALL USING (true);

-- Create missing RPC functions for Admin CMS
CREATE OR REPLACE FUNCTION get_feature_usage_stats()
RETURNS TABLE(feature TEXT, usage_count BIGINT, last_used TIMESTAMPTZ) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    event as feature, 
    COUNT(*)::BIGINT as usage_count, 
    MAX(created_at) as last_used
  FROM app_logs
  WHERE level = 'info' AND event IN ('dashboard_view', 'whatsapp_send', 'payment_created', 'gstr_filing')
  GROUP BY event
  ORDER BY usage_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_security_events()
RETURNS TABLE(
  event_type TEXT, 
  user_id UUID, 
  created_at TIMESTAMPTZ, 
  details JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN level = 'error' THEN 'ERROR'
      WHEN error_name = 'RateLimitError' THEN 'RATE_LIMIT'
      WHEN error_name IS NOT NULL THEN 'EXCEPTION'
      ELSE 'WARNING'
    END as event_type,
    app_logs.user_id,
    app_logs.created_at,
    context as details
  FROM app_logs
  WHERE level IN ('error', 'warn')
  ORDER BY created_at DESC
  LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_user_insights()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  plan TEXT,
  total_bills BIGINT,
  total_invoices BIGINT,
  last_active TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    COALESCE(up.plan, 'free') as plan,
    (SELECT COUNT(*) FROM bills WHERE bills.user_id = p.id)::BIGINT as total_bills,
    (SELECT COUNT(*) FROM sales_orders WHERE sales_orders.user_id = p.id)::BIGINT as total_invoices,
    (SELECT MAX(created_at) FROM app_logs WHERE app_logs.user_id = p.id) as last_active
  FROM profiles p
  LEFT JOIN user_plans up ON up.user_id = p.id
  WHERE p.is_active = true
  ORDER BY last_active DESC NULLS LAST
  LIMIT 100;
END;
$$;