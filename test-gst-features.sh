#!/bin/bash

# Quick GST Phase 1 Testing Script
# Run this after deploying functions and migrations

echo "🧪 GST Phase 1 Testing Script"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Install with: npm install -g supabase${NC}"
    exit 1
fi

# Get project details
echo -e "${YELLOW}📋 Checking Supabase project...${NC}"
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}' || echo "")
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ Supabase not running. Start with: supabase start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase URL: $SUPABASE_URL${NC}"
echo ""

# Test 1: Check encryption functions
echo -e "${YELLOW}🔐 Test 1: Checking password encryption functions...${NC}"
supabase db execute "
SELECT 
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ Encryption functions exist'
    ELSE '❌ Missing encryption functions'
  END as status
FROM pg_proc 
WHERE proname IN ('encrypt_gstn_password', 'decrypt_gstn_password');
" 2>/dev/null || echo -e "${RED}❌ Could not check encryption functions${NC}"

echo ""

# Test 2: Check if pgcrypto extension is enabled
echo -e "${YELLOW}🔐 Test 2: Checking pgcrypto extension...${NC}"
supabase db execute "
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ pgcrypto extension enabled'
    ELSE '❌ pgcrypto extension not enabled'
  END as status
FROM pg_extension 
WHERE extname = 'pgcrypto';
" 2>/dev/null || echo -e "${RED}❌ Could not check pgcrypto${NC}"

echo ""

# Test 3: List edge functions
echo -e "${YELLOW}🔧 Test 3: Checking edge functions...${NC}"
echo "Required functions:"
echo "  - generate-einvoice"
echo "  - reconcile-itc"
echo "  - auto-sync-einvoice-status"
echo "  - suggest-hsn"
echo "  - confirm-hsn"
echo ""
echo -e "${YELLOW}To deploy functions, run:${NC}"
echo "  supabase functions deploy generate-einvoice"
echo "  supabase functions deploy reconcile-itc"
echo "  supabase functions deploy auto-sync-einvoice-status"
echo "  supabase functions deploy suggest-hsn"
echo "  supabase functions deploy confirm-hsn"
echo ""

# Test 4: Check cron configuration
echo -e "${YELLOW}⏰ Test 4: Checking cron configuration...${NC}"
if grep -q "auto-sync-einvoice-status" supabase/config.toml; then
    echo -e "${GREEN}✅ Cron job configured in config.toml${NC}"
else
    echo -e "${RED}❌ Cron job not found in config.toml${NC}"
fi

echo ""

# Test 5: Database tables check
echo -e "${YELLOW}📊 Test 5: Checking database tables...${NC}"
supabase db execute "
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gstn_credentials') 
      THEN '✅ gstn_credentials table exists'
    ELSE '❌ gstn_credentials table missing'
  END as gstn_credentials,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'itc_reconciliation') 
      THEN '✅ itc_reconciliation table exists'
    ELSE '❌ itc_reconciliation table missing'
  END as itc_reconciliation,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hsn_suggestions') 
      THEN '✅ hsn_suggestions table exists'
    ELSE '❌ hsn_suggestions table missing'
  END as hsn_suggestions;
" 2>/dev/null || echo -e "${RED}❌ Could not check tables${NC}"

echo ""
echo -e "${GREEN}✅ Basic checks completed!${NC}"
echo ""
echo -e "${YELLOW}📖 Next Steps:${NC}"
echo "1. Open GST_PHASE1_TESTING_GUIDE.md for detailed testing instructions"
echo "2. Test password encryption by saving credentials in UI"
echo "3. Test ITC reconciliation via Edge Function"
echo "4. Test HSN suggestions via API"
echo ""
echo -e "${YELLOW}💡 Quick Test Commands:${NC}"
echo ""
echo "# Test HSN suggestion:"
echo "curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/suggest-hsn \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"product_description\": \"Mobile Phone\"}'"
echo ""
echo "# Test ITC reconciliation:"
echo "curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/reconcile-itc \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"period\": \"2025-01\", \"auto_download_form2a\": true}'"
echo ""

