-- ==========================================
-- Pro Plan Features for Mumbai Commuters
-- Database schema for bill reminders, savings goals, EMI tracking
-- ==========================================

-- WhatsApp Bill Reminders (using FREE wa.me links)
CREATE TABLE IF NOT EXISTS public.whatsapp_bill_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('3_days_before', '1_day_before', 'due_date', 'overdue')),
  reminder_date DATE NOT NULL,
  whatsapp_url TEXT NOT NULL, -- wa.me link with pre-filled message
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  user_phone_number TEXT, -- User's phone number for sending reminder
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, bill_id, reminder_type)
);

-- Savings Goals
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  monthly_contribution NUMERIC DEFAULT 0,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('emergency_fund', 'vacation', 'gadget', 'home', 'education', 'other')),
  target_date DATE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EMI Tracker (Debt Management)
CREATE TABLE IF NOT EXISTS public.emi_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_name TEXT NOT NULL,
  lender_name TEXT,
  loan_type TEXT NOT NULL CHECK (loan_type IN ('credit_card', 'personal_loan', 'home_loan', 'car_loan', 'education_loan', 'other')),
  principal_amount NUMERIC NOT NULL,
  emi_amount NUMERIC NOT NULL,
  interest_rate NUMERIC,
  total_tenure_months INTEGER NOT NULL,
  remaining_tenure_months INTEGER NOT NULL,
  due_date_day INTEGER NOT NULL CHECK (due_date_day >= 1 AND due_date_day <= 31),
  next_due_date DATE,
  total_paid NUMERIC DEFAULT 0,
  total_remaining NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spending Alerts (Category-wise spending thresholds)
CREATE TABLE IF NOT EXISTS public.spending_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC NOT NULL,
  alert_threshold NUMERIC NOT NULL, -- Percentage (e.g., 80 = alert at 80% of limit)
  alert_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (alert_frequency IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN DEFAULT true,
  last_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Bill Payment Schedule (Auto-scheduling)
CREATE TABLE IF NOT EXISTS public.bill_payment_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('auto_pay', 'reminder_only', 'scheduled_date')),
  scheduled_date DATE, -- Specific date to pay
  auto_pay_enabled BOOLEAN DEFAULT false,
  upi_id TEXT, -- User's UPI ID for auto-payment
  payment_link TEXT, -- Razorpay/UPI payment link
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'paid', 'failed', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payment_confirmation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, bill_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_bill_reminders_user_id ON public.whatsapp_bill_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bill_reminders_bill_id ON public.whatsapp_bill_reminders(bill_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bill_reminders_status ON public.whatsapp_bill_reminders(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bill_reminders_reminder_date ON public.whatsapp_bill_reminders(reminder_date);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_completed ON public.savings_goals(is_completed);
CREATE INDEX IF NOT EXISTS idx_savings_goals_type ON public.savings_goals(goal_type);

CREATE INDEX IF NOT EXISTS idx_emi_tracker_user_id ON public.emi_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_emi_tracker_active ON public.emi_tracker(is_active);
CREATE INDEX IF NOT EXISTS idx_emi_tracker_next_due_date ON public.emi_tracker(next_due_date);

CREATE INDEX IF NOT EXISTS idx_spending_alerts_user_id ON public.spending_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_spending_alerts_active ON public.spending_alerts(is_active);

CREATE INDEX IF NOT EXISTS idx_bill_payment_schedule_user_id ON public.bill_payment_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_payment_schedule_bill_id ON public.bill_payment_schedule(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payment_schedule_status ON public.bill_payment_schedule(status);
CREATE INDEX IF NOT EXISTS idx_bill_payment_schedule_scheduled_date ON public.bill_payment_schedule(scheduled_date);

-- Enable RLS
ALTER TABLE public.whatsapp_bill_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emi_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spending_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payment_schedule ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.ensure_policy(
  p_name text,
  p_table text,
  p_cmd text,
  p_using text,
  p_check text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = p_name AND tablename = p_table
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR %s USING (%s)%s',
      p_name,
      p_table,
      p_cmd,
      p_using,
      CASE WHEN p_check IS NOT NULL THEN format(' WITH CHECK (%s)', p_check) ELSE '' END
    );
  END IF;
END;
$$;

-- RLS Policies leveraging helper
SELECT public.ensure_policy(
  'Users can view their own WhatsApp reminders',
  'whatsapp_bill_reminders',
  'SELECT',
  'auth.uid() = user_id',
  NULL
);

SELECT public.ensure_policy(
  'Users can insert their own WhatsApp reminders',
  'whatsapp_bill_reminders',
  'INSERT',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can update their own WhatsApp reminders',
  'whatsapp_bill_reminders',
  'UPDATE',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can view their own savings goals',
  'savings_goals',
  'SELECT',
  'auth.uid() = user_id',
  NULL
);

SELECT public.ensure_policy(
  'Users can insert their own savings goals',
  'savings_goals',
  'INSERT',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can update their own savings goals',
  'savings_goals',
  'UPDATE',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can delete their own savings goals',
  'savings_goals',
  'DELETE',
  'auth.uid() = user_id',
  NULL
);

SELECT public.ensure_policy(
  'Users can view their own EMIs',
  'emi_tracker',
  'SELECT',
  'auth.uid() = user_id',
  NULL
);

SELECT public.ensure_policy(
  'Users can insert their own EMIs',
  'emi_tracker',
  'INSERT',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can update their own EMIs',
  'emi_tracker',
  'UPDATE',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can delete their own EMIs',
  'emi_tracker',
  'DELETE',
  'auth.uid() = user_id',
  NULL
);

SELECT public.ensure_policy(
  'Users can view their own spending alerts',
  'spending_alerts',
  'SELECT',
  'auth.uid() = user_id',
  NULL
);

SELECT public.ensure_policy(
  'Users can insert their own spending alerts',
  'spending_alerts',
  'INSERT',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can update their own spending alerts',
  'spending_alerts',
  'UPDATE',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can delete their own spending alerts',
  'spending_alerts',
  'DELETE',
  'auth.uid() = user_id',
  NULL
);

SELECT public.ensure_policy(
  'Users can view their own payment schedules',
  'bill_payment_schedule',
  'SELECT',
  'auth.uid() = user_id',
  NULL
);

SELECT public.ensure_policy(
  'Users can insert their own payment schedules',
  'bill_payment_schedule',
  'INSERT',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can update their own payment schedules',
  'bill_payment_schedule',
  'UPDATE',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);

SELECT public.ensure_policy(
  'Users can delete their own payment schedules',
  'bill_payment_schedule',
  'DELETE',
  'auth.uid() = user_id',
  NULL
);

DROP FUNCTION IF EXISTS public.ensure_policy(text, text, text, text, text);

-- Add comments for documentation
COMMENT ON TABLE public.whatsapp_bill_reminders IS 'WhatsApp bill reminders using FREE wa.me links (no Twilio costs)';
COMMENT ON TABLE public.savings_goals IS 'Savings goals tracker for Mumbai commuters - emergency funds, small goals';
COMMENT ON TABLE public.emi_tracker IS 'EMI/Debt tracker for managing loans and credit cards';
COMMENT ON TABLE public.spending_alerts IS 'Spending threshold alerts by category to prevent overspending';
COMMENT ON TABLE public.bill_payment_schedule IS 'Scheduled bill payments with auto-pay and UPI integration';
