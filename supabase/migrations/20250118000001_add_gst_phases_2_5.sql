-- GST Phases 2-5: Queue, Compliance, and Pricing Support

-- 1. E-Invoice Queue Table
CREATE TABLE IF NOT EXISTS public.einvoice_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  irn text,
  ack_no text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, sales_order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_user_status ON public.einvoice_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_status ON public.einvoice_queue(status);
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_created ON public.einvoice_queue(created_at);

-- RLS Policies
ALTER TABLE public.einvoice_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own einvoice_queue"
  ON public.einvoice_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own einvoice_queue"
  ON public.einvoice_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage einvoice_queue"
  ON public.einvoice_queue FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. GST Plan Types (extend user_plans)
-- Add GST-specific plan types if not exists
DO $$
BEGIN
  -- Check if gst_autopilot plan type exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'gst_plan_type'
  ) THEN
    CREATE TYPE gst_plan_type AS ENUM ('gst_autopilot', 'gst_itc_genius', 'gst_einvoice_pro');
  END IF;
END $$;

-- Add GST plan column to user_plans (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_plans' AND column_name = 'gst_plan'
  ) THEN
    ALTER TABLE public.user_plans ADD COLUMN gst_plan text;
  END IF;
END $$;

-- 3. Auto-IRN Trigger Function
CREATE OR REPLACE FUNCTION public.auto_queue_einvoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only queue if IRN is not already set and user has E-Invoice Pro plan
  IF NEW.irn IS NULL OR NEW.irn = '' THEN
    -- Check if user has E-Invoice Pro plan
    IF EXISTS (
      SELECT 1 FROM public.user_plans
      WHERE user_id = NEW.user_id
        AND (gst_plan = 'gst_einvoice_pro' OR plan = 'premium')
        AND is_active = true
    ) THEN
      -- Insert into queue
      INSERT INTO public.einvoice_queue (user_id, sales_order_id, status)
      VALUES (NEW.user_id, NEW.id, 'pending')
      ON CONFLICT (user_id, sales_order_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-queuing
DROP TRIGGER IF EXISTS trigger_auto_queue_einvoice ON public.sales_orders;
CREATE TRIGGER trigger_auto_queue_einvoice
  AFTER INSERT OR UPDATE ON public.sales_orders
  FOR EACH ROW
  WHEN (NEW.irn IS NULL OR NEW.irn = '')
  EXECUTE FUNCTION public.auto_queue_einvoice();

-- 4. Update get_pending_einvoices_over_30_days to work for all users
CREATE OR REPLACE FUNCTION public.get_pending_einvoices_over_30_days(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  sales_order_id uuid,
  invoice_number text,
  invoice_date date,
  days_old int,
  irn text,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.invoice_number,
    so.transaction_date::date,
    (CURRENT_DATE - so.transaction_date::date)::int AS days_old,
    so.irn,
    so.user_id
  FROM public.sales_orders so
  WHERE (p_user_id IS NULL OR so.user_id = p_user_id)
    AND (so.irn IS NULL OR so.irn = '')
    AND so.transaction_date < CURRENT_DATE - INTERVAL '25 days'
    AND so.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY so.transaction_date ASC;
END;
$$;

-- 5. Add language preference to profiles (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'locale'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN locale text DEFAULT 'en-IN';
  END IF;
END $$;

-- 6. Create index for faster compliance checks
CREATE INDEX IF NOT EXISTS idx_sales_orders_irn_date ON public.sales_orders(irn, transaction_date) WHERE irn IS NULL;

