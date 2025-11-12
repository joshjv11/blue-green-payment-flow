-- Create receipts bucket for OCR uploads
INSERT INTO storage.buckets (id, name, public)
SELECT 'receipts', 'receipts', false
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'receipts'
);

-- Allow authenticated users to upload to receipts/<user_id>/...
CREATE POLICY IF NOT EXISTS "Users can upload their own receipts"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own receipts
CREATE POLICY IF NOT EXISTS "Users can read their own receipts"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow service role to manage all receipts
CREATE POLICY IF NOT EXISTS "Service role can access all receipts"
ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'receipts');
