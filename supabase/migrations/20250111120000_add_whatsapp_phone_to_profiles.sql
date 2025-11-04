-- Add WhatsApp phone number field to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT;

COMMENT ON COLUMN public.profiles.whatsapp_phone_number IS 'User''s WhatsApp phone number for sending messages (format: +1234567890)';

