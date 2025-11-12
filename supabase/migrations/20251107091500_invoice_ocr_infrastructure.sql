-- Invoice OCR extraction infrastructure

-- Tables ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_ocr_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  invoice_id UUID,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  structured_fields JSONB NOT NULL,
  raw_artifacts JSONB,
  overall_confidence NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  processing_time_ms INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_ocr_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID REFERENCES public.invoice_ocr_extractions(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_invoice_ocr_extractions_workspace
  ON public.invoice_ocr_extractions(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_ocr_extractions_invoice
  ON public.invoice_ocr_extractions(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_ocr_logs_workspace
  ON public.invoice_ocr_logs(workspace_id, created_at DESC);

-- Triggers -------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_invoice_ocr_extractions_updated_at
  ON public.invoice_ocr_extractions;

CREATE TRIGGER trg_invoice_ocr_extractions_updated_at
  BEFORE UPDATE ON public.invoice_ocr_extractions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security ---------------------------------------------------------
ALTER TABLE public.invoice_ocr_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_ocr_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own invoice OCR results" ON public.invoice_ocr_extractions;
DROP POLICY IF EXISTS "Users manage own invoice OCR results" ON public.invoice_ocr_extractions;

CREATE POLICY "Users read own invoice OCR results"
  ON public.invoice_ocr_extractions
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users manage own invoice OCR results"
  ON public.invoice_ocr_extractions
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users update own invoice OCR results"
  ON public.invoice_ocr_extractions
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users view own OCR logs" ON public.invoice_ocr_logs;
DROP POLICY IF EXISTS "Users insert own OCR logs" ON public.invoice_ocr_logs;

CREATE POLICY "Users view own OCR logs"
  ON public.invoice_ocr_logs
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users insert own OCR logs"
  ON public.invoice_ocr_logs
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

