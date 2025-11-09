-- Add OCR-related columns to bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS ocr_source TEXT,
ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS invoice_image_url TEXT;

-- Add index for faster lookups of OCR-processed bills
CREATE INDEX IF NOT EXISTS idx_bills_ocr_source ON public.bills(ocr_source) WHERE ocr_source IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.bills.ocr_source IS 'AI model used for OCR extraction (e.g., lovable-gemini-2.5-flash)';
COMMENT ON COLUMN public.bills.ocr_confidence IS 'Confidence score from OCR extraction (0.0 to 1.0)';
COMMENT ON COLUMN public.bills.invoice_image_url IS 'Storage path to the original invoice image';