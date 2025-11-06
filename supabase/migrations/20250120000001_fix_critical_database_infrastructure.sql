-- ==========================================
-- CRITICAL FIX: Missing Database Infrastructure
-- Fixes all Level 1 issues preventing app from starting
-- ==========================================

-- 1. Ensure gstn_credentials table exists
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

-- Create indexes for gstn_credentials (idempotent)
CREATE INDEX IF NOT EXISTS idx_gstn_credentials_user_id ON public.gstn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_gstn_credentials_gstin ON public.gstn_credentials(gstin);
CREATE INDEX IF NOT EXISTS idx_gstn_credentials_is_active ON public.gstn_credentials(is_active) WHERE is_active = true;

-- Enable RLS on gstn_credentials
ALTER TABLE public.gstn_credentials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own GSTN credentials" ON public.gstn_credentials;
DROP POLICY IF EXISTS "Users can insert their own GSTN credentials" ON public.gstn_credentials;
DROP POLICY IF EXISTS "Users can update their own GSTN credentials" ON public.gstn_credentials;
DROP POLICY IF EXISTS "Users can delete their own GSTN credentials" ON public.gstn_credentials;

-- RLS policies for gstn_credentials (users can only see their own credentials)
CREATE POLICY "Users can view their own GSTN credentials"
  ON public.gstn_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GSTN credentials"
  ON public.gstn_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GSTN credentials"
  ON public.gstn_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GSTN credentials"
  ON public.gstn_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Ensure einvoice_queue table exists
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

-- Create indexes for einvoice_queue (idempotent)
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_user_id ON public.einvoice_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_status ON public.einvoice_queue(status);
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_sales_order_id ON public.einvoice_queue(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_einvoice_queue_priority_status ON public.einvoice_queue(priority DESC, status, created_at ASC);

-- Enable RLS on einvoice_queue
ALTER TABLE public.einvoice_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own e-invoice queue" ON public.einvoice_queue;
DROP POLICY IF EXISTS "Users can insert their own e-invoice queue items" ON public.einvoice_queue;
DROP POLICY IF EXISTS "Users can update their own e-invoice queue items" ON public.einvoice_queue;

-- RLS policies for einvoice_queue
CREATE POLICY "Users can view their own e-invoice queue"
  ON public.einvoice_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own e-invoice queue items"
  ON public.einvoice_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own e-invoice queue items"
  ON public.einvoice_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Add missing columns to profiles table
-- Ensure profiles table exists first
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add phone column if it doesn't exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add whatsapp_phone_number column if it doesn't exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT;

-- Add whatsapp_reminder_settings column if it doesn't exist (JSONB for flexible settings)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_settings JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.phone IS 'User''s primary phone number';
COMMENT ON COLUMN public.profiles.whatsapp_phone_number IS 'User''s WhatsApp phone number for sending messages (format: +1234567890)';
COMMENT ON COLUMN public.profiles.whatsapp_reminder_settings IS 'JSONB object storing WhatsApp reminder preferences: {whatsapp_reminders_enabled: boolean, reminder_days: number[], reminder_time: string, avoid_weekends: boolean}';
COMMENT ON TABLE public.gstn_credentials IS 'Encrypted GSTN API credentials for Premium users';
COMMENT ON TABLE public.einvoice_queue IS 'Queue for bulk e-invoice generation (100+ invoices/day)';

-- 4. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_gstn_credentials ON public.gstn_credentials;
CREATE TRIGGER set_updated_at_gstn_credentials
  BEFORE UPDATE ON public.gstn_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_einvoice_queue ON public.einvoice_queue;
CREATE TRIGGER set_updated_at_einvoice_queue
  BEFORE UPDATE ON public.einvoice_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. Ensure profiles table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Basic RLS policies for profiles (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Public profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Public profiles are viewable by everyone"
      ON public.profiles FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

