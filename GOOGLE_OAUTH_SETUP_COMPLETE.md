# ✅ Google OAuth Setup - Verification Checklist

## Current Configuration

**Project ID**: `fbzfddgqfqjuvpjzvhfi`  
**Project URL**: `https://fbzfddgqfqjuvpjzvhfi.supabase.co`

## ✅ What's Already Configured

1. **Frontend Code** ✅
   - Google OAuth button added to `/auth` page
   - Callback handler (`AuthCallbackHandler`) ready
   - Redirect URL: `${window.location.origin}/auth?mode=callback`

2. **Supabase Client** ✅
   - Points to new project: `fbzfddgqfqjuvpjzvhfi`
   - Anon key configured correctly

3. **Auth Flow** ✅
   - Email/password sign-in/sign-up working
   - Google OAuth button triggers Supabase OAuth flow

## 🔧 Required Supabase Dashboard Settings

### 1. Google Provider Configuration ✅ (You said this is done)
- [✅] Google provider enabled
- [✅] Client ID added
- [✅] Client Secret added

### 2. Redirect URL Configuration (VERIFY THIS)

Go to: **Supabase Dashboard → Authentication → URL Configuration**

Add these redirect URLs (if not already present):

**For Development:**
```
http://localhost:5173/auth?mode=callback
http://localhost:3000/auth?mode=callback
```

**For Production:**
```
https://yourdomain.com/auth?mode=callback
```

**Site URL:**
- Development: `http://localhost:5173`
- Production: `https://yourdomain.com`

### 3. Google Cloud Console Configuration

Go to: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

Find your OAuth 2.0 Client ID → Edit

**Authorized redirect URIs** - ADD THIS:
```
https://fbzfddgqfqjuvpjzvhfi.supabase.co/auth/v1/callback
```

**Authorized JavaScript origins** - ADD THESE:
```
http://localhost:5173
http://localhost:3000
https://yourdomain.com
```

## 🧪 Test the Integration

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Go to `/auth` page**

3. **Click "Continue with Google"**
   - Should redirect to Google sign-in
   - After signing in, redirects back to your app
   - Should land on `/dashboard` with authenticated session

4. **Verify user session:**
   - User email should be available
   - User profile should be created in `profiles` table
   - All app features should work (bills, reminders, etc.)

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"
- Verify callback URL in Google Cloud Console matches exactly:
  `https://fbzfddgqfqjuvpjzvhfi.supabase.co/auth/v1/callback`

### Error: "Invalid credentials"
- Double-check Client ID and Client Secret in Supabase dashboard
- Make sure Google provider is enabled (green toggle)

### User not redirected back to app
- Check Supabase Redirect URLs include your app's callback URL
- Format: `http://localhost:5173/auth?mode=callback` (for dev)

### Session not persisting
- Check browser console for errors
- Verify Supabase client is using correct project URL
- Check `AuthCallbackHandler` is processing the callback correctly

## 📋 Complete Flow

```
1. User clicks "Continue with Google"
   ↓
2. Supabase redirects to Google OAuth
   ↓
3. User signs in with Google
   ↓
4. Google redirects to: https://fbzfddgqfqjuvpjzvhfi.supabase.co/auth/v1/callback
   ↓
5. Supabase processes OAuth, creates session
   ↓
6. Supabase redirects to: http://localhost:5173/auth?mode=callback
   ↓
7. AuthCallbackHandler processes callback, establishes session
   ↓
8. User redirected to /dashboard (authenticated)
```

## ✅ Verification Commands

```bash
# Test connection
node scripts/test-google-oauth.mjs

# Test full app
npm run dev
# Then visit http://localhost:5173/auth and click "Continue with Google"
```

## 🎯 Current Status

✅ **Code**: Fully configured and ready  
✅ **Supabase Provider**: Enabled with credentials  
⚠️ **Redirect URLs**: Need to verify in Supabase Dashboard  
⚠️ **Google Cloud Console**: Need to verify callback URL

Once redirect URLs are configured, Google OAuth should work perfectly!

