-- Add email notification settings columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reminder_email TEXT,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;

-- Create index for email notifications
CREATE INDEX IF NOT EXISTS idx_profiles_email_notifications 
ON public.profiles(email_notifications_enabled) 
WHERE email_notifications_enabled = true;