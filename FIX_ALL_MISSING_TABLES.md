# ✅ Fix All Missing Tables - Complete Guide

## 🔍 Problems Fixed

1. ❌ `Could not find the table 'public.user_plans'`
2. ❌ `Could not find the table 'public.payment_transactions'`
3. ❌ `Could not find the function public.create_default_user_plan`
4. ❌ `Cannot read properties of undefined (reading 'plan')` - caused by missing tables

## 🚀 Complete Fix (Run Once)

### Step 1: Run the Updated SQL Script

The file `scripts/create-missing-tables.sql` has been updated with:

✅ **Tables Created:**
- `user_plans` - User subscription plans
- `payment_transactions` - Payment history

✅ **Functions Created:**
- `create_default_user_plan` - Creates free plan for new users
- Auto-creates default plans for existing users

✅ **Features:**
- All tables have RLS (Row Level Security) enabled
- All tables have proper indexes for performance
- All tables have foreign key relationships
- Automatic plan creation for existing users

### Step 2: Execute the Script

1. **Go to Supabase SQL Editor:**
   https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/sql/new

2. **Copy the entire contents** of `scripts/create-missing-tables.sql`

3. **Paste into SQL Editor**

4. **Click "Run"** (or press `Cmd/Ctrl + Enter`)

5. **Verify** - You should see:
   - Both tables listed in verification output
   - Function `create_default_user_plan` verified
   - Default plans created for existing users

### Step 3: Refresh Your App

After running the script, **refresh your browser**. All errors should be gone!

## ✅ What Gets Fixed

### Before (Errors):
```
❌ Error fetching user plans: Could not find the table 'public.user_plans'
❌ Error fetching transactions: Could not find the table 'public.payment_transactions'
❌ Error creating default plan: Could not find the function public.create_default_user_plan
❌ TypeError: Cannot read properties of undefined (reading 'plan')
```

### After (Working):
```
✅ Tables exist and queries work
✅ Function exists and plan creation works
✅ No undefined errors
✅ App runs smoothly
```

## 📊 Tables Created

### 1. `user_plans`
- User subscription plans (free, pro, premium, enterprise)
- AI query limits and usage tracking
- Plan expiration dates

### 2. `payment_transactions`
- Payment history
- Transaction status tracking
- Revenue analytics

## 🎯 Next Steps

1. **Run the SQL script** (see Step 2 above)
2. **Refresh your app** - errors should be gone
3. **Test features:**
   - Plan creation should work
   - Billing workflows should load
   - No more undefined errors

## 🔧 Troubleshooting

If you still see errors after running the script:

1. **Check SQL Editor** - Look for any error messages in red
2. **Verify tables exist** - Run this in SQL Editor:
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('user_plans', 'payment_transactions');
   ```
3. **Verify function exists** - Run this:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name = 'create_default_user_plan';
   ```

## 📝 About the CORS Error

The CORS error for `log-client-event` is **non-critical**:
- ✅ Already handled gracefully (fails silently)
- ✅ Doesn't break the app
- ✅ Just for analytics logging (optional)
- ✅ Can be fixed later by deploying the edge function

**Run the SQL script now and all the table/function errors will be fixed!** 🚀

