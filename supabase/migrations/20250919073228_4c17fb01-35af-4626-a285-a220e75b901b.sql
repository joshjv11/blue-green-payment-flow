-- Create bill_reminders table for individual bill reminder tracking
CREATE TABLE public.bill_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_date DATE NOT NULL,
  reminder_days_before INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  email_sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'bounced', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  resend_email_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_job_id TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))
);

-- Enable RLS
ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bill reminders" 
ON public.bill_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bill reminders" 
ON public.bill_reminders 
FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_bill_reminders_bill_id ON public.bill_reminders(bill_id);
CREATE INDEX idx_bill_reminders_user_id ON public.bill_reminders(user_id);
CREATE INDEX idx_bill_reminders_reminder_date ON public.bill_reminders(reminder_date);
CREATE INDEX idx_bill_reminders_status ON public.bill_reminders(status);
CREATE INDEX idx_bill_reminders_delivery_status ON public.bill_reminders(delivery_status);

-- Create function to update timestamps
CREATE TRIGGER update_bill_reminders_updated_at
BEFORE UPDATE ON public.bill_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to bills table for reminder settings
ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS auto_reminder_enabled BOOLEAN DEFAULT true;

-- Create bill_reminder_jobs table for cron job tracking
CREATE TABLE public.bill_reminder_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_reminder_id UUID NOT NULL REFERENCES public.bill_reminders(id) ON DELETE CASCADE,
  job_name TEXT NOT NULL UNIQUE,
  cron_expression TEXT NOT NULL,
  execution_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'executed', 'failed', 'cancelled')),
  executed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bill_reminder_jobs
ALTER TABLE public.bill_reminder_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bill_reminder_jobs
CREATE POLICY "Users can view their own reminder jobs" 
ON public.bill_reminder_jobs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.bill_reminders br 
  WHERE br.id = bill_reminder_jobs.bill_reminder_id 
  AND br.user_id = auth.uid()
));

CREATE POLICY "System can manage reminder jobs" 
ON public.bill_reminder_jobs 
FOR ALL 
USING (true);

-- Create indexes
CREATE INDEX idx_bill_reminder_jobs_reminder_id ON public.bill_reminder_jobs(bill_reminder_id);
CREATE INDEX idx_bill_reminder_jobs_status ON public.bill_reminder_jobs(status);
CREATE INDEX idx_bill_reminder_jobs_execution_date ON public.bill_reminder_jobs(execution_date);

-- Create trigger for bill_reminder_jobs
CREATE TRIGGER update_bill_reminder_jobs_updated_at
BEFORE UPDATE ON public.bill_reminder_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();