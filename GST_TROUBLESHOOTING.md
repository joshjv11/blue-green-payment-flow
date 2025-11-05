# 🔧 GST Features - Troubleshooting Guide

## **Error: "Edge Function returned a non-2xx status code"**

This error means the edge function is deployed but returning an error. Here's how to fix it:

---

## **Step 1: Check Edge Function Logs**

1. Go to **Supabase Dashboard** → **Edge Functions** → **reconcile-itc**
2. Click **"Logs"** tab
3. Look for the most recent error
4. Common errors you'll see:

### **Error 1: "No purchase orders found"**
**Status:** 404
**Fix:** 
- Add purchase orders first in the Purchases page
- Or select a different period that has purchase orders

### **Error 2: "ITC reconciliation is available only for Premium plan users"**
**Status:** 403
**Fix:**
- Upgrade to Premium plan
- Or verify your plan is active in `/settings`

### **Error 3: "relation does not exist" or "table does not exist"**
**Status:** 500
**Fix:**
- Run database migrations:
  ```bash
  npx supabase db push
  ```
- Or manually run the migration SQL in Supabase SQL Editor

### **Error 4: "function decrypt_gstn_password does not exist"**
**Status:** 500
**Fix:**
- Run the encryption migration:
  ```sql
  -- Run this in Supabase SQL Editor
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  
  CREATE OR REPLACE FUNCTION public.encrypt_gstn_password(password TEXT, user_id UUID)
  RETURNS TEXT
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    key TEXT := user_id::text || 'GST_SALT_v1';
  BEGIN
    RETURN encode(pgp_sym_encrypt(password::text, key), 'base64');
  END;
  $$;
  
  CREATE OR REPLACE FUNCTION public.decrypt_gstn_password(encrypted_password TEXT, user_id UUID)
  RETURNS TEXT
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    key TEXT := user_id::text || 'GST_SALT_v1';
  BEGIN
    RETURN pgp_sym_decrypt(decode(encrypted_password, 'base64'), key);
  END;
  $$;
  ```

---

## **Step 2: Verify Database Tables Exist**

Run this in **Supabase SQL Editor**:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('itc_reconciliation', 'purchase_orders', 'gst_mismatch_alerts', 'gstn_credentials', 'hsn_suggestions')
ORDER BY table_name;

-- Check if RPC functions exist
SELECT proname 
FROM pg_proc 
WHERE proname IN ('encrypt_gstn_password', 'decrypt_gstn_password');
```

**Expected:** Should show all tables and functions listed above.

**If missing:** Run migrations from `supabase/migrations/` folder.

---

## **Step 3: Common Fixes**

### **Fix 1: Missing Purchase Orders**
- Go to `/purchases` page
- Add at least one purchase order
- Try reconciliation again

### **Fix 2: Missing Database Tables**
- Run: `npx supabase db push`
- Or apply migrations manually in SQL Editor

### **Fix 3: Missing RPC Functions**
- Run the encryption migration (see Error 4 above)
- Verify with the SQL check above

### **Fix 4: Wrong Plan**
- Check your plan at `/settings`
- Upgrade to Premium if needed
- Verify plan is active

---

## **Step 4: Test Edge Function Directly**

In **Supabase Dashboard** → **Edge Functions** → **reconcile-itc** → **"Invoke"** tab:

**Test payload:**
```json
{
  "period": "2025-01",
  "auto_download_form2a": false
}
```

**Check response:**
- ✅ 200 = Working
- ❌ 404 = No purchase orders
- ❌ 403 = Not Premium plan
- ❌ 500 = Database/function error

---

## **Quick Diagnostic Checklist**

- [ ] Edge function deployed? (Check Supabase Dashboard)
- [ ] Premium plan active? (Check `/settings`)
- [ ] Purchase orders exist? (Check `/purchases`)
- [ ] Database tables exist? (Run SQL check above)
- [ ] RPC functions exist? (Run SQL check above)
- [ ] Check Edge Function logs for specific error

---

## **Still Not Working?**

1. **Check browser console** (F12 → Console) for detailed error
2. **Check Edge Function logs** in Supabase Dashboard
3. **Share the error message** from logs for specific help

---

**Most Common Issue:** Missing database tables or RPC functions. Run migrations first! 🚀

