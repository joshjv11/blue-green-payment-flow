-- Add OCR metadata columns to bills table
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS ocr_source TEXT,
  ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS invoice_image_url TEXT;


