#!/bin/bash

# Deploy Email Broadcast Edge Function
# This script deploys the send-broadcast-email edge function to Supabase

echo "🚀 Deploying Email Broadcast Edge Function..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "   Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged into Supabase CLI."
    echo "   Login with: supabase login"
    exit 1
fi

# Deploy the function
echo "📦 Deploying send-broadcast-email function..."
supabase functions deploy send-broadcast-email

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edge function deployed successfully!"
    echo ""
    echo "⚠️  IMPORTANT: Next steps:"
    echo "   1. Go to Supabase Dashboard → Edge Functions → Secrets"
    echo "   2. Add RESEND_API_KEY with your Resend API key"
    echo "   3. (Optional) Add RESEND_FROM for custom from address"
    echo ""
    echo "   Get your Resend API key from: https://resend.com/api-keys"
else
    echo ""
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi

