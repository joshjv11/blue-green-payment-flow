-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  gst NUMERIC DEFAULT 0 CHECK (gst >= 0),
  category TEXT NOT NULL,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts
CREATE POLICY "Users can upload their own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();