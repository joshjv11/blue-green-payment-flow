-- WhatsApp Integration Tables

-- Table to track WhatsApp messages sent
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
  twilio_message_sid TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'read')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for payment links
CREATE TABLE IF NOT EXISTS public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  sale_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_gateway TEXT NOT NULL CHECK (payment_gateway IN ('razorpay', 'phonepe', 'paytm', 'upi')),
  payment_link_url TEXT,
  qr_code_url TEXT,
  upi_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paid', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_proof_url TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for WhatsApp broadcasts
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcast_name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for customer WhatsApp preferences
CREATE TABLE IF NOT EXISTS public.customer_whatsapp_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  invoice_notifications BOOLEAN NOT NULL DEFAULT true,
  payment_reminders BOOLEAN NOT NULL DEFAULT true,
  gst_reminders BOOLEAN NOT NULL DEFAULT false,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer_id ON public.whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON public.payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON public.payment_links(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_user_id ON public.whatsapp_broadcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_whatsapp_prefs_customer_id ON public.customer_whatsapp_preferences(customer_id);

-- RLS Policies
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_whatsapp_preferences ENABLE ROW LEVEL SECURITY;

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

-- Payment Links policies
CREATE POLICY "Users can manage their own payment links"
  ON public.payment_links FOR ALL
  USING (auth.uid() = user_id);

-- Broadcast policies
CREATE POLICY "Users can manage their own broadcasts"
  ON public.whatsapp_broadcasts FOR ALL
  USING (auth.uid() = user_id);

-- Customer preferences policies
CREATE POLICY "Users can manage their customer WhatsApp preferences"
  ON public.customer_whatsapp_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_links_updated_at
  BEFORE UPDATE ON public.payment_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_broadcasts_updated_at
  BEFORE UPDATE ON public.whatsapp_broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_whatsapp_preferences_updated_at
  BEFORE UPDATE ON public.customer_whatsapp_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();