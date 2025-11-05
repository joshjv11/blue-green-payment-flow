# Quick Deploy Instructions for Email Broadcast

## Option 1: Install Supabase CLI and Deploy

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Login to Supabase (if not already logged in)
```bash
supabase login
```

### Step 3: Link your project (if not already linked)
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
You can find your project ref in Supabase Dashboard → Settings → General

### Step 4: Deploy the edge function
```bash
supabase functions deploy send-broadcast-email
```

## Option 2: Deploy via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Edge Functions**
4. Click **"Create a new function"** or **"Deploy from local"**
5. Upload the contents of `supabase/functions/send-broadcast-email/index.ts`

## Option 3: Use Supabase CLI via npx (No Global Install)

If you don't want to install globally:

```bash
npx supabase functions deploy send-broadcast-email
```

But first, you'll need to login:
```bash
npx supabase login
```

## After Deployment: Configure Secrets

1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add these secrets:

   **Required:**
   - `RESEND_API_KEY` = Your Resend API key (get from https://resend.com/api-keys)

   **Optional:**
   - `RESEND_FROM` = `InvoiceFlow <no-reply@invoiceflow.dev>` (or your custom from address)

## Test the Deployment

After deploying, test it by sending an email from the Admin CMS → Email Broadcast tab.

If you see errors, check:
- Supabase Dashboard → Edge Functions → Logs
- Make sure RESEND_API_KEY is set correctly
- Verify your Resend account is active

