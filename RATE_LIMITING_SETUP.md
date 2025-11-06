# 🛡️ Rate Limiting Setup Guide

## Overview

Rate limiting has been added to critical edge functions to prevent API abuse and reduce financial risk (especially for WhatsApp API calls).

## What's Protected

1. **send-whatsapp-message** - 100 messages/hour per user
2. **send-whatsapp-broadcast** - 10 broadcasts/hour per user (more restrictive)
3. **generate-payment-link** - 100 links/hour per user
4. **ai-assistant** - 100 queries/hour per user
5. **ai-assistant-enhanced** - 100 queries/hour per user

## How It Works

### Upstash Redis (Recommended)
- Uses Upstash Redis for distributed rate limiting
- Works across multiple edge function instances
- **FREE Tier:** 10,000 requests/day

### In-Memory Fallback
- If Upstash is not configured, falls back to in-memory rate limiting
- Works per-instance (not distributed)
- Still provides protection for single-instance deployments

## Setup Instructions

### Step 1: Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Click **"Create Database"**
3. Choose:
   - **Type:** Redis
   - **Region:** Choose closest to your Supabase region
   - **Plan:** Free (10,000 requests/day)
4. Click **"Create"**

### Step 2: Get Connection Details

After creating the database:

1. Click on your database
2. Find **"REST API"** section
3. Copy:
   - **UPSTASH_REDIS_REST_URL** (e.g., `https://us1-xxx-xxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** (long token string)

### Step 3: Add to Supabase Secrets

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Add two secrets:

   ```
   Name: UPSTASH_REDIS_REST_URL
   Value: https://us1-xxx-xxx.upstash.io
   ```

   ```
   Name: UPSTASH_REDIS_REST_TOKEN
   Value: your-token-here
   ```

5. Click **"Save"** for each

### Step 4: Deploy Edge Functions

The rate limiting code is already in the functions. Just redeploy:

```bash
# If using Supabase CLI
supabase functions deploy send-whatsapp-message
supabase functions deploy send-whatsapp-broadcast
supabase functions deploy generate-payment-link
supabase functions deploy ai-assistant
supabase functions deploy ai-assistant-enhanced
```

Or they will auto-deploy via GitHub Actions on your next push.

## Rate Limit Configuration

Current limits are set in each function:

```typescript
// Example: WhatsApp messages
await checkRateLimit(identifier, {
  limit: 100,        // 100 requests
  window: "1 h",     // per hour
  prefix: "whatsapp:send"  // unique prefix
});
```

### Adjusting Limits

To change limits, edit the function files:

- `supabase/functions/send-whatsapp-message/index.ts`
- `supabase/functions/send-whatsapp-broadcast/index.ts`
- `supabase/functions/generate-payment-link/index.ts`
- `supabase/functions/ai-assistant/index.ts`
- `supabase/functions/ai-assistant-enhanced/index.ts`

## Testing

### Test Rate Limiting

1. Make 101 requests to any protected function within 1 hour
2. The 101st request should return:
   ```json
   {
     "error": "Rate limit exceeded",
     "message": "You've exceeded the limit of 100 ... per hour. Please try again later.",
     "reset": 1234567890
   }
   ```
3. Status code: `429 Too Many Requests`
4. Response headers:
   - `Retry-After`: Seconds until limit resets
   - `X-RateLimit-Limit`: Maximum requests
   - `X-RateLimit-Remaining`: Requests remaining
   - `X-RateLimit-Reset`: Unix timestamp when limit resets

### Test Without Upstash

If Upstash is not configured, rate limiting still works using in-memory fallback. However:
- It's per-instance (not distributed)
- Limits reset when function restarts
- Still protects against basic abuse

## Monitoring

### Check Rate Limit Usage

1. Go to Upstash Console → Your Database
2. Click **"Metrics"** tab
3. View:
   - Request count
   - Data transfer
   - Latency

### Check Function Logs

1. Go to Supabase Dashboard → Edge Functions
2. Click on a function (e.g., `send-whatsapp-message`)
3. View **"Logs"** tab
4. Look for rate limit messages:
   - `Rate limit exceeded for identifier: user:xxx`
   - `Rate limit check successful`

## Cost

**Upstash Free Tier:**
- 10,000 requests/day
- 256 MB storage
- Perfect for development and small apps

**If you exceed free tier:**
- Pay-as-you-go pricing
- Very affordable (~$0.20 per 100k requests)
- No credit card required for free tier

## Troubleshooting

### Rate Limiting Not Working

1. **Check Secrets:**
   - Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
   - Check in Supabase Dashboard → Edge Functions → Secrets

2. **Check Function Logs:**
   - Look for "Upstash rate limit check failed" messages
   - Should fall back to in-memory if Upstash fails

3. **Test Connection:**
   - Test Upstash REST API directly:
     ```bash
     curl -X POST "YOUR_UPSTASH_REDIS_REST_URL/pipeline" \
       -H "Authorization: Bearer YOUR_TOKEN" \
       -H "Content-Type: application/json" \
       -d '[["PING"]]'
     ```

### Rate Limits Too Strict

Increase limits in function files:
- Change `limit: 100` to `limit: 200` (or desired number)
- Redeploy functions

### Rate Limits Too Loose

Decrease limits in function files:
- Change `limit: 100` to `limit: 50` (or desired number)
- Redeploy functions

## Benefits

✅ **Prevents API Abuse** - Stops malicious users from spamming
✅ **Reduces Costs** - Prevents runaway WhatsApp/Twilio charges
✅ **Improves Performance** - Reduces load on external APIs
✅ **Better UX** - Fair usage for all users
✅ **FREE** - Upstash free tier covers most use cases

## Summary

Rate limiting is now active on all critical functions. Setup is optional (Upstash) but recommended for production. The in-memory fallback provides basic protection even without Upstash.

**Next Steps:**
1. Create Upstash account (free)
2. Add secrets to Supabase
3. Redeploy functions (or wait for auto-deploy)
4. Monitor usage in Upstash dashboard

