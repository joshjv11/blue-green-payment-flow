-- ==========================================
-- Add E-Invoice Fields to sales_orders
-- For Premium plan: IRN generation, QR codes, e-way bills
-- ==========================================

-- Add IRN (Invoice Reference Number) field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'irn'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN irn text DEFAULT NULL;
  END IF;
END $$;

-- Add IRN generation timestamp
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'irn_generated_at'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN irn_generated_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Add QR code URL for B2C invoices
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'qr_code_url'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN qr_code_url text DEFAULT NULL;
  END IF;
END $$;

-- Add e-invoice status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'einvoice_status'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN einvoice_status text DEFAULT NULL 
      CHECK (einvoice_status IS NULL OR einvoice_status IN ('pending', 'generated', 'failed', 'cancelled', 'synced'));
  END IF;
END $$;

-- Add GSTN acknowledgment number
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'gstn_ack_no'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN gstn_ack_no text DEFAULT NULL;
  END IF;
END $$;

-- Add GSTN response data (JSON for storing API responses)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'gstn_response_data'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN gstn_response_data jsonb DEFAULT NULL;
  END IF;
END $$;

-- Add e-invoice sync timestamp (for status updates)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'einvoice_synced_at'
  ) THEN
    ALTER TABLE public.sales_orders 
      ADD COLUMN einvoice_synced_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Enhance eway_bill_no if it exists (add index if not exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_orders' 
    AND column_name = 'eway_bill_no'
  ) THEN
    -- Index already exists from previous migrations, but ensure it's there
    CREATE INDEX IF NOT EXISTS idx_sales_orders_eway_bill_no ON public.sales_orders(eway_bill_no) WHERE eway_bill_no IS NOT NULL;
  END IF;
END $$;

-- Create indexes for e-invoice fields
CREATE INDEX IF NOT EXISTS idx_sales_orders_irn ON public.sales_orders(irn) WHERE irn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_einvoice_status ON public.sales_orders(einvoice_status) WHERE einvoice_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_irn_generated_at ON public.sales_orders(irn_generated_at DESC) WHERE irn_generated_at IS NOT NULL;

-- Create table for storing GSTN credentials (encrypted, user-specific)
CREATE TABLE IF NOT EXISTS public.gstn_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gstin TEXT NOT NULL,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL, -- Encrypted password
  api_endpoint TEXT DEFAULT 'https://einvoice.gst.gov.in',
  is_active BOOLEAN DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, gstin)
);

-- Create indexes for gstn_credentials
CREATE INDEX IF NOT EXISTS idx_gstn_credentials_user_id ON public.gstn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_gstn_credentials_gstin ON public.gstn_credentials(gstin);

-- Enable RLS on gstn_credentials
ALTER TABLE public.gstn_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gstn_credentials'
      AND policyname = 'Users can view their own GSTN credentials'
  ) THEN
    CREATE POLICY "Users can view their own GSTN credentials"
      ON public.gstn_credentials FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gstn_credentials'
      AND policyname = 'Users can insert their own GSTN credentials'
  ) THEN
    CREATE POLICY "Users can insert their own GSTN credentials"
      ON public.gstn_credentials FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gstn_credentials'
      AND policyname = 'Users can update their own GSTN credentials'
  ) THEN
    CREATE POLICY "Users can update their own GSTN credentials"
      ON public.gstn_credentials FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gstn_credentials'
      AND policyname = 'Users can delete their own GSTN credentials'
  ) THEN
    CREATE POLICY "Users can delete their own GSTN credentials"
      ON public.gstn_credentials FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create table for bulk e-invoice queue
CREATE TABLE IF NOT EXISTS public.einvoice_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  priority INTEGER DEFAULT 0, -- Higher priority processed first
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for einvoice_queue
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_user_id ON public.einvoice_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_status ON public.einvoice_queue(status);
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_sales_order_id ON public.einvoice_queue(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_priority_status ON public.einvoice_queue(priority DESC, status, created_at ASC);

-- Enable RLS on einvoice_queue
ALTER TABLE public.einvoice_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'einvoice_queue'
      AND policyname = 'Users can view their own e-invoice queue'
  ) THEN
    CREATE POLICY "Users can view their own e-invoice queue"
      ON public.einvoice_queue FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'einvoice_queue'
      AND policyname = 'Users can insert their own e-invoice queue items'
  ) THEN
    CREATE POLICY "Users can insert their own e-invoice queue items"
      ON public.einvoice_queue FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'einvoice_queue'
      AND policyname = 'Users can update their own e-invoice queue items'
  ) THEN
    CREATE POLICY "Users can update their own e-invoice queue items"
      ON public.einvoice_queue FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.sales_orders.irn IS 'Invoice Reference Number (IRN) from GSTN e-invoice portal';
COMMENT ON COLUMN public.sales_orders.irn_generated_at IS 'Timestamp when IRN was generated';
COMMENT ON COLUMN public.sales_orders.qr_code_url IS 'QR code URL for B2C invoices as per GSTN specifications';
COMMENT ON COLUMN public.sales_orders.einvoice_status IS 'E-invoice status: pending, generated, failed, cancelled, synced';
COMMENT ON COLUMN public.sales_orders.gstn_ack_no IS 'GSTN acknowledgment number';
COMMENT ON COLUMN public.sales_orders.gstn_response_data IS 'Complete GSTN API response stored as JSON';
COMMENT ON COLUMN public.sales_orders.einvoice_synced_at IS 'Last timestamp when e-invoice status was synced from GSTN portal';
COMMENT ON TABLE public.gstn_credentials IS 'Encrypted GSTN API credentials for Premium users';
COMMENT ON TABLE public.einvoice_queue IS 'Queue for bulk e-invoice generation (100+ invoices/day)';

