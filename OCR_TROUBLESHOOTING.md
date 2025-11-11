# OCR Troubleshooting & Alternative Solutions

## Current Issue: "Failed to fetch OCR failed error"

### Root Causes

1. **Edge Function Not Deployed**
   - The `extract-invoice-ocr` function exists in code but may not be deployed to Supabase
   - Check: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/functions

2. **Project ID Mismatch**
   - Ensure ALL files use project `qusloccwftavvcsttmnq`
   - Files to check: `.env`, `src/integrations/supabase/client.ts`, `src/lib/supabase.ts`

3. **Missing Secrets**
   - Required: `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Check: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/settings/functions

4. **Storage Bucket Issues**
   - Bucket `receipts` must exist and be private
   - RLS policies must allow authenticated users to upload
   - Check: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/storage/buckets

5. **CORS/Network Issues**
   - Edge function must have CORS headers (already present in code)
   - Localhost development should work if function is deployed

---

## Quick Fix Checklist

### 1. Deploy Edge Function
```bash
# Install Supabase CLI if not already
npm install -g supabase

# Link to project
supabase link --project-ref qusloccwftavvcsttmnq

# Deploy function
supabase functions deploy extract-invoice-ocr --project-ref qusloccwftavvcsttmnq --no-verify-jwt
```

### 2. Verify Secrets
Navigate to: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/settings/functions

Ensure these secrets exist:
- `LOVABLE_API_KEY` - Your Lovable workspace API key
- `SUPABASE_SERVICE_ROLE_KEY` - From project settings
- `SUPABASE_URL` - `https://qusloccwftavvcsttmnq.supabase.co`

### 3. Test Edge Function Directly
```bash
# Get your anon key from .env
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NjgzMzYsImV4cCI6MjA1MTA0NDMzNn0.XNMiO9LcWBCCb5cGa4pFEKSsJmXQ7rCmfqZhJ0d-vE0"

# Test with OPTIONS (CORS preflight)
curl -X OPTIONS \
  "https://qusloccwftavvcsttmnq.supabase.co/functions/v1/extract-invoice-ocr" \
  -H "Authorization: Bearer $ANON_KEY"

# Should return 200 with CORS headers
```

### 4. Check Console Logs
After attempting upload, check browser console for detailed logs:
- `🚀 Calling extract-invoice-ocr edge function...`
- `📦 Edge function response:`
- `❌ Edge function error details:`

---

## Alternative OCR Approaches

### Option 1: Client-Side OCR with Tesseract.js ⚡
**Pros:** No backend needed, works offline, free  
**Cons:** Less accurate, slower, only handles images (not PDFs)

```bash
npm install tesseract.js
```

```typescript
import Tesseract from 'tesseract.js';

const extractWithTesseract = async (file: File) => {
  const { data: { text } } = await Tesseract.recognize(file, 'eng');
  // Parse text to extract vendor, amount, date
  return parseInvoiceText(text);
};
```

### Option 2: Direct Lovable AI Call (Simplified) 🚀
**Pros:** Simpler edge function, fewer dependencies  
**Cons:** Still requires edge function (can't call from client due to API key)

Current implementation already uses this approach.

### Option 3: Google Cloud Vision API 🎯
**Pros:** Very accurate, handles PDFs well  
**Cons:** Requires GCP account, costs money, more complex setup

```bash
# Add secret: GOOGLE_CLOUD_API_KEY
# Update edge function to use Vision API instead of Lovable AI
```

### Option 4: Multer + Express Backend (Previous Approach) 🔄
**Pros:** Full control, can use BullMQ for queuing  
**Cons:** Requires separate backend deployment, more infrastructure

Not recommended since Supabase edge functions are simpler.

---

## Recommended Solution

**Stick with Supabase Edge Function + Lovable AI** (current approach):
1. Most cost-effective (Lovable AI included in workspace)
2. Simplest architecture (no separate backend)
3. Good accuracy with Gemini 2.5 Flash
4. Automatic scaling with Supabase

**Action:** Ensure function is deployed and secrets are configured.

---

## Testing After Fix

1. **Navigate to Bills page** in your app (http://localhost:8085/bills)
2. **Click "Quick Invoice OCR"** button
3. **Upload a sample invoice** (JPG/PNG/PDF)
4. **Click "Extract Data"**
5. **Check console** for detailed logs
6. **Verify:**
   - Toast: "File uploaded successfully"
   - Toast: "Invoice extracted! Vendor: X, Amount: ₹Y"
   - Extracted data appears in green success box
   - Bill is created in database (refresh page to see)

---

## Debug Commands

### View Edge Function Logs
```bash
# Real-time logs
supabase functions logs extract-invoice-ocr --project-ref qusloccwftavvcsttmnq

# Or check dashboard
# https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/functions/extract-invoice-ocr/logs
```

### Check Storage Bucket
```bash
# List buckets
supabase storage list --project-ref qusloccwftavvcsttmnq

# List files in receipts bucket
supabase storage ls receipts --project-ref qusloccwftavvcsttmnq
```

### Verify Database Columns
```sql
-- Check bills table has OCR columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bills' 
  AND column_name IN ('ocr_source', 'ocr_confidence', 'invoice_image_url');
```

---

## Still Not Working?

1. **Check Network Tab** in browser DevTools:
   - Look for request to `/functions/v1/extract-invoice-ocr`
   - Check status code (should be 200 for success)
   - View response body for error details

2. **Verify Supabase Client Initialization:**
   ```javascript
   // In browser console
   console.log(window.localStorage.getItem('supabase.auth.token'));
   // Should show JWT token
   ```

3. **Test Storage Upload Separately:**
   ```typescript
   // In component, add temporary test button
   const testUpload = async () => {
     const testFile = new Blob(['test'], { type: 'text/plain' });
     const { data, error } = await supabase.storage
       .from('receipts')
       .upload(`${userId}/test.txt`, testFile);
     console.log({ data, error });
   };
   ```

4. **Contact Support:**
   - Lovable Discord: https://discord.gg/lovable
   - Supabase Discord: https://discord.supabase.com
   - Share edge function logs and network requests

---

## Expected Success Flow

```
1. User uploads invoice.pdf → Browser
2. Upload to storage → receipts/USER_ID/123456789.pdf
3. Call edge function → extract-invoice-ocr
4. Function creates signed URL → Valid for 60 seconds
5. Function calls Lovable AI → Gemini 2.5 Flash analyzes image
6. AI returns JSON → { vendor, amount, due_date, category, confidence }
7. Function saves to DB → bills table with ocr_* columns
8. Function returns to client → { success: true, extraction: {...}, bill: { id } }
9. UI shows success → Toast + green box with extracted data
10. Bill appears in list → Refresh page or callback triggers refetch
```

Current status: **Function needs deployment** or **secrets missing**.
