#!/bin/bash

# Quick deployment script for GST Edge Functions
echo "🚀 Deploying GST Edge Functions..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found."
    echo "   Install it with: npm install -g supabase"
    echo ""
    echo "   Or use Homebrew: brew install supabase/tap/supabase"
    exit 1
fi

# Check if logged in
echo "📋 Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in. Please log in:"
    echo "   npx supabase login"
    exit 1
fi

echo "✅ Logged in"
echo ""

# Deploy functions
echo "📦 Deploying reconcile-itc..."
npx supabase functions deploy reconcile-itc
if [ $? -eq 0 ]; then
    echo "✅ reconcile-itc deployed"
else
    echo "❌ reconcile-itc deployment failed"
fi
echo ""

echo "📦 Deploying suggest-hsn..."
npx supabase functions deploy suggest-hsn
if [ $? -eq 0 ]; then
    echo "✅ suggest-hsn deployed"
else
    echo "❌ suggest-hsn deployment failed"
fi
echo ""

echo "📦 Deploying auto-sync-einvoice-status..."
npx supabase functions deploy auto-sync-einvoice-status
if [ $? -eq 0 ]; then
    echo "✅ auto-sync-einvoice-status deployed"
else
    echo "❌ auto-sync-einvoice-status deployment failed"
fi
echo ""

echo "🎉 Deployment complete!"
echo ""
echo "✅ You can now test the GST features in the dashboard"
echo "   Go to: /gst"

