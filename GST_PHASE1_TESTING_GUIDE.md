# 🧪 GST Phase 1 Testing Guide

## ✅ **Test Checklist**

- [ ] 1. Password Encryption (CRITICAL)
- [ ] 2. ITC Reconciliation with Form 2A/2B
- [ ] 3. Auto-Sync E-Invoice Status
- [ ] 4. HSN Code Suggestions & Confirmation

---

## 🔐 **Test 1: Password Encryption**

### **What to Test:**
Verify that GSTN passwords are encrypted in the database and can be decrypted correctly.

### **Steps:**

#### **A. Save Credentials (Frontend)**
1. **Navigate to E-Invoice Settings:**
   ```
   http://localhost:5173/einvoice-settings
   ```
   (Or your deployed URL)

2. **Fill in test credentials:**
   - GSTIN: `29ABCDE1234F1Z5` (use a valid format, even if fake)
   - Username: `test_user`
   - Password: `TestPassword123!`
   - API Endpoint: `https://einvoice.gst.gov.in`

3. **Click "Save Credentials"**
   - ✅ Should show success toast: "Credentials Saved! ✅"

#### **B. Verify Encryption in Database**
1. **Open Supabase Dashboard → SQL Editor**

2. **Run this query to check if password is encrypted:**
   ```sql
   SELECT 
     id,
     user_id,
     gstin,
     username,
     password_encrypted,  -- Should be base64 encoded, NOT plain text
     api_endpoint,
     created_at
   FROM gstn_credentials
   WHERE user_id = auth.uid()  -- Or use your user ID
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **Expected Result:**
   - ✅ `password_encrypted` should be a long base64 string (e.g., `"cGdwLXN5bS1lbmNyeXB0ZWQ..."`)
   - ❌ Should NOT be `"TestPassword123!"` (plain text)

#### **C. Test Decryption Function**
```sql
-- Test decryption (should return original password)
SELECT 
  password_encrypted,
  decrypt_gstn_password(
    password_encrypted,
    user_id
  ) as decrypted_password
FROM gstn_credentials
WHERE user_id = auth.uid()
LIMIT 1;
```

**Expected:** `decrypted_password` should be `TestPassword123!`

#### **D. Test Edge Function Decryption**
1. **Test via Supabase Dashboard → Edge Functions → `generate-einvoice`**

2. **Or use curl:**
   ```bash
   curl -X POST \
     https://YOUR_PROJECT.supabase.co/functions/v1/generate-einvoice \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "sales_order_id": "test-id",
       "action": "generate_irn"
     }'
   ```

3. **Check logs:**
   - Should NOT show plain password in logs
   - Should successfully decrypt and use password for GSTN API call

---

## 🔄 **Test 2: ITC Reconciliation with Form 2A/2B**

### **Prerequisites:**
- You need real GSTN credentials (or sandbox credentials)
- At least one purchase order in your database

### **Steps:**

#### **A. Prepare Test Data**
1. **Create a test purchase order:**
   ```sql
   INSERT INTO purchase_orders (
     user_id,
     invoice_number,
     transaction_date,
     supplier_gstin,
     tax_amount,
     grand_total,
     status
   ) VALUES (
     auth.uid(),
     'PO-TEST-001',
     CURRENT_DATE,
     '29ABCDE1234F1Z5',  -- Supplier GSTIN
     100.00,  -- Tax amount
     1100.00,  -- Total
     'pending'
   );
   ```

#### **B. Trigger Reconciliation**
1. **Via Supabase Dashboard → Edge Functions → `reconcile-itc`**

2. **Or use curl:**
   ```bash
   curl -X POST \
     https://YOUR_PROJECT.supabase.co/functions/v1/reconcile-itc \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "period": "2025-01",
       "auto_download_form2a": true
     }'
   ```

#### **C. Verify Results**
1. **Check ITC Reconciliation Table:**
   ```sql
   SELECT 
     invoice_number,
     invoice_date,
     tax_amount,
     itc_eligible,
     reconciliation_status,
     form2a_2b_status,
     mismatch_reason,
     reconciled_at
   FROM itc_reconciliation
   WHERE user_id = auth.uid()
   ORDER BY reconciled_at DESC;
   ```

2. **Expected Results:**
   - ✅ `reconciliation_status` should be: `"matched"`, `"mismatch"`, or `"missing"`
   - ✅ If Form 2A/2B downloaded: `form2a_2b_status` should be populated
   - ✅ If mismatch: `mismatch_reason` should explain the difference

3. **Check Mismatch Alerts:**
   ```sql
   SELECT 
     alert_type,
     severity,
     title,
     description,
     mismatch_details,
     is_resolved
   FROM gst_mismatch_alerts
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC;
   ```

#### **D. Test Form 2A/2B Download Function**
Check Edge Function logs for:
- ✅ "GSTN auth successful"
- ✅ "GSTR-2B fetch successful"
- ✅ "Normalized X invoices from Form 2B"

**If using sandbox/test credentials:**
- The endpoint might return mock data
- Verify the function handles the response structure correctly

---

## 🔄 **Test 3: Auto-Sync E-Invoice Status**

### **Steps:**

#### **A. Create Test Invoice with IRN**
1. **Create a sales order with IRN:**
   ```sql
   UPDATE sales_orders
   SET 
     irn = 'TEST-IRN-1234567890',
     irn_generated_at = NOW() - INTERVAL '1 day',
     einvoice_status = 'generated',
     einvoice_synced_at = NULL  -- Stale or missing
   WHERE user_id = auth.uid()
   LIMIT 1;
   ```

#### **B. Manually Trigger Auto-Sync**
1. **Via Supabase Dashboard → Edge Functions → `auto-sync-einvoice-status`**

2. **Or use curl:**
   ```bash
   curl -X POST \
     https://YOUR_PROJECT.supabase.co/functions/v1/auto-sync-einvoice-status \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```

