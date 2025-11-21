# 🔧 Fix 403 Error on Lovable Preview

## Problem
You're seeing a Google 403 error when accessing `/auth` on Lovable preview. This happens because the Lovable preview URL isn't authorized in Google OAuth settings.

## ✅ Quick Fix Steps

### 1. Add Lovable URL to Google Cloud Console (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID (the one used for Supabase)
3. Click **Edit**
4. Under **Authorized JavaScript origins**, ADD:
   ```
   https://lovable.dev
   ```
   (or use the specific Lovable preview URL if you have it)
5. Under **Authorized redirect URIs**, verify this is present:
   ```
   https://fbzfddgqfqjuvpjzvhfi.supabase.co/auth/v1/callback
   ```
6. Click **Save**

### 2. Add Lovable URL to Supabase Redirect URLs (2 minutes)

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/auth/url-configuration
2. Under **Redirect URLs**, ADD:
   ```
   https://lovable.dev/projects/*/auth?mode=callback
   ```
   OR if you have the specific project URL:
   ```
   https://lovable.dev/projects/038b72b2-e409-48f5-b21b-1eb3722060f1/auth?mode=callback
   ```
3. Click **Save**

### 3. Alternative: Use Email/Password for Now

If you can't add Lovable URLs to Google OAuth immediately:

**The email/password sign-in should still work!** 

Just use the email/password form instead of the Google button while testing on Lovable.

## 🧪 Test After Fix

1. Refresh the Lovable preview
2. Go to `/auth` page
3. Try "Continue with Google" - should work now
4. Or use email/password sign-in

## 📝 Note

- Lovable preview URLs are dynamic, so you might need to add wildcards
- For production, use your actual domain
- The 403 error only affects Google OAuth, not email/password

## ⚡ Quick Workaround

**For now, just use email/password sign-in on Lovable preview!**

The email/password form works perfectly and doesn't require any Google OAuth configuration. Google OAuth is mainly for production/live sites.

