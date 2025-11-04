# Payment Setup Guide

## Payment Link Error Fix

The "Payment Link Error" occurs because the Razorpay edge function needs to be deployed and configured. Here's how to fix it:

### 1. Deploy Razorpay Edge Function

1. Go to Supabase Dashboard → Edge Functions
2. Create a new function called `create-razorpay-order`
3. Copy the code from `supabase/functions/create-razorpay-order/index.ts`
4. Set these secrets in Supabase:
   - `RAZORPAY_KEY_ID` - Your Razorpay Key ID
   - `RAZORPAY_KEY_SECRET` - Your Razorpay Key Secret

### 2. Configure Razorpay Webhook

1. Deploy the `razorpay-webhook` edge function
2. Set secret: `RAZORPAY_WEBHOOK_SECRET` - Your Razorpay webhook secret
3. In Razorpay Dashboard → Settings → Webhooks:
   - Add webhook URL: `https://your-project.supabase.co/functions/v1/razorpay-webhook`
   - Enable events: `payment_link.paid`, `payment.captured`

## Admin CMS Access

- **URL**: `/admin-cms`
- **Password**: `Deathground333`
- **Features**:
  - View all payments
  - View all users and their plans
  - Manually update user plans
  - See payment history

## Payment Notifications

When a payment is completed via Razorpay webhook:
- **Email**: joshuavaz55@gmail.com
- **SMS**: 8828447880

Notifications are automatically sent when:
- Payment is captured via Razorpay
- Payment link is paid
- Plan is manually updated in Admin CMS

## Manual Plan Updates

In Admin CMS:
1. Go to "Users & Plans" or "Manage Plans" tab
2. Select a user
3. Use the dropdown to change their plan (Free/Pro/Premium)
4. Plan updates immediately and admin is notified