#### **C. Verify Sync**
1. **Check updated invoices:**
   ```sql
   SELECT 
     id,
     invoice_number,
     irn,
     einvoice_status,
     einvoice_synced_at,
     gstn_response_data
   FROM sales_orders
   WHERE irn IS NOT NULL
     AND user_id = auth.uid()
   ORDER BY einvoice_synced_at DESC
   LIMIT 5;
   ```

2. **Expected Results:**
   - ✅ `einvoice_synced_at` should be updated to current timestamp
   - ✅ `einvoice_status` should be updated (e.g., `"approved"`, `"cleared"`)
   - ✅ `gstn_response_data` should contain status from GSTN

#### **D. Test Cron Job**
1. **Check Supabase Dashboard → Database → Cron Jobs**
   - Should see `auto-sync-einvoice-status` scheduled for every hour

2. **Wait 1 hour OR manually trigger via dashboard**

3. **Check logs:**
   - Should see sync activity every hour
   - Should process invoices with stale or missing sync timestamps

---

## 🎯 **Test 4: HSN Code Suggestions**

### **Steps:**

#### **A. Test HSN Suggestion API**
1. **Via curl:**
   ```bash
   curl -X POST \
     https://YOUR_PROJECT.supabase.co/functions/v1/suggest-hsn \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "product_description": "Mobile Phone",
       "category": "Electronics"
     }'
   ```

2. **Expected Response:**
   ```json
   {
     "success": true,
     "suggested_hsn": "8517",
     "confidence_score": 0.85,
     "description": "Telephone sets, including telephones for cellular networks",
     "from_cache": false,
     "source": "groq-llama"
   }
   ```

#### **B. Test Caching**
1. **Call suggestion API again with same product description**
2. **Expected:** `"from_cache": true` (if confirmed before)

#### **C. Test HSN Confirmation**
1. **Confirm a suggestion:**
   ```bash
   curl -X POST \
     https://YOUR_PROJECT.supabase.co/functions/v1/confirm-hsn \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "product_description": "Mobile Phone",
       "actual_hsn": "8517"
     }'
   ```

