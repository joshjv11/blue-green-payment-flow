# ✅ Enable Email/Password Sign-Up - Quick Steps

## Current Issue
Email/password sign-up might not be working due to email confirmation being enabled in Supabase.

## ✅ Quick Fix (2 minutes)

### Step 1: Disable Email Confirmation (for testing)

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/auth/providers
2. Scroll to **Email** provider
3. **Disable "Confirm email"** toggle
4. Click **Save**

This allows users to sign up and immediately use the app without email verification.

### Step 2: Verify Trigger is Working

1. Go to SQL Editor: https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/sql/new
2. Run this to check if the trigger exists:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```
3. If no results, re-run the trigger creation part of `schema-for-new-project.sql`:
```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

## 🧪 Test Sign-Up

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Go to `/auth` page**

3. **Click "Sign up" tab** (or switch from sign-in to sign-up)

4. **Fill in:**
   - Email: `test@example.com`
   - Password: `password123` (at least 8 characters)

5. **Click "Sign Up"**

6. **Expected Result:**
   - Should redirect to `/dashboard`
   - Profile should be auto-created in `profiles` table
   - User should be authenticated

## 🔍 Troubleshooting

### Sign-up button does nothing
- Check browser console for errors
- Verify Supabase client is configured correctly
- Check network tab for failed requests

### "Email already registered" error
- Try a different email
- Or try signing in instead

### Profile not created after sign-up
1. Check if trigger exists (SQL query above)
2. Re-run the trigger creation SQL
3. Verify user was created in `auth.users` table

### Redirect doesn't happen after sign-up
- Check if email confirmation is disabled
- Verify the `signUp` function returns a session
- Check browser console for auth state changes

## ✅ Verification Checklist

After fixing:
- [ ] Can sign up with email/password
- [ ] Redirects to dashboard after sign-up
- [ ] Profile auto-created in `profiles` table
- [ ] Can create bills after sign-up
- [ ] All features work

Once sign-up works, you can use the app fully!

