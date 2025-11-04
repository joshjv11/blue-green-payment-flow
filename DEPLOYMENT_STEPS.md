# 🚀 Pro Plan Features - Deployment Steps

## Step 1: Run Database Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **SQL Editor**
3. Click **"New Query"**
4. Copy and paste the entire contents of: `supabase/migrations/20250112000002_add_pro_commuter_features.sql`
5. Click **"Run"** to execute the migration
6. Verify success - you should see: "Success. No rows returned"

## Step 2: Deploy Edge Functions

### Deploy `send-whatsapp-bill-reminder`

1. Go to Supabase Dashboard → **Edge Functions**
2. Click **"Create a new function"**
3. Name it: `send-whatsapp-bill-reminder`
4. Copy the contents from: `supabase/functions/send-whatsapp-bill-reminder/index.ts`
5. Paste into the code editor
6. Click **"Deploy"**

### Deploy `schedule-bill-reminders-enhanced`

1. Go to Supabase Dashboard → **Edge Functions**
2. Click **"Create a new function"**
3. Name it: `schedule-bill-reminders-enhanced`
4. Copy the contents from: `supabase/functions/schedule-bill-reminders-enhanced/index.ts`
5. Paste into the code editor
6. Click **"Deploy"**

**Alternative: Use Supabase CLI** (if you have it installed)

```bash
# From your project root
supabase functions deploy send-whatsapp-bill-reminder
supabase functions deploy schedule-bill-reminders-enhanced
```

## Step 3: Verify Functions Are Working

1. Go to **Edge Functions** in Supabase Dashboard
2. You should see both functions listed:
   - ✅ `send-whatsapp-bill-reminder`
   - ✅ `schedule-bill-reminders-enhanced`
3. Click on each function to verify they're deployed

## Step 4: Test the Features

### Test WhatsApp Reminders:
1. Go to your app → **Bills** page
2. Add or select a bill
3. Click **"Schedule WhatsApp Reminder"**
4. Enter your phone number
5. Verify reminders are scheduled

### Test Savings Goals:
1. Go to `/savings-goals` (or click from dashboard if Pro user)
2. Click **"New Goal"**
3. Create a test savings goal
4. Verify it appears on dashboard

### Test EMI Manager:
1. Go to `/emi-manager`
2. Click **"Add EMI"**
3. Add a test EMI
4. Verify it appears on dashboard

### Test Spending Insights:
1. Go to `/spending-insights`
2. View spending breakdown
3. Set up spending alerts

## Step 5: Update Navigation (Optional)

Add links to the new pages in your sidebar/navigation:

- `/savings-goals` - Savings Goals
- `/emi-manager` - EMI Manager  
- `/spending-insights` - Spending Insights

## Troubleshooting

### If functions don't deploy:
- Check Supabase project is active
- Verify you have the correct permissions
- Check function logs for errors

### If database migration fails:
- Check for existing tables (some might already exist)
- Run the migration in parts if needed
- Check Supabase logs for specific errors

### If you can't see the file:
- The file path is: `supabase/functions/schedule-bill-reminders-enhanced/index.ts`
- Try opening it directly: `code supabase/functions/schedule-bill-reminders-enhanced/index.ts`
- Or use terminal: `cat supabase/functions/schedule-bill-reminders-enhanced/index.ts`

## Next Steps After Deployment

1. ✅ Test all Pro features work
2. ✅ Update marketing copy for Mumbai commuters
3. ✅ Add Pro plan pricing messaging
4. ✅ Monitor user adoption of new features
5. ✅ Collect feedback and iterate

## File Locations Reference

```
supabase/
├── migrations/
│   └── 20250112000002_add_pro_commuter_features.sql ✅
└── functions/
    ├── send-whatsapp-bill-reminder/
    │   └── index.ts ✅
    └── schedule-bill-reminders-enhanced/
        └── index.ts ✅

src/
├── pages/
│   ├── SavingsGoals.tsx ✅
│   ├── EMIManager.tsx ✅
│   └── SpendingInsights.tsx ✅
├── components/
│   ├── SavingsGoalCard.tsx ✅
│   ├── EMICard.tsx ✅
│   └── BillReminderSettings.tsx ✅ (updated)
├── App.tsx ✅ (routes added)
└── hooks/
    └── usePlanGating.tsx ✅ (updated)
```

