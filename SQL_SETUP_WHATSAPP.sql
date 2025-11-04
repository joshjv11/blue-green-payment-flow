-- ============================================
-- WhatsApp Integration SQL Setup
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Step 1: Add WhatsApp phone number to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT;

COMMENT ON COLUMN public.profiles.whatsapp_phone_number IS 'User''s WhatsApp phone number for sending messages (format: +1234567890)';

-- Step 2: Create WhatsApp broadcasts table FIRST (messages table references it)
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcast_name TEXT,
  broadcast_type TEXT,
  message_template TEXT,
  message_content TEXT,
  recipient_count INTEGER DEFAULT 0,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'in_progress', 'completed', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 3: Create WhatsApp messages table (after broadcasts table)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('invoice', 'reminder', 'payment_link', 'receipt', 'broadcast', 'custom')),
  message_content TEXT NOT NULL,
  media_url TEXT,
  related_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  related_bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  related_sale_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  broadcast_id UUID REFERENCES public.whatsapp_broadcasts(id) ON DELETE SET NULL,
  twilio_message_sid TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'read')),
  direction TEXT CHECK (direction IN ('incoming', 'outgoing')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Add any missing columns to broadcasts table (if table already existed)
DO $$
BEGIN
  -- Add columns if they don't exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_broadcasts') THEN
    ALTER TABLE public.whatsapp_broadcasts 
      ADD COLUMN IF NOT EXISTS broadcast_type TEXT,
      ADD COLUMN IF NOT EXISTS message_content TEXT,
      ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS messages_failed INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;
    
    -- Update status constraint if it exists
    ALTER TABLE public.whatsapp_broadcasts 
      DROP CONSTRAINT IF EXISTS whatsapp_broadcasts_status_check;
    
    ALTER TABLE public.whatsapp_broadcasts
      ADD CONSTRAINT whatsapp_broadcasts_status_check 
      CHECK (status IN ('draft', 'scheduled', 'sending', 'in_progress', 'completed', 'failed'));
  END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer_id ON public.whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_user_id ON public.whatsapp_broadcasts(user_id);

-- Step 6: Enable Row Level Security
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies (drop existing if they exist to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own WhatsApp messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can create their own WhatsApp messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "System can update WhatsApp message status" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can manage their own broadcasts" ON public.whatsapp_broadcasts;

-- WhatsApp Messages policies
CREATE POLICY "Users can view their own WhatsApp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own WhatsApp messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update WhatsApp message status"
  ON public.whatsapp_messages FOR UPDATE
  USING (true);

-- Broadcast policies
CREATE POLICY "Users can manage their own broadcasts"
  ON public.whatsapp_broadcasts FOR ALL
  USING (auth.uid() = user_id);

-- Step 8: Create or replace update_updated_at_column function (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create triggers for updated_at
DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at ON public.whatsapp_messages;
DROP TRIGGER IF EXISTS update_whatsapp_broadcasts_updated_at ON public.whatsapp_broadcasts;

CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_broadcasts_updated_at
  BEFORE UPDATE ON public.whatsapp_broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ✅ SQL Setup Complete!
-- ============================================
-- Your database is now ready for WhatsApp integration.
-- 
-- Note: The edge functions will use WhatsApp Web API
-- (free, uses your own phone number - no Twilio costs!)
-- ============================================

