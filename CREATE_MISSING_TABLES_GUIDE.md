# ✅ Create Missing Tables - Fix 404 Errors

## 🔍 Problem

The app is showing 404 errors because these tables don't exist in the new Supabase project:
- ❌ `user_plans` - Required for subscription management
- ❌ `payment_transactions` - Required for payment tracking
- ❌ `user_badges` - Optional (for gamification)
- ❌ `user_rewards` - Optional (for rewards system)

## 🚀 Quick Fix (2 minutes)

### Step 1: Go to Supabase SQL Editor

1. Open: https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/sql/new
2. You'll see an empty SQL editor

### Step 2: Copy & Paste SQL Script

Copy the entire contents of `scripts/create-missing-tables.sql` and paste it into the SQL Editor.

### Step 3: Run the Script

1. Click **"Run"** button (or press `Cmd/Ctrl + Enter`)
2. Wait for it to complete
3. You should see success messages

### Step 4: Verify Tables Were Created

The script will automatically show you a verification query at the end. You should see:
- ✅ `user_plans` - 10 columns
- ✅ `payment_transactions` - 11 columns
- ✅ `user_badges` - 8 columns
- ✅ `user_rewards` - 16 columns

## ✅ What Gets Created

### 1. **user_plans** Table
- Tracks user subscription plans (free, pro, premium, enterprise)
- AI query limits and usage
- Plan expiration dates
- Automatic plan creation on signup

### 2. **payment_transactions** Table
- Payment history
- Transaction status (pending, completed, failed, verified)
- Payment method tracking
- Processed status for automation

### 3. **user_badges** Table (Optional)
- Gamification badges
- XP earned
- Badge tiers and icons

### 4. **user_rewards** Table (Optional)
- Rewards system
- Streak tracking
- XP and level management
- Payment statistics

## 🔒 Security Features

All tables include:
- ✅ **Row Level Security (RLS)** enabled
- ✅ **Policies** - Users can only see/modify their own data
- ✅ **Foreign keys** - Links to `auth.users` for data integrity
- ✅ **Indexes** - Fast queries on user_id and status columns

## 🎯 After Running

Once the tables are created:

1. ✅ The 404 errors will stop
2. ✅ The app will use fallback values gracefully
3. ✅ User plans will be auto-created on signup
4. ✅ All features will work normally

## 🔄 Next Steps

1. **Test the app** - The errors should be gone
2. **Check user_plans** - A default plan will be created for existing users
3. **Migrate data** - If needed, run the data migration script again

---

**That's it!** Once you run the SQL script, all the 404 errors will be fixed! 🎉



