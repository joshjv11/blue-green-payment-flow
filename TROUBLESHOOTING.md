# 🔧 AI Coach Troubleshooting Guide

## Quick Diagnosis Steps

### 1. Check Supabase Edge Function Logs

**Where to find logs:**
1. Go to Supabase Dashboard
2. Navigate to: **Project** → **Edge Functions** → **ai-assistant**
3. Click **"Logs"** tab
4. Look for these log messages:

**✅ Success indicators:**
- `🔑 API Key Check: { hasGroqKey: true, groqKeyLength: XX }`
- `🆓 Attempting Groq API (free tier)...`
- `✅ Groq response received successfully`
- `✅ AI response prepared successfully`

**❌ Error indicators:**
- `🔑 API Key Check: { hasGroqKey: false }` → **API key not set!**
- `⚠️ Groq API key not found, skipping Groq` → **API key not found!**
- `⚠️ Groq API error: { status: 401 }` → **Invalid API key!**
- `⚠️ Groq API error: { status: 429 }` → **Rate limit exceeded!**

---

### 2. Check Browser Console Logs

**Open browser DevTools (F12) → Console tab**

**Look for these messages:**

**✅ Success flow:**
```
🤖 Calling AI assistant edge function...
🔍 Raw Supabase invoke response: { hasData: true, hasError: false }
📊 Edge function response breakdown: { hasData: true, hasError: false }
🤖 Processing edge function response: { success: true, hasResponse: true }
✅ Found response in data.response
✅ AI message added from edge function
```

**❌ Error flow:**
```
❌ Edge function returned error: ...
OR
❌ Could not extract response from edge function data: ...
```

---

### 3. Verify API Key Setup

**In Supabase Dashboard:**

1. Go to: **Project Settings** → **Edge Functions** → **Secrets**
2. Check if `GROQ_API_KEY` exists:
   - ✅ Should see: `GROQ_API_KEY` (with a value)
   - ❌ Should NOT see: `VITE_GROQ_API_KEY` (wrong prefix!)
3. If missing:
   - Click **"Add new secret"**
   - **Name:** `GROQ_API_KEY` (exactly this, no VITE_ prefix!)
   - **Value:** Your Groq API key (starts with `gsk_`)
   - Click **"Add secret"**

---

### 4. Verify Edge Function Deployment

**The edge function code must be deployed after setting the secret!**

**Deploy via Supabase CLI:**
```bash
# Make sure you're in the project root
cd /path/to/blue-green-payment-flow

# Deploy the edge functions
supabase functions deploy ai-assistant
supabase functions deploy ai-assistant-enhanced
```

**OR deploy via Dashboard:**
1. Go to: **Edge Functions** → **ai-assistant**
2. Click **"Deploy"** or **"Redeploy"**
3. Repeat for **ai-assistant-enhanced**

---

### 5. Test Edge Function Directly

**Test the edge function health check:**

```bash
# Get your Supabase URL and anon key from Dashboard
curl https://YOUR_PROJECT.supabase.co/functions/v1/ai-assistant \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Should return:**
```json
{
  "status": "healthy",
  "service": "ai-assistant",
  "timestamp": "2025-..."
}
```

If this fails, the edge function isn't deployed correctly.

---

## Common Issues & Solutions

### Issue 1: "No API keys configured"

**Problem:** Edge function can't find `GROQ_API_KEY`

**Solution:**
1. ✅ Go to Supabase Dashboard → **Edge Functions** → **Secrets**
2. ✅ Add secret: `GROQ_API_KEY` (without `VITE_` prefix!)
3. ✅ Redeploy edge functions after adding secret

---

### Issue 2: "Groq API key not found, skipping Groq"

**Problem:** API key exists in secrets but edge function can't read it

**Possible causes:**
1. Secret was added but edge function not redeployed
2. Secret name is wrong (has `VITE_` prefix)
3. Edge function is using old code

**Solution:**
1. Verify secret name is exactly `GROQ_API_KEY` (check for typos)
2. Redeploy edge function after adding/updating secret
3. Check edge function logs to confirm key is detected

---

### Issue 3: "Groq API error: 401"

**Problem:** Invalid API key

**Solution:**
1. Verify your Groq API key is correct
2. Get a new key from: https://console.groq.com
3. Update the secret in Supabase
4. Redeploy edge function

---

### Issue 4: "Groq API error: 429"

**Problem:** Rate limit exceeded

**Solution:**
- Wait a few minutes and try again
- Groq free tier: 14,400 requests/day
- If consistently hitting limits, consider adding `OPENAI_API_KEY` as fallback

---

### Issue 5: Response received but not showing in UI

**Problem:** Frontend can't parse edge function response

**Check browser console for:**
```
❌ Could not extract response from edge function data: ...
```

**Solution:**
1. Check the latest code is deployed (we added better response parsing)
2. Look at the console log: `📊 Edge function response breakdown`
3. Share the response structure with developer to fix parsing

---

## Verification Checklist

- [ ] `GROQ_API_KEY` is set in Supabase Edge Functions secrets (not `VITE_GROQ_API_KEY`)
- [ ] Edge functions are deployed after setting the secret
- [ ] Edge function logs show: `🔑 API Key Check: { hasGroqKey: true }`
- [ ] Browser console shows successful edge function call
- [ ] Edge function logs show: `✅ Groq response received successfully`
- [ ] Frontend receives response and displays it

---

## Still Not Working?

**Share these logs:**

1. **Edge Function Logs** (from Supabase Dashboard)
   - Look for: `🔑 API Key Check`, `🆓 Attempting Groq`, `✅/❌` messages

2. **Browser Console Logs** (F12 → Console)
   - Look for: `🔍 Raw Supabase invoke response`, `📊 Edge function response breakdown`

3. **Network Tab** (F12 → Network)
   - Find the request to `/functions/v1/ai-assistant`
   - Check the **Response** tab for actual response data

These logs will help identify exactly where it's failing! 🔍

