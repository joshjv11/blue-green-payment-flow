-- Create export logs table for tracking
CREATE TABLE public.export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('sales', 'purchases', 'gst_summary', 'full_package')),
  file_name TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK (file_format IN ('csv', 'excel', 'pdf')),
  date_from DATE,
  date_to DATE,
  record_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own export logs"
  ON public.export_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export logs"
  ON public.export_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_export_logs_user_created ON public.export_logs(user_id, created_at DESC);