-- ============================================================
-- REMINDER SYSTEM SETUP (AUTO + MANUAL)
-- ============================================================

-- 1. CREATE AUTO-REMINDER TRIGGER FUNCTION
-- This automatically creates a reminder when a bill is inserted
CREATE OR REPLACE FUNCTION public.auto_create_bill_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_date_val DATE;
BEGIN
  -- Calculate reminder date (1 day before due, or same day if due today/tomorrow)
  IF NEW.due_date <= CURRENT_DATE + INTERVAL '1 day' THEN
    reminder_date_val := CURRENT_DATE;
  ELSE
    reminder_date_val := NEW.due_date - INTERVAL '1 day';
  END IF;

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
      GREATEST(1, EXTRACT(DAY FROM (NEW.due_date - reminder_date_val))),
      COALESCE(NEW.priority, 'medium'),
      'pending'
    )
    ON CONFLICT (bill_id, reminder_date) DO NOTHING; -- Prevent duplicates
  END IF;

  RETURN NEW;
END;
$$;

-- 2. CREATE TRIGGER ON BILLS INSERT
DROP TRIGGER IF EXISTS trigger_auto_create_bill_reminder ON public.bills;
CREATE TRIGGER trigger_auto_create_bill_reminder
  AFTER INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_bill_reminder();

-- 3. ENSURE BILL_REMINDERS TABLE HAS PROPER INDEXES
CREATE INDEX IF NOT EXISTS idx_bill_reminders_user_id ON public.bill_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_bill_id ON public.bill_reminders(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_reminder_date ON public.bill_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_status ON public.bill_reminders(status);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_pending_due ON public.bill_reminders(reminder_date, status) 
  WHERE status = 'pending';

-- 4. ADD UNIQUE CONSTRAINT TO PREVENT DUPLICATE REMINDERS
ALTER TABLE public.bill_reminders 
  DROP CONSTRAINT IF EXISTS unique_bill_reminder_per_date;

ALTER TABLE public.bill_reminders 
  ADD CONSTRAINT unique_bill_reminder_per_date 
  UNIQUE (bill_id, reminder_date);

-- 5. ENSURE RLS POLICIES ALLOW TRIGGER TO INSERT
-- Drop old policy if exists and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "System can create auto reminders" ON public.bill_reminders;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "System can create auto reminders"
  ON public.bill_reminders
  FOR INSERT
  WITH CHECK (true);

-- 6. ADD HELPER FUNCTION FOR MANUAL REMINDER SCHEDULING
CREATE OR REPLACE FUNCTION public.schedule_manual_reminder(
  p_bill_id UUID,
  p_days_before INT DEFAULT 1
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
BEGIN
  -- Get bill details
  SELECT * INTO v_bill_record
  FROM public.bills
  WHERE id = p_bill_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found or access denied';
  END IF;

  -- Calculate reminder date
  v_reminder_date := v_bill_record.due_date - (p_days_before || ' days')::INTERVAL;
  
  -- Ensure reminder date is not in the past
  IF v_reminder_date < CURRENT_DATE THEN
    v_reminder_date := CURRENT_DATE;
  END IF;

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
    p_days_before,
    v_bill_record.priority,
    'pending'
  )
  ON CONFLICT (bill_id, reminder_date) 
  DO UPDATE SET
    status = 'pending',
    priority = EXCLUDED.priority,
    updated_at = NOW()
  RETURNING id INTO v_reminder_id;

  RETURN v_reminder_id;
END;
$$;

-- 7. GRANT EXECUTE ON HELPER FUNCTION
GRANT EXECUTE ON FUNCTION public.schedule_manual_reminder TO authenticated;

COMMENT ON FUNCTION public.auto_create_bill_reminder() IS 
  'Automatically creates a reminder when a bill is inserted';
COMMENT ON FUNCTION public.schedule_manual_reminder(UUID, INT) IS 
  'Manually schedule a reminder for a bill with custom days_before';
COMMENT ON TRIGGER trigger_auto_create_bill_reminder ON public.bills IS 
  'Trigger to auto-create reminders for new bills';