-- Create invoice_reminders table (similar to bill_reminders)
CREATE TABLE IF NOT EXISTS public.invoice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  reminder_days_before INTEGER NOT NULL DEFAULT 3 CHECK (reminder_days_before >= 0 AND reminder_days_before <= 30),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'completed')),
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'delivered')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  sent_at TIMESTAMP WITH TIME ZONE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  resend_email_id TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, reminder_date)
);

-- Enable RLS on invoice_reminders
ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_reminders
CREATE POLICY "Users can manage their own invoice reminders"
  ON public.invoice_reminders
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "System can create auto reminders for invoices"
  ON public.invoice_reminders
  FOR INSERT
  WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice_id ON public.invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_user_id ON public.invoice_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_status ON public.invoice_reminders(status);

-- Update auto_create_bill_reminder to create TWO reminders (3 days before and on due date)
CREATE OR REPLACE FUNCTION public.auto_create_bill_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_priority TEXT;
BEGIN
  -- Normalize priority
  normalized_priority := COALESCE(LOWER(NEW.priority::TEXT), 'medium');
  normalized_priority := CASE
    WHEN normalized_priority LIKE 'low%' THEN 'low'
    WHEN normalized_priority LIKE 'high%' THEN 'high'
    ELSE 'medium'
  END;

  -- Only create reminders if auto_reminder_enabled is true (defaults to true)
  IF COALESCE(NEW.auto_reminder_enabled, true) THEN
    -- Create reminder for 3 days before due date
    IF NEW.due_date > CURRENT_DATE + INTERVAL '3 days' THEN
      INSERT INTO public.bill_reminders (
        user_id, bill_id, reminder_date, reminder_days_before, priority, status
      ) VALUES (
        NEW.user_id, NEW.id, NEW.due_date - INTERVAL '3 days', 3, normalized_priority, 'pending'
      ) ON CONFLICT (bill_id, reminder_date) DO NOTHING;
      
      -- Log activity
      INSERT INTO public.app_logs (user_id, level, event, message, context)
      VALUES (NEW.user_id, 'info', 'reminder_created', 'Auto-created reminder 3 days before due date', 
              jsonb_build_object('bill_id', NEW.id, 'reminder_days_before', 3));
    END IF;

    -- Create reminder for due date (same day)
    INSERT INTO public.bill_reminders (
      user_id, bill_id, reminder_date, reminder_days_before, priority, status
    ) VALUES (
      NEW.user_id, NEW.id, NEW.due_date, 0, normalized_priority, 'pending'
    ) ON CONFLICT (bill_id, reminder_date) DO NOTHING;
    
    -- Log activity
    INSERT INTO public.app_logs (user_id, level, event, message, context)
    VALUES (NEW.user_id, 'info', 'reminder_created', 'Auto-created reminder on due date', 
            jsonb_build_object('bill_id', NEW.id, 'reminder_days_before', 0));
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger function to auto-create invoice reminders
CREATE OR REPLACE FUNCTION public.auto_create_invoice_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create reminder for 3 days before due date
  IF NEW.due_date > CURRENT_DATE + INTERVAL '3 days' THEN
    INSERT INTO public.invoice_reminders (
      user_id, invoice_id, reminder_date, reminder_days_before, priority, status
    ) VALUES (
      NEW.user_id, NEW.id, NEW.due_date - INTERVAL '3 days', 3, 'medium', 'pending'
    ) ON CONFLICT (invoice_id, reminder_date) DO NOTHING;
    
    -- Log activity
    INSERT INTO public.app_logs (user_id, level, event, message, context)
    VALUES (NEW.user_id, 'info', 'reminder_created', 'Auto-created invoice reminder 3 days before due date', 
            jsonb_build_object('invoice_id', NEW.id, 'reminder_days_before', 3));
  END IF;

  -- Create reminder for due date (same day)
  INSERT INTO public.invoice_reminders (
    user_id, invoice_id, reminder_date, reminder_days_before, priority, status
  ) VALUES (
    NEW.user_id, NEW.id, NEW.due_date, 0, 'medium', 'pending'
  ) ON CONFLICT (invoice_id, reminder_date) DO NOTHING;
  
  -- Log activity
  INSERT INTO public.app_logs (user_id, level, event, message, context)
  VALUES (NEW.user_id, 'info', 'reminder_created', 'Auto-created invoice reminder on due date', 
          jsonb_build_object('invoice_id', NEW.id, 'reminder_days_before', 0));

  RETURN NEW;
END;
$$;

-- Attach trigger to invoices table
DROP TRIGGER IF EXISTS trigger_auto_create_invoice_reminder ON public.invoices;
CREATE TRIGGER trigger_auto_create_invoice_reminder
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_invoice_reminder();

-- Function to update bill reminders when bill is marked as paid
CREATE OR REPLACE FUNCTION public.update_bill_reminders_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If bill status changed to 'paid', cancel pending reminders
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE public.bill_reminders
    SET status = 'completed',
        updated_at = now()
    WHERE bill_id = NEW.id
      AND status = 'pending';
    
    -- Log activity
    INSERT INTO public.app_logs (user_id, level, event, message, context)
    VALUES (NEW.user_id, 'info', 'reminder_completed', 'Bill marked as paid - reminders completed', 
            jsonb_build_object('bill_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to bills table for status updates
DROP TRIGGER IF EXISTS trigger_update_bill_reminders_on_payment ON public.bills;
CREATE TRIGGER trigger_update_bill_reminders_on_payment
  AFTER UPDATE OF status ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bill_reminders_on_payment();

-- Function to update invoice reminders when invoice is marked as paid
CREATE OR REPLACE FUNCTION public.update_invoice_reminders_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If invoice status changed to 'paid', cancel pending reminders
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE public.invoice_reminders
    SET status = 'completed',
        updated_at = now()
    WHERE invoice_id = NEW.id
      AND status = 'pending';
    
    -- Log activity
    INSERT INTO public.app_logs (user_id, level, event, message, context)
    VALUES (NEW.user_id, 'info', 'reminder_completed', 'Invoice marked as paid - reminders completed', 
            jsonb_build_object('invoice_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to invoices table for status updates
DROP TRIGGER IF EXISTS trigger_update_invoice_reminders_on_payment ON public.invoices;
CREATE TRIGGER trigger_update_invoice_reminders_on_payment
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_reminders_on_payment();