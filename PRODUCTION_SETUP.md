# Production Deployment Setup

## Why it works on localhost but not production

- **Localhost**: Frontend has `VITE_GROQ_API_KEY` in `.env` file → works directly
- **Production**: Frontend doesn't have environment variables → falls back to edge function → but edge function also needs API key!

## ✅ Quick Fix - Set Supabase Secret

The edge function needs `GROQ_API_KEY` (without `VITE_` prefix) in Supabase secrets.

### Steps:

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project
   - Go to: **Project Settings** → **Edge Functions** → **Secrets**

2. **Add the secret:**
   - Click **"Add new secret"**
   - **Name:** `GROQ_API_KEY`
   - **Value:** Your Groq API key (e.g., `gsk_...`)
   - Click **"Add secret"**

3. **Redeploy edge functions:**
   ```bash
   # If you have Supabase CLI installed:
   supabase functions deploy ai-assistant
   supabase functions deploy ai-assistant-enhanced
   ```

   OR manually redeploy from Supabase Dashboard:
   - Go to **Edge Functions** section
   - Click **"Deploy"** for `ai-assistant` and `ai-assistant-enhanced`

4. **Test it:**
   - Refresh your production site
   - Try the AI coach again
   - It should work now! ✅

---

## Alternative: Set Frontend Environment Variable

If you prefer the frontend to call Groq directly (like on localhost), you can also set `VITE_GROQ_API_KEY` in your deployment platform:

### For Vercel:
1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `VITE_GROQ_API_KEY`
   - **Value:** Your Groq API key
   - **Environment:** Production, Preview, Development
3. Redeploy

### For Netlify:
1. Go to Netlify Dashboard → Your Site → **Site Settings** → **Environment Variables**
2. Add:
   - **Key:** `VITE_GROQ_API_KEY`
   - **Value:** Your Groq API key
   - **Scopes:** Production, Deploy previews, Branch deploys
3. Redeploy

---

## Recommended: Use Supabase Secrets

**Why use Supabase secrets instead of frontend env vars?**
- ✅ More secure (API key not exposed in frontend code)
- ✅ Works for all users (not dependent on deployment platform)
- ✅ Centralized configuration

Just set `GROQ_API_KEY` in Supabase secrets and you're done! 🎉

