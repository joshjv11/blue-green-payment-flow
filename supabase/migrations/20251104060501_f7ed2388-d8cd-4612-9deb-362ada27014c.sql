-- Add direction field to whatsapp_messages to track incoming vs outgoing
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outgoing' CHECK (direction IN ('incoming', 'outgoing'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON public.payment_links(status);