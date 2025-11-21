# ✅ Fix All Missing Tables - Complete Guide

## 🔍 Problems Fixed

1. ❌ `Could not find the table 'public.temporary_unlocks'`
2. ❌ `Could not find the table 'public.streak_shields'`
3. ❌ `Could not find the function public.create_default_user_plan`
4. ❌ `Cannot read properties of undefined (reading 'icon')` - caused by missing tables

## 🚀 Complete Fix (Run Once)

### Step 1: Run the Updated SQL Script

The file `scripts/create-missing-tables.sql` has been updated with:

✅ **Tables Created:**
- `user_plans` - User subscription plans
- `payment_transactions` - Payment history
- `user_badges` - User achievements/badges
- `user_rewards` - User rewards and streaks
- `temporary_unlocks` - Temporary feature unlocks
- `streak_shields` - Streak protection shields
- `daily_bonuses` - Daily bonus rewards (NEW!)

✅ **Functions Created:**
- `create_default_user_plan` - Creates free plan for new users
- `can_claim_daily_bonus` - Checks if user can claim daily bonus (NEW!)
- `generate_daily_reward` - Generates random daily reward (NEW!)
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
   - All 6 tables listed in verification output
   - Function `create_default_user_plan` verified
   - Default plans created for existing users

### Step 3: Refresh Your App

After running the script, **refresh your browser**. All errors should be gone!

## ✅ What Gets Fixed

### Before (Errors):
```
❌ Error fetching temporary unlocks: Could not find the table 'public.temporary_unlocks'
❌ Error fetching shields: Could not find the table 'public.streak_shields'
❌ Error creating default plan: Could not find the function public.create_default_user_plan
❌ Error checking daily bonus: Could not find the function public.can_claim_daily_bonus
❌ TypeError: Cannot read properties of undefined (reading 'icon')
```

### After (Working):
```
✅ Tables exist and queries work
✅ Function exists and plan creation works
✅ No undefined errors
✅ App runs smoothly
```

## 📊 Tables Created

### 1. `temporary_unlocks`
- Stores temporary feature unlocks (premium access, themes, etc.)
- Has expiration dates
- Automatically deactivates expired unlocks

### 2. `streak_shields`
- Stores streak protection shields
- Types: basic, premium, insurance
- Tracks usage and expiration

### 3. `user_plans`
- User subscription plans (free, pro, premium, enterprise)
- AI query limits and usage tracking
- Plan expiration dates

### 4. `payment_transactions`
- Payment history
- Transaction status tracking
- Revenue analytics

### 5. `user_badges`
- User achievements and badges
- XP earned tracking
- Badge tiers

### 6. `user_rewards`
- User rewards system
- Streak tracking
- XP and level tracking
- Payment statistics

## 🎯 Next Steps

1. **Run the SQL script** (see Step 2 above)
2. **Refresh your app** - errors should be gone
3. **Test features:**
   - Daily bonuses should work
   - Streak shields should load
   - Plan creation should work
   - No more undefined errors

## 🔧 Troubleshooting

If you still see errors after running the script:

1. **Check SQL Editor** - Look for any error messages in red
2. **Verify tables exist** - Run this in SQL Editor:
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('temporary_unlocks', 'streak_shields', 'user_plans');
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

