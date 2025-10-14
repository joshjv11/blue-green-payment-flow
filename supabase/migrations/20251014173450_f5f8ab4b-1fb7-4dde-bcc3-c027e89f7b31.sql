-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-pdfs',
  'invoice-pdfs',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for invoice PDFs
CREATE POLICY "Users can view their own invoice PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoice-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own invoice PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoice-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own invoice PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoice-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own invoice PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoice-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add pdf_url column to sales_orders and purchase_orders
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS pdf_url text;

ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS pdf_url text;

COMMENT ON COLUMN public.sales_orders.pdf_url IS 'URL to generated PDF in Supabase Storage';
COMMENT ON COLUMN public.purchase_orders.pdf_url IS 'URL to generated PDF in Supabase Storage';