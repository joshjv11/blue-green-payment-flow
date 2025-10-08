-- Add scheduled_send_at column to track exact intended send time
ALTER TABLE public.bill_reminders 
ADD COLUMN IF NOT EXISTS scheduled_send_at timestamptz;

-- Add index for efficient query of pending reminders
CREATE INDEX IF NOT EXISTS idx_bill_reminders_pending_due 
ON public.bill_reminders(status, scheduled_send_at) 
WHERE status = 'pending';

-- Add sent_at column to track actual send time
ALTER TABLE public.bill_reminders 
ADD COLUMN IF NOT EXISTS sent_at timestamptz;

COMMENT ON COLUMN public.bill_reminders.scheduled_send_at IS 'Exact UTC time when reminder should be sent (computed from reminder_date + 9AM IST or fallback)';
COMMENT ON COLUMN public.bill_reminders.sent_at IS 'Actual UTC time when reminder was successfully sent';