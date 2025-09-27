# Auth V2 - Passwordless Authentication

## Overview
Auth V2 implements a modern, passwordless authentication system with Passkeys (WebAuthn), Magic Links, and OTP fallback.

## Features
- **Passkeys (WebAuthn)**: Primary authentication method with device-based biometric/PIN security
- **Magic Links**: One-click email authentication with instant login
- **OTP**: 6-digit codes via Email/SMS as fallback option
- **Auto-redirect**: Supports `?next=/path` parameters for seamless navigation
- **Offline detection**: Graceful handling of network connectivity issues

## Feature Flag
Set `AUTH_V2 = true` in `src/pages/Auth.tsx` to enable the new authentication flow. Set to `false` to use legacy authentication.

## Environment Variables
Required for full functionality:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://yqzzcvkgeoghirfrflzq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Site Configuration
SITE_URL=https://app.invoiceflow.in
```

## Supabase Settings
Configure the following in your Supabase dashboard:

### Authentication Settings
- **Site URL**: `https://app.invoiceflow.in`
- **Redirect URLs**:
  - `https://app.invoiceflow.in/auth/callback`
  - `https://app.invoiceflow.in/api/auth/callback`

### Email Settings
- Enable **Email (Magic Link)** authentication
- Disable **Confirm email** for faster testing
- Configure SMTP for reliable email delivery

### Phone Settings (Optional)
- Enable **Phone (SMS)** authentication for OTP fallback
- Configure SMS provider (Twilio recommended)

## Components
- `AuthV2Form`: Main authentication interface
- `AuthCallbackHandler`: Handles magic link/OAuth callbacks
- `AddPasskeyBanner`: Post-login passkey creation prompt
- `AuthGuard`: Session validation and refresh wrapper

## Analytics Events
The system tracks the following events:
- `auth_viewed`, `auth_passkey_prompted`, `auth_passkey_success`
- `auth_magiclink_sent`, `auth_magiclink_consumed`
- `auth_otp_sent`, `auth_otp_verified`
- `auth_error` (with error categorization)
- `auth_add_passkey_clicked`

## Usage
Users can access authentication at `/auth` with automatic method selection based on device capabilities. The system gracefully falls back from Passkeys → Magic Links → OTP as needed.