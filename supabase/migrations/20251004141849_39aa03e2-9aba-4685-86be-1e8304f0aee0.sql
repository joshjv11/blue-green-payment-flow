-- ============================================
-- A) ERROR/CLICK LOGGING SYSTEM
-- ============================================

-- Create app_logs table with comprehensive logging fields
CREATE TABLE public.app_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  event TEXT NOT NULL,
  route TEXT,
  component TEXT,
  action TEXT,
  message TEXT,
  error_name TEXT,
  error_message TEXT,
  stack TEXT,
  status_code INTEGER,
  user_agent TEXT,
  ip INET,
  request_id TEXT,
  context JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_app_logs_created_at ON public.app_logs(created_at DESC);
CREATE INDEX idx_app_logs_level ON public.app_logs(level);
CREATE INDEX idx_app_logs_user_id ON public.app_logs(user_id);
CREATE INDEX idx_app_logs_event ON public.app_logs(event);

-- Enable RLS
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can insert logs"
  ON public.app_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all logs"
  ON public.app_logs
  FOR SELECT
  TO authenticated
  USING (public.is_system_admin());

-- Security definer helper to fetch logs for admins
CREATE OR REPLACE FUNCTION public.admin_get_logs(
  p_level TEXT DEFAULT NULL,
  p_limit INT DEFAULT 200
)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  user_id UUID,
  level TEXT,
  event TEXT,
  route TEXT,
  component TEXT,
  action TEXT,
  message TEXT,
  error_name TEXT,
  error_message TEXT,
  stack TEXT,
  status_code INTEGER,
  context JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only admins can view logs';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.created_at,
    l.user_id,
    l.level,
    l.event,
    l.route,
    l.component,
    l.action,
    l.message,
    l.error_name,
    l.error_message,
    l.stack,
    l.status_code,
    l.context
  FROM public.app_logs l
  WHERE (p_level IS NULL OR l.level = p_level)
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON TABLE public.app_logs IS 'Client and server error/event logs for debugging and monitoring';
COMMENT ON FUNCTION public.admin_get_logs IS 'Security definer function for admins to retrieve application logs';

-- ============================================
-- B) FIX BILL REMINDERS PRIORITY CONSTRAINT
-- ============================================

-- Ensure bill_reminders.priority uses exact constraint values
DO $$ 
BEGIN
  -- Drop existing check constraint if it exists
  ALTER TABLE public.bill_reminders DROP CONSTRAINT IF EXISTS bill_reminders_priority_check;
  
  -- Add normalized check constraint
  ALTER TABLE public.bill_reminders 
    ADD CONSTRAINT bill_reminders_priority_check 
    CHECK (priority IN ('low', 'medium', 'high'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update auto_create_bill_reminder function to normalize priority
CREATE OR REPLACE FUNCTION public.auto_create_bill_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_date_val DATE;
  normalized_priority TEXT;
  normalized_days INTEGER;
BEGIN
  -- Calculate reminder date (1 day before due, or same day if due today/tomorrow)
  IF NEW.due_date <= CURRENT_DATE + INTERVAL '1 day' THEN
    reminder_date_val := CURRENT_DATE;
  ELSE
    reminder_date_val := NEW.due_date - INTERVAL '1 day';
  END IF;

  -- Normalize priority to match constraint ('low', 'medium', 'high')
  normalized_priority := COALESCE(LOWER(NEW.priority::TEXT), 'medium');
  normalized_priority := CASE
    WHEN normalized_priority LIKE 'low%' THEN 'low'
    WHEN normalized_priority LIKE 'high%' THEN 'high'
    ELSE 'medium'
  END;

  -- Normalize reminder_days_before to valid range (0-30)
  normalized_days := COALESCE(NEW.reminder_days_before, 1);
  normalized_days := GREATEST(0, LEAST(30, normalized_days));

  -- Only create reminder if auto_reminder_enabled is true (defaults to true)
  IF COALESCE(NEW.auto_reminder_enabled, true) THEN
    INSERT INTO public.bill_reminders (
      user_id,
      bill_id,
      reminder_date,
      reminder_days_before,
      priority,
      status
    ) VALUES (
      NEW.user_id,
      NEW.id,
      reminder_date_val,
      normalized_days,
      normalized_priority,
      'pending'
    )
    ON CONFLICT (bill_id, reminder_date) DO NOTHING; -- Prevent duplicates
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_bill_reminder() IS 
  'Automatically creates a normalized reminder when a bill is inserted. Priority normalized to low/medium/high.';

-- Update schedule_manual_reminder to also normalize priority
CREATE OR REPLACE FUNCTION public.schedule_manual_reminder(
  p_bill_id UUID,
  p_days_before INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminder_id UUID;
  v_bill_record RECORD;
  v_reminder_date DATE;
  normalized_priority TEXT;
  normalized_days INTEGER;
BEGIN
  -- Get bill details
  SELECT * INTO v_bill_record
  FROM public.bills
  WHERE id = p_bill_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found or access denied';
  END IF;

  -- Normalize reminder_days_before to valid range
  normalized_days := GREATEST(0, LEAST(30, p_days_before));
  
  -- Calculate reminder date
  v_reminder_date := v_bill_record.due_date - (normalized_days || ' days')::INTERVAL;
  
  -- Ensure reminder date is not in the past
  IF v_reminder_date < CURRENT_DATE THEN
    v_reminder_date := CURRENT_DATE;
  END IF;

  -- Normalize priority
  normalized_priority := COALESCE(LOWER(v_bill_record.priority::TEXT), 'medium');
  normalized_priority := CASE
    WHEN normalized_priority LIKE 'low%' THEN 'low'
    WHEN normalized_priority LIKE 'high%' THEN 'high'
    ELSE 'medium'
  END;

  -- Insert or update reminder
  INSERT INTO public.bill_reminders (
    user_id,
    bill_id,
    reminder_date,
    reminder_days_before,
    priority,
    status
  ) VALUES (
    auth.uid(),
    p_bill_id,
    v_reminder_date,
    normalized_days,
    normalized_priority,
    'pending'
  )
  ON CONFLICT (bill_id, reminder_date) 
  DO UPDATE SET
    status = 'pending',
    priority = EXCLUDED.priority,
    reminder_days_before = EXCLUDED.reminder_days_before,
    updated_at = NOW()
  RETURNING id INTO v_reminder_id;

  RETURN v_reminder_id;
END;
$$;

COMMENT ON FUNCTION public.schedule_manual_reminder IS 
  'Manually schedule a normalized reminder for a bill with custom days_before (0-30)';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_get_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_manual_reminder TO authenticated;