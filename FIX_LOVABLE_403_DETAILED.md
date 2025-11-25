# 🔧 Detailed Fix for Lovable 403 Error

## Problem
Even after adding Lovable URL to Google Cloud Console, you're still getting a 403 error.

## Root Cause
The redirect URL format might not match exactly what Google expects, or the Lovable preview URL pattern needs to be more specific.

## ✅ Complete Fix Steps

### 1. Google Cloud Console - Add EXACT URL Pattern

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID
3. Click **Edit**
4. Under **Authorized JavaScript origins**, ADD ALL OF THESE:
   ```
   https://lovable.dev
   https://lovable.dev/projects
   https://*.lovable.dev
   ```
5. Under **Authorized redirect URIs**, ADD/VERIFY:
   ```
   https://fbzfddgqfqjuvpjzvhfi.supabase.co/auth/v1/callback
   ```
   (This is the ONLY redirect URI you need - Supabase handles the redirect back to your app)
6. **IMPORTANT:** The redirect URI is the Supabase callback URL, NOT your Lovable URL!
7. Click **Save**

### 2. Supabase Dashboard - Add Lovable Redirect URLs

1. Go to: https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/auth/url-configuration
2. Under **Redirect URLs**, ADD:
   ```
   https://lovable.dev/projects/*/auth?mode=callback
   https://lovable.dev/projects/*/auth
   https://lovable.dev/**/auth?mode=callback
   ```
3. Set **Site URL** to:
   ```
   https://lovable.dev
   ```
4. Click **Save**

### 3. Check the Code - Verify Redirect URL

The code should use:
```javascript
redirectTo: `${window.location.origin}/auth?mode=callback`
```

This will automatically use whatever origin Lovable provides (e.g., `https://lovable.dev/projects/...`)

## 🔍 Debugging Steps

### Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try clicking "Continue with Google"
4. Look for any error messages
5. Share the error if you see one

### Check Network Tab

1. Open DevTools → Network tab
2. Try Google sign-in
3. Look for failed requests
4. Check the exact URL being called

## ⚠️ Common Issues

### Issue 1: Redirect URI Mismatch
**Error**: "redirect_uri_mismatch"

**Fix**: Only add the Supabase callback URL to Google Cloud Console redirect URIs:
```
https://fbzfddgqfqjuvpjzvhfi.supabase.co/auth/v1/callback
```

**Don't add your Lovable URL to redirect URIs** - only add it to JavaScript origins!

### Issue 2: CORS Error
**Error**: CORS policy blocked

**Fix**: Make sure `https://lovable.dev` is in **Authorized JavaScript origins** (not redirect URIs)

### Issue 3: Supabase Not Redirecting Back
**Error**: Stuck on Google page

**Fix**: Add Lovable URL pattern to Supabase **Redirect URLs**:
```
https://lovable.dev/projects/*/auth?mode=callback
```

## 🎯 Correct Configuration Summary

### Google Cloud Console:
- **JavaScript Origins**: `https://lovable.dev`, `https://*.lovable.dev`
- **Redirect URIs**: `https://fbzfddgqfqjuvpjzvhfi.supabase.co/auth/v1/callback` (ONLY THIS ONE!)

### Supabase Dashboard:
- **Site URL**: `https://lovable.dev`
- **Redirect URLs**: 
  - `https://lovable.dev/projects/*/auth?mode=callback`
  - `http://localhost:5173/auth?mode=callback` (for local dev)

## 🧪 Test After Fix

1. Clear browser cache/cookies
2. Refresh Lovable preview
3. Go to `/auth`
4. Click "Continue with Google"
5. Should redirect to Google sign-in (not 403!)
6. After sign-in, should redirect back to Lovable with session

## 💡 Still Not Working?

**Use email/password for now!** It works perfectly without any Google OAuth setup.

The email/password form is fully functional and doesn't require any external configuration.



