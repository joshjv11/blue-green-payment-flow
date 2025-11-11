# OCR Setup & Deployment Guide

## Project Information
- **Project ID**: `qusloccwftavvcsttmnq`
- **Project URL**: `https://qusloccwftavvcsttmnq.supabase.co`

## Prerequisites

### 1. Supabase Secrets (Set in Dashboard)
Navigate to: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/settings/functions

Required secrets:
- `LOVABLE_API_KEY` - Your Lovable AI Gateway API key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `SUPABASE_URL` - `https://qusloccwftavvcsttmnq.supabase.co`

### 2. Storage Bucket
Navigate to: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/storage/buckets

Create bucket if not exists:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;
```

Create RLS policies:
```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload receipts" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow service role to read all receipts (for OCR processing)
CREATE POLICY "Service role can read receipts" ON storage.objects
FOR SELECT TO service_role
USING (bucket_id = 'receipts');

-- Allow users to read their own receipts
CREATE POLICY "Users can read own receipts" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 3. Database Schema
The `bills` table should have these OCR columns:
- `ocr_source` TEXT
- `ocr_confidence` NUMERIC
- `invoice_image_url` TEXT

If missing, run migration:
```sql
ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS ocr_source TEXT,
ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS invoice_image_url TEXT;
```

## Deployment Steps

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Link to Project
```bash
supabase link --project-ref qusloccwftavvcsttmnq
```

### 3. Deploy Edge Function
```bash
supabase functions deploy extract-invoice-ocr --project-ref qusloccwftavvcsttmnq --no-verify-jwt
```

### 4. Verify Deployment
Check function logs:
https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/functions/extract-invoice-ocr/logs

## Testing

### 1. Manual Test (cURL)
```bash
# Get your anon key
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NjgzMzYsImV4cCI6MjA1MTA0NDMzNn0.XNMiO9LcWBCCb5cGa4pFEKSsJmXQ7rCmfqZhJ0d-vE0"

# Upload a test image first to receipts bucket
# Then call the function
curl -X POST \
  "https://qusloccwftavvcsttmnq.supabase.co/functions/v1/extract-invoice-ocr" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "receipts",
    "path": "USER_ID/test-invoice.jpg",
    "userId": "USER_ID",
    "persist": true
  }'
```

### 2. Frontend Test
1. Start your frontend: `npm run dev`
2. Navigate to Bills page
3. Click "Quick Invoice OCR"
4. Upload an invoice image (JPG, PNG, PDF)
5. Click "Extract Data"
6. Verify extracted data appears and bill is created

## Troubleshooting

### Function not found
- Verify deployment: `supabase functions list --project-ref qusloccwftavvcsttmnq`
- Check config.toml has the function registered

### CORS errors
- Function must have CORS headers in responses
- Verify `corsHeaders` are included in all responses

### "Failed to send request"
- Check browser console for exact error
- Verify project ID matches in all files
- Ensure edge function is deployed to correct project

### No extraction results
- Check edge function logs for AI Gateway errors
- Verify LOVABLE_API_KEY is set correctly
- Check if image file is accessible (signed URL creation)

### Rate limit / 402 errors
- Check Lovable AI credits: https://docs.lovable.dev/features/ai
- Verify LOVABLE_API_KEY is valid

## Architecture

```
User uploads invoice (JPG/PNG/PDF)
    ↓
Supabase Storage (receipts bucket)
    ↓
InvoiceOCRUploader calls Edge Function
    ↓
extract-invoice-ocr creates signed URL
    ↓
Calls Lovable AI Gateway (Gemini 2.5 Flash)
    ↓
AI extracts: vendor, amount, due_date, category, confidence
    ↓
Function saves to bills table (if persist=true)
    ↓
Returns extraction results to frontend
    ↓
UI displays results + success toast
```

## Links
- **Edge Function Logs**: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/functions/extract-invoice-ocr/logs
- **Storage Bucket**: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/storage/buckets/receipts
- **Function Secrets**: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/settings/functions
- **Bills Table**: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/editor
