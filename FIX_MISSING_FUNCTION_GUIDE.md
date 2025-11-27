# ✅ Fix Missing Function - create_default_user_plan

## 🔍 Problem

The app is showing this error:
```
❌ Error creating default plan: Could not find the function public.create_default_user_plan(_user_id) in the schema cache
```

This happens because the function doesn't exist in the new database.

## 🚀 Quick Fix (2 minutes)

### Step 1: Update the SQL Script

The `scripts/create-missing-tables.sql` file has been updated to include:
- ✅ `create_default_user_plan` function
- ✅ Auto-creates default plans for existing users
- ✅ Proper permissions (authenticated + anon roles)

### Step 2: Run the Updated SQL Script

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/sql/new
2. Copy the **entire** contents of `scripts/create-missing-tables.sql`
3. Paste into SQL Editor
4. Click **"Run"** (or press `Cmd/Ctrl + Enter`)

### Step 3: Verify

The script will automatically:
- ✅ Create all missing tables (`user_plans`, `payment_transactions`)
- ✅ Create the `create_default_user_plan` function
- ✅ Create default plans for existing users (including you!)
- ✅ Show verification output at the end

## ✅ What Gets Fixed

1. ✅ **Function Created**: `create_default_user_plan` will exist
2. ✅ **Default Plan Created**: You'll get a free plan automatically
3. ✅ **No More Errors**: The "Could not find function" error will stop
4. ✅ **App Works**: Plan features will work normally

## 📝 About the CORS Error

The CORS error for `log-client-event` is **non-critical**:
- ✅ Already handled gracefully (catches errors silently)
- ✅ Doesn't break the app
- ✅ Just logs analytics (optional)

To fix it later (optional):
1. Deploy the `log-client-event` edge function
2. Configure CORS headers in the edge function

For now, it's fine to ignore - the app will work normally!

## 🎯 After Running

Once you run the SQL script:
1. ✅ The function will exist
2. ✅ Your default plan will be created
3. ✅ The errors will stop
4. ✅ The app will use your plan correctly

**Run the SQL script now and the errors should be fixed!** 🚀



