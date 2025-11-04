# Quick Start Guide - Pro Features

## 🔧 File Access Issue

If you can't open `schedule-bill-reminders-enhanced/index.ts`, try these methods:

### Method 1: Open in VS Code
```bash
code supabase/functions/schedule-bill-reminders-enhanced/index.ts
```

### Method 2: Open in Finder (Mac)
```bash
open supabase/functions/schedule-bill-reminders-enhanced/
```

### Method 3: View in Terminal
```bash
cat supabase/functions/schedule-bill-reminders-enhanced/index.ts
```

### Method 4: Copy Full Path
Full path: `/Users/joshuavaz/Documents/blue-green-payment-flow/supabase/functions/schedule-bill-reminders-enhanced/index.ts`

## 📋 Immediate Next Steps

### 1. Run Database Migration (REQUIRED)

**Option A: Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/sql/new
2. Open file: `supabase/migrations/20250112000002_add_pro_commuter_features.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click "Run"

**Option B: Terminal (if you have Supabase CLI)**
```bash
supabase db push
```

### 2. Deploy Edge Functions (REQUIRED)

**Go to Supabase Dashboard:**
1. Navigate to: **Edge Functions** → **Create new function**

**Function 1: `send-whatsapp-bill-reminder`**
- Name: `send-whatsapp-bill-reminder`
- File to copy: `supabase/functions/send-whatsapp-bill-reminder/index.ts`
- Copy entire contents and paste

**Function 2: `schedule-bill-reminders-enhanced`**
- Name: `schedule-bill-reminders-enhanced`
- File to copy: `supabase/functions/schedule-bill-reminders-enhanced/index.ts`
- Copy entire contents and paste

### 3. Test Features

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **As a Pro user, test:**
   - Go to `/savings-goals` - Create a savings goal
   - Go to `/emi-manager` - Add an EMI
   - Go to `/spending-insights` - View spending breakdown
   - Go to Bills page - Schedule WhatsApp reminder

## ✅ Checklist

- [ ] Database migration executed successfully
- [ ] `send-whatsapp-bill-reminder` function deployed
- [ ] `schedule-bill-reminders-enhanced` function deployed
- [ ] Tested savings goals feature
- [ ] Tested EMI manager feature
- [ ] Tested spending insights feature
- [ ] Tested WhatsApp reminders

## 🐛 Common Issues

### Can't find the file?
```bash
# List all edge functions
ls -la supabase/functions/

# View the specific file
cat supabase/functions/schedule-bill-reminders-enhanced/index.ts
```

### Migration fails?
- Check if tables already exist
- Remove `IF NOT EXISTS` clauses if needed
- Check Supabase logs for specific errors

### Functions not deploying?
- Check Supabase project is active
- Verify function name matches exactly
- Check function logs in Supabase dashboard

## 📁 All Files Created

✅ **Database:**
- `supabase/migrations/20250112000002_add_pro_commuter_features.sql`

✅ **Edge Functions:**
- `supabase/functions/send-whatsapp-bill-reminder/index.ts`
- `supabase/functions/schedule-bill-reminders-enhanced/index.ts`

✅ **Frontend Pages:**
- `src/pages/SavingsGoals.tsx`
- `src/pages/EMIManager.tsx`
- `src/pages/SpendingInsights.tsx`

✅ **Components:**
- `src/components/SavingsGoalCard.tsx`
- `src/components/EMICard.tsx`

✅ **Updated Files:**
- `src/App.tsx` (routes added)
- `src/hooks/usePlanGating.tsx` (Pro features added)
- `src/pages/Dashboard.tsx` (widgets added)
- `src/pages/Upgrade.tsx` (Pro plan features updated)
- `src/components/BillReminderSettings.tsx` (WhatsApp reminders)

