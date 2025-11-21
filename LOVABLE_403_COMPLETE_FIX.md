# 🔧 Complete Fix for Lovable 403 Error

## ⚠️ Critical Understanding

The 403 error happens because **Google is blocking the OAuth request** before it even reaches Supabase. This is a **Google Cloud Console configuration issue**.

## ✅ Exact Configuration Needed

### Step 1: Google Cloud Console - JavaScript Origins

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your **OAuth 2.0 Client ID** (the one for Supabase)
3. Click **Edit**
4. Under **Authorized JavaScript origins**, ADD:
   ```
   https://lovable.dev
   https://lovable.dev/projects
   https://*.lovable.dev
   ```
5. **DO NOT ADD** Lovable URLs to **Authorized redirect URIs** - only add them to JavaScript origins!
6. Click **Save**

### Step 2: Google Cloud Console - Redirect URIs

Under **Authorized redirect URIs**, you should ONLY have:
```
https://fbzfddgqfqjuvpjzvhfi.supabase.co/auth/v1/callback
```

**That's it!** Don't add any Lovable URLs here. Supabase handles the redirect.

### Step 3: Supabase Dashboard - Redirect URLs

1. Go to: https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/auth/url-configuration
2. Under **Redirect URLs**, ADD:
   ```
   https://lovable.dev/projects/*/auth?mode=callback
   https://lovable.dev/**/auth?mode=callback
   ```
3. Set **Site URL** to: `https://lovable.dev`
4. Click **Save**

## 🔍 Debug Steps

### Check What URL Is Being Used

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Click "Continue with Google"
4. Look at the URL in the address bar when Google redirects appears
5. Note the exact origin being used

### Check Browser Console for Errors

Look for messages like:
- "redirect_uri_mismatch"
- "origin_mismatch"
- "access_denied"

## 🎯 Most Common Issue

**Problem**: Added Lovable URL to **Redirect URIs** instead of **JavaScript Origins**

**Fix**: 
- ✅ Lovable URL goes in **JavaScript Origins** only
- ✅ Supabase callback URL goes in **Redirect URIs** only

## 💡 Alternative: Disable Google Button Temporarily

If it's still not working, we can hide the Google button on Lovable and only show email/password:

Would you like me to:
1. **Option A**: Keep trying to fix Google OAuth (might take a few more config attempts)
2. **Option B**: Hide Google button on Lovable, show only email/password (works immediately)

Email/password works perfectly on Lovable without any external config!

