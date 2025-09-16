-- Add SMS notification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT false;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number) WHERE phone_number IS NOT NULL;

-- Create index for SMS enabled users
CREATE INDEX IF NOT EXISTS idx_profiles_sms_enabled ON public.profiles(sms_notifications_enabled) WHERE sms_notifications_enabled = true;