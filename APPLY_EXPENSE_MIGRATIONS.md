# Apply Expense Tracking Migrations

The error "Could not find the table 'public.expenses' in the schema cache" means the expenses table hasn't been created yet.

## Quick Fix - Apply Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq
   - Navigate to **SQL Editor**

2. **Run the Migration:**
   - Click **"New Query"**
   - Copy and paste the entire contents of `apply_expense_migrations.sql`
   - Click **"Run"** (or press `Cmd/Ctrl + Enter`)

3. **Verify:**
   - Go to **Table Editor**
   - You should see these new tables:
     - `expenses`
     - `expense_tracking_settings`
     - `expense_categories`
     - `expense_transactions`

### Option 2: Via Supabase CLI

```bash
# Make sure you're in the project root
cd /Users/joshuavaz/Documents/blue-green-payment-flow

# Link to your Supabase project (if not already linked)
supabase link --project-ref qusloccwftavvcsttmnq

# Apply the migration
supabase db push

# Or apply specific migration file
psql "$DATABASE_URL" -f apply_expense_migrations.sql
```

### Option 3: Via Direct SQL Connection

If you have the database connection string:

```bash
psql "postgresql://postgres:[YOUR_PASSWORD]@db.qusloccwftavvcsttmnq.supabase.co:5432/postgres" -f apply_expense_migrations.sql
```

## What Gets Created

1. **expenses** table - Main expense tracking table
2. **expense_tracking_settings** table - User budget and notification settings
3. **expense_categories** table - Customizable expense categories
4. **expense_transactions** table - UPI transaction metadata
5. **RLS Policies** - Row Level Security for all tables
6. **Indexes** - For performance optimization
7. **Triggers** - Auto-update timestamps
8. **Default Categories** - Auto-created when user settings are initialized

## After Applying

1. **Refresh your app** - The error should be gone
2. **Try adding an expense** - It should work now
3. **Set up your budget** - Click "Set Income" in Spending Insights

## Troubleshooting

### If you get "relation already exists" errors:
- The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- Some policies might need to be dropped first if they already exist

### If RLS policies conflict:
- The migration drops existing policies before creating new ones
- This is safe and won't cause data loss

### If you need to reset:
```sql
-- Only run this if you want to start fresh (WARNING: Deletes all expense data!)
DROP TABLE IF EXISTS public.expense_transactions CASCADE;
DROP TABLE IF EXISTS public.expense_categories CASCADE;
DROP TABLE IF EXISTS public.expense_tracking_settings CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
```

Then re-run `apply_expense_migrations.sql`.

## Verification Query

Run this to verify everything is set up correctly:

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('expenses', 'expense_tracking_settings', 'expense_categories', 'expense_transactions')
ORDER BY table_name;
```

You should see all 4 tables listed.

