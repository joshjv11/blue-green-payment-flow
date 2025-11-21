# 📦 Data Migration Guide - Transfer Data to New Supabase Project

This guide helps you transfer all your data from the **OLD** Supabase project to the **NEW** one (`fbzfddgqfqjuvpjzvhfi`).

## 🎯 What Gets Migrated

The script will migrate these tables:
- ✅ `profiles` - User profiles
- ✅ `bills` - Your bills/invoices
- ✅ `reminders` - Bill reminders
- ✅ `user_plans` - Subscription plans
- ✅ `payment_transactions` - Payment history
- ✅ `customers` - Customer data
- ✅ `products` - Product catalog
- ✅ `expenses` - Expense records

**Note:** User IDs will be automatically mapped by email address, so users who sign up in the new project will get their old data automatically!

---

## 🚀 Quick Start (3 Steps)

### Step 1: Get Your Old Project Credentials

You need the **Service Role Key** from your old Supabase project:

1. Go to your **OLD** Supabase project dashboard
2. Navigate to: **Settings** → **API**
3. Copy the **`service_role`** key (secret key)
4. Also note the project URL (e.g., `https://yqzzcvkgeoghirfrflzq.supabase.co`)

### Step 2: Set Environment Variables

Create or update your `.env` file with both old and new credentials:

```bash
# Old Project (source)
OLD_SUPABASE_URL=https://your-old-project.supabase.co
OLD_SERVICE_ROLE_KEY=your-old-service-role-key-here

# New Project (destination) - Already set
NEW_SUPABASE_URL=https://fbzfddgqfqjuvpjzvhfi.supabase.co
NEW_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcxMzIxMCwiZXhwIjoyMDc5Mjg5MjEwfQ.hIEALJ-LjzxUDh-L9TRxLNumA_3BEYTYxmg6OQZasz8
```

**⚠️ IMPORTANT:** Never commit `.env` to git! It contains secrets.

### Step 3: Run the Migration Script

```bash
node scripts/migrate-data-to-new-project.mjs
```

The script will:
1. ✅ Connect to both old and new projects
2. ✅ Create a mapping of old user IDs → new user IDs (by email)
3. ✅ Migrate all tables in the correct order
4. ✅ Automatically map foreign keys (user_id, etc.)
5. ✅ Show a summary of what was migrated

---

## 📋 Example Output

```
ℹ️  🚀 Starting data migration...
ℹ️  Old project: https://yqzzcvkgeoghirfrflzq.supabase.co
ℹ️  New project: https://fbzfddgqfqjuvpjzvhfi.supabase.co
ℹ️  Testing connections...
✅ Connections successful!
ℹ️  Creating user ID mapping...
✅ Mapped user: user@example.com (abc12345... -> xyz98765...)
✅ Created mapping for 14 users
ℹ️  Migrating profiles...
✅ Migrated 14/14 rows to profiles
ℹ️  Migrating bills...
✅ Migrated 11/11 rows to bills
...
═══════════════════════════════════════
📊 Migration Summary
═══════════════════════════════════════
✅ profiles: 14/14 rows migrated
✅ bills: 11/11 rows migrated
✅ reminders: 5/5 rows migrated
...
✅ Migration complete!
```

---

## 🔧 Troubleshooting

### Error: "OLD_SERVICE_ROLE_KEY environment variable is required"

**Solution:** Make sure you set the environment variables in `.env` file. The script needs the old project's service role key to read data.

### Error: "Table X does not exist"

**Solution:** This is normal if a table doesn't exist in your old project. The script will skip it and continue with other tables.

### Warning: "No matching user found for user@example.com"

**Solution:** This means a user exists in the old project but hasn't signed up in the new project yet. Once they sign up with the same email, their data will be linked. For now, the data won't be migrated for that user.

### Error: "duplicate key value violates unique constraint"

**Solution:** Some data already exists in the new project. The script will skip duplicates automatically. This is safe - it means you've run the migration before or some data was already there.

### Migration seems stuck

**Solution:** Check your internet connection and Supabase project status. Large datasets might take a few minutes. The script processes data in batches of 100 rows.

---

## ✅ After Migration

### 1. Verify Data in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/editor
2. Check each table:
   - `profiles` - Should have all your user profiles
   - `bills` - Should have all your bills
   - `reminders` - Should have all reminders
   - etc.

### 2. Test Your App

1. Sign in with an existing account (same email as old project)
2. Verify you can see:
   - ✅ Your bills
   - ✅ Your reminders
   - ✅ Your profile data
   - ✅ All your data!

### 3. Check User ID Mapping

The script automatically maps user IDs by email. So if:
- Old project: User ID `abc-123` with email `user@example.com`
- New project: User ID `xyz-789` with email `user@example.com`

Then all bills/reminders with `user_id = abc-123` will be migrated with `user_id = xyz-789` automatically!

---

## 🔄 Re-running Migration

You can safely run the migration script multiple times. It will:
- ✅ Skip rows that already exist (no duplicates)
- ✅ Only insert new data
- ✅ Update the user mapping each time

This is useful if:
- You add more data to the old project
- Some users sign up in the new project after first migration
- You want to sync data again

---

## 📝 Customizing the Migration

To add more tables to migrate, edit `scripts/migrate-data-to-new-project.mjs`:

```javascript
const TABLES_TO_MIGRATE = [
  'profiles',
  'bills',
  'reminders',
  'user_plans',
  'payment_transactions',
  'customers',
  'products',
  'expenses',
  // Add more tables here:
  'sales_orders',
  'purchase_orders',
  // etc.
];
```

**Important:** Keep tables in dependency order (tables without foreign keys first).

---

## 🎉 That's It!

Once the migration completes, all your data will be in the new project and you can use your app normally. The old project can be kept as a backup or deleted after verifying everything works.

