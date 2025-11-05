# Deploy Email Broadcast Feature

## Step 1: Deploy the Edge Function

```bash
# Navigate to your project root
cd /Users/joshuavaz/Documents/blue-green-payment-flow

# Deploy the send-broadcast-email edge function
supabase functions deploy send-broadcast-email
```

## Step 2: Configure Resend API Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Edge Functions** → **Secrets**
4. Add a new secret:
   - **Key**: `RESEND_API_KEY`
   - **Value**: Your Resend API key (get it from https://resend.com/api-keys)

## Step 3: Configure From Email (Optional)

If you want to use a custom from email address:

1. In Supabase Edge Functions secrets, add:
   - **Key**: `RESEND_FROM`
   - **Value**: `Your Name <your-email@yourdomain.com>`

2. **Important**: The email domain must be verified in Resend:
   - Go to https://resend.com/domains
   - Add and verify your domain
   - Or use a verified email address

## Step 4: Verify Domain in Resend (For Custom Emails)

If you want to send from `no-reply@invoiceflow.dev`:

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter `invoiceflow.dev`
4. Add the DNS records shown to your domain registrar
5. Wait for verification (usually a few minutes)

## Step 5: Test the Feature

1. Go to Admin CMS → Email Broadcast tab
2. Compose a test email
3. Add your email as a recipient
4. Click "Send"
5. Check your inbox!

## Troubleshooting

### Error: "Edge Function Not Deployed"
- Make sure you ran `supabase functions deploy send-broadcast-email`
- Check that you're logged into Supabase CLI: `supabase login`

### Error: "Resend API key not configured"
- Go to Supabase Dashboard → Edge Functions → Secrets
- Add `RESEND_API_KEY` with your Resend API key

### Error: "Domain not verified"
- If using a custom from email, verify the domain in Resend
- Or use the default `InvoiceFlow <no-reply@invoiceflow.dev>` which should work if configured

### Error: "Failed to send email"
- Check Supabase Edge Function logs for detailed error messages
- Verify your Resend API key is valid
- Check that recipient emails are valid
- Ensure you haven't exceeded Resend rate limits

## Quick Test

Test the edge function directly:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-broadcast-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>Test message</p>",
    "text": "Test message"
  }'
```

Replace:
- `YOUR_PROJECT` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key