2. **Verify in database:**
   ```sql
   SELECT 
     product_description,
     suggested_hsn,
     actual_hsn,
     is_confirmed,
     confidence_score,
     ai_model
   FROM hsn_suggestions
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Expected:**
   - ✅ `is_confirmed` = `true`
   - ✅ `actual_hsn` = `"8517"`
   - ✅ `ai_model` = `"user-confirmed"`

#### **D. Test Cache-First Logic**
1. **Call suggestion API again**
2. **Expected:** Should return confirmed HSN without calling AI

---

## 🐛 **Troubleshooting**

### **Password Encryption Not Working:**
- ✅ Check if `pgcrypto` extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pgcrypto';`
- ✅ Verify RPC functions exist: `SELECT proname FROM pg_proc WHERE proname LIKE '%gstn_password%';`
- ✅ Check RLS policies allow execution

### **ITC Reconciliation Fails:**
- ✅ Verify GSTN credentials are correct
- ✅ Check GSTN API endpoint is accessible
- ✅ Verify purchase orders exist for the period
- ✅ Check Edge Function logs for GSTN API errors

### **Auto-Sync Not Running:**
- ✅ Verify cron is configured in `supabase/config.toml`
- ✅ Check Supabase Dashboard → Database → Cron Jobs
- ✅ Manually trigger to test if function works
- ✅ Check service role key is set correctly

### **HSN Suggestions Failing:**
- ✅ Verify `GROQ_API_KEY` is set in Edge Function secrets
- ✅ Check if `hsn_suggestions` table exists
- ✅ Verify user has Premium plan (for HSN feature)

---

## 📊 **Quick Verification Queries**

### **1. Check All GST Features Status:**
```sql
-- Encryption functions
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%gstn_password%';

-- Credentials count
SELECT COUNT(*) as total_credentials 
FROM gstn_credentials;

-- ITC reconciliations
SELECT 
  COUNT(*) as total_reconciliations,
  COUNT(*) FILTER (WHERE reconciliation_status = 'matched') as matched,
  COUNT(*) FILTER (WHERE reconciliation_status = 'mismatch') as mismatches
FROM itc_reconciliation;

-- HSN suggestions
SELECT 
  COUNT(*) as total_suggestions,
  COUNT(*) FILTER (WHERE is_confirmed = true) as confirmed
FROM hsn_suggestions;

-- E-invoice sync status
SELECT 
  COUNT(*) as total_with_irn,
  COUNT(*) FILTER (WHERE einvoice_synced_at IS NOT NULL) as synced
FROM sales_orders
WHERE irn IS NOT NULL;
```

---

## 🚀 **Next Steps After Testing**

1. ✅ **If all tests pass:** Deploy to production
2. ✅ **If issues found:** Check logs and fix accordingly
3. ✅ **Monitor:** Set up alerts for failed reconciliations or syncs

---

## 📝 **Test Results Template**

Copy this to track your testing:

```
## GST Phase 1 Test Results

**Date:** _______________
**Tester:** _______________

### Test 1: Password Encryption
- [ ] Frontend save works
- [ ] Password encrypted in DB
- [ ] Decryption function works
- [ ] Edge function decrypts successfully

### Test 2: ITC Reconciliation
- [ ] Purchase orders exist
- [ ] Form 2A/2B download works
- [ ] Reconciliation matches invoices
- [ ] Mismatch alerts created

### Test 3: Auto-Sync E-Invoice
- [ ] Manual trigger works
- [ ] Cron job scheduled
- [ ] Status updates correctly
- [ ] Sync timestamp updated

### Test 4: HSN Suggestions
- [ ] AI suggestion works
- [ ] Confirmation saves
- [ ] Cache-first logic works
- [ ] Confirmed HSN returned

**Overall Status:** ✅ PASS / ❌ FAIL
**Issues Found:** _______________
```

---

**Need help?** Check Edge Function logs in Supabase Dashboard → Edge Functions → Logs

