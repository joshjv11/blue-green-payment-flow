# QA Checklist for InvoiceFlow

**Project:** NEW Supabase (qusloccwftavvcsttmnq)  
**Domain:** invoiceflow.dev  
**Migration Status:** ✅ Complete

## 🚀 CORE DASHBOARD FLOWS (HIGH PRIORITY)

### 1. Add Bill Flow ✅
- [ ] Navigate to Bills page (`/bills`)
- [ ] Click "Add Bill" button - form modal opens
- [ ] Fill in bill details:
  - Name: "Test Electric Bill"
  - Amount: 1500
  - Due Date: (7 days from now)
  - Category: utilities
  - Priority: high
  - Reminder: 1 day before
- [ ] Submit form
- [ ] **Expected Results:**
  - ✅ Bill saves successfully to database
  - ✅ Dashboard refreshes automatically
  - ✅ New bill appears in bills list with correct data
  - ✅ Toast notification shows success
  - ✅ Auto-reminder created in `bill_reminders` table
- [ ] **Error Handling:**
  - Try submitting with missing name → shows "Missing Bill Name" error
  - Try invalid amount → shows "Invalid Amount" error
  - Try missing due date → shows "Missing Due Date" error
  - Try exceeding bill limit (free users) → shows upgrade modal

### 2. Analytics Dashboard ✅
- [ ] Navigate to Analytics page (`/analytics`)
- [ ] **With No Bills:**
  - ✅ Shows "No bills yet" empty state
  - ✅ Displays "Add Your First Bill" button
  - ✅ No broken charts or calculations
- [ ] **With Bills:**
  - Create 4 test bills (2 paid, 1 unpaid, 1 overdue)
  - Reload Analytics page
  - ✅ Basic stats show correct totals (Total, Paid, Unpaid, Overdue)
  - ✅ Payment progress bar calculates correctly
  - ✅ All data comes from real Supabase bills (no mock data)
  - ✅ Charts render without errors
- [ ] **Pro Features:**
  - Upgrade account to Pro (via admin)
  - ✅ Advanced Analytics section becomes visible
  - ✅ Expense forecast shows real data
  - ✅ Category breakdown displays actual spending

### 3. Admin God Mode ✅
- [ ] Admin logs in (must be in `admin_users` table with status='approved')
- [ ] Navigate to `/admin`
- [ ] Click "Plans" tab
- [ ] **Expected:**
  - ✅ Admin Plan Manager component loads
  - ✅ Shows list of all user plans
  - ✅ Displays Free vs Pro counts
- [ ] **Upgrade User:**
  - Search for a user by email
  - Click "Change Plan" button
  - Select "Pro Plan"
  - Click "Update Plan"
  - ✅ User immediately upgraded to Pro
  - ✅ AI queries limit becomes unlimited (999999)
  - ✅ User can now access advanced features
- [ ] **Downgrade User:**
  - Find a Pro user
  - Change plan to "Free"
  - ✅ User downgraded to Free
  - ✅ AI queries limit reset to 3
  - ✅ Advanced features restricted
- [ ] **Security:**
  - Sign in as non-admin user
  - Try to access `/admin` → Access Denied
  - Try to modify other user's plan via console → RLS blocks

### 4. Error Handling & Loading States ✅
- [ ] **Loading States:**
  - Navigate to Bills page
  - ✅ Loading spinner shows while fetching
  - ✅ No blank screens during load
- [ ] **Error States:**
  - Disconnect internet
  - Try to add a bill
  - ✅ Shows network error message
  - ✅ Doesn't crash or hang
  - Reconnect internet
  - ✅ App recovers gracefully
- [ ] **Empty States:**
  - Delete all bills (as new user)
  - ✅ Bills page shows helpful empty state
  - ✅ Analytics shows "No bills yet" message
  - ✅ No console errors

### 5. End-to-End Tests ✅
```bash
npm test
```
- [ ] Run test suite
- [ ] **Expected Results:**
  - ✅ `bills-flow.test.ts` - All tests pass
    - Create bill with RLS
    - Update bill status
    - Delete bill
    - Validate permissions
  - ✅ `analytics-flow.test.ts` - All tests pass
    - Empty state handling
    - Calculations with real data
    - Category grouping
    - Payment progress
  - ✅ `admin-plan.test.ts` - All tests pass
    - Default plan creation
    - Admin upgrade/downgrade
    - RLS permission checks
  - ✅ All existing tests continue to pass

---

## Overview
Manual testing checklist to verify all features work correctly after migration to the NEW Supabase project.

**NEW Project Details:**
- Project Ref: `qusloccwftavvcsttmnq`
- URL: `https://qusloccwftavvcsttmnq.supabase.co`
- App URL: `https://invoiceflow.dev`

---

## Pre-Flight Checks

### Environment Setup
- [✅] `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [✅] `SUPABASE_SERVICE_ROLE_KEY` is set for admin operations
- [✅] App is deployed and accessible at `https://invoiceflow.dev`
- [✅] Database schema has been applied via `make db.setup`

### Supabase Dashboard Checks
- [⚠️] Navigate to Supabase dashboard → Authentication → Providers
- [⚠️] Confirm Google OAuth is configured with correct redirect URL:
  - Authorized redirect URI: `https://qusloccwftavvcsttmnq.supabase.co/auth/v1/callback`
- [⚠️] Navigate to Authentication → URL Configuration
- [⚠️] Confirm Site URL is set to: `https://invoiceflow.dev`
- [⚠️] Confirm Redirect URLs include: `https://invoiceflow.dev/**`

**ACTION REQUIRED:** Update Google OAuth callback URL in Google Cloud Console

---

## Authentication Tests

### Email/Password Authentication
1. [ ] **Sign Up**
   - Visit `https://invoiceflow.dev`
   - Click "Sign Up" / "Get Started"
   - Enter email and password
   - Submit form
   - **Expected:** Success message, redirected to dashboard

2. [ ] **Profile Auto-Creation**
   - After signup, check Supabase dashboard → Table Editor → profiles
   - **Expected:** New row with your user_id, email populated

3. [ ] **Sign Out**
   - Click sign out button
   - **Expected:** Redirected to landing page, session cleared

4. [ ] **Sign In**
   - Click "Sign In"
   - Enter credentials
   - **Expected:** Successfully logged in, redirected to dashboard

### Google OAuth (if configured)
5. [ ] **Google Sign In**
   - Click "Sign in with Google"
   - Select Google account
   - **Expected:** Redirected to app, logged in successfully

6. [ ] **Google Profile Sync**
   - Check profiles table after Google login
   - **Expected:** Profile has `full_name` from Google account

### Magic Link / Email Verification
7. [ ] **Email Confirmation** (if enabled)
   - Sign up with new email
   - Check email inbox
   - Click confirmation link
   - **Expected:** Email confirmed, can log in

---

## Admin Promotion

8. [ ] **Promote to Admin**
   ```bash
   make admin EMAIL=your-email@example.com
   ```
   - Run command in terminal
   - Check profiles table in Supabase
   - **Expected:** `is_admin` = `true` for your profile

9. [ ] **Admin Access** (if admin features exist)
   - Log in as admin
   - Navigate to `/admin` route
   - **Expected:** Admin panel accessible

---

## Bills CRUD Operations

### Create Bill
10. [ ] **Add New Bill**
    - Navigate to Bills page
    - Click "Add Bill" / "New Bill"
    - Fill in:
      - Name: "Test Electric Bill"
      - Amount: 150.00
      - Due Date: (future date)
      - Category: "utilities"
      - Status: "unpaid"
    - Submit
    - **Expected:** Bill appears in list

### Read Bills
11. [ ] **View Bills List**
    - Navigate to Bills page
    - **Expected:** See your bills, sorted by due date

12. [ ] **View Single Bill**
    - Click on a bill
    - **Expected:** Bill details displayed

### Update Bill
13. [ ] **Edit Bill**
    - Click "Edit" on a bill
    - Change amount to 175.00
    - Change status to "paid"
    - Save
    - **Expected:** Changes reflected, `updated_at` timestamp updated

### Delete Bill
14. [ ] **Delete Bill**
    - Click "Delete" on a bill
    - Confirm deletion
    - **Expected:** Bill removed from list

---

## Reminders

### Create Reminder
15. [ ] **Add Reminder to Bill**
    - View or edit a bill
    - Add reminder with date 3 days before due date
    - **Expected:** Reminder created, linked to bill

### View Reminders
16. [ ] **Reminders List**
    - Navigate to Reminders page
    - **Expected:** See your reminders, grouped by bill

### Cascade Delete
17. [ ] **Delete Bill with Reminders**
    - Create a bill with a reminder
    - Delete the bill
    - Check reminders table
    - **Expected:** Reminder is also deleted (cascade)

---

## Row-Level Security (RLS) Tests

### User Isolation
18. [ ] **Create Second User**
    - Open incognito window
    - Sign up with different email
    - Create a bill for this user

19. [ ] **Cross-User Access Test**
    - In original window (first user), try to:
      - View bills list
      - **Expected:** Only YOUR bills visible, not second user's bills
    - Open browser dev tools → Network tab
    - Check API response
    - **Expected:** Only your `user_id` in returned rows

20. [ ] **Direct API Test** (optional, for advanced users)
    - Use Supabase API or PostgREST
    - Try to query bills with wrong `user_id`
    - **Expected:** RLS blocks, returns empty or error

---

## Triggers & Timestamps

21. [ ] **Profile Creation Trigger**
    - Sign up a new user
    - Immediately check profiles table
    - **Expected:** Profile row auto-created via `handle_new_user()` trigger

22. [ ] **Updated_at Trigger**
    - Edit a bill or profile
    - Check `updated_at` timestamp
    - **Expected:** Timestamp auto-updated to current time

---

## Edge Cases

23. [ ] **Invalid Data**
    - Try to create a bill with:
      - Negative amount
      - Missing required fields
    - **Expected:** Validation error, user-friendly message

24. [ ] **Expired Session**
    - Log in, wait 1 hour (or clear session in dev tools)
    - Try to perform an action
    - **Expected:** Session refresh OR redirect to login

25. [ ] **Offline / Network Error**
    - Disconnect internet
    - Try to save a bill
    - **Expected:** Error message, data not lost on reconnect

---

## Performance & UX

26. [ ] **Page Load Speed**
    - Navigate between pages
    - **Expected:** Fast load times (<2s for dashboard)

27. [ ] **Mobile Responsiveness**
    - Open app on mobile device or resize browser
    - **Expected:** UI adapts, all features accessible

28. [ ] **Console Errors**
    - Open browser dev console
    - Navigate through app
    - **Expected:** No critical errors, clean console

---

## Data Integrity

29. [ ] **Foreign Key Integrity**
    - Run in Supabase SQL Editor:
      ```sql
      SELECT * FROM bills WHERE user_id NOT IN (SELECT id FROM auth.users);
      ```
    - **Expected:** Zero rows (all bills have valid user_id)

30. [ ] **Reminder-Bill Links**
    - Run:
      ```sql
      SELECT * FROM reminders WHERE bill_id NOT IN (SELECT id FROM bills);
      ```
    - **Expected:** Zero rows (all reminders have valid bill_id)

---

## Automated Test Suite

31. [ ] **Run All Tests**
    ```bash
    make verify
    ```
    - **Expected:** All tests pass, verification output shows:
      - Table row counts
      - RLS policies active
      - Foreign keys valid
      - No NULL primary keys

32. [ ] **Smoke Test**
    ```bash
    make smoke
    ```
    - **Expected:** Auth flow works, bills CRUD succeeds

---

## Post-Migration Validation

33. [ ] **User Count Match**
    - If migrated from old project, compare user counts:
      ```sql
      SELECT COUNT(*) FROM profiles;
      ```
    - **Expected:** Matches expected count

34. [ ] **Data Completeness**
    - Spot-check several bills/reminders
    - **Expected:** All fields populated correctly, no data loss

---

## Final Sign-Off

- [ ] All critical tests passed
- [ ] No blocking bugs
- [ ] Performance acceptable
- [ ] Ready for production

**Tested by:** _______________  
**Date:** _______________  
**Notes:**

---

## Troubleshooting

### Common Issues

**Issue:** "requested path is invalid" error on login  
**Fix:** Check Site URL and Redirect URLs in Supabase Dashboard → Authentication → URL Configuration

**Issue:** Profile not auto-created on signup  
**Fix:** Verify `handle_new_user()` trigger exists:
```sql
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
```

**Issue:** RLS blocking all reads  
**Fix:** Check if user is authenticated:
```sql
SELECT auth.uid(); -- Should return your user ID
```

**Issue:** Can't sign in with Google  
**Fix:** Verify OAuth redirect URI in Google Cloud Console matches Supabase callback URL

---

## 📧 Reminder System Tests

### Auto Reminders
- [ ] Create a new bill → verify auto-reminder row created in `bill_reminders` table
- [ ] Check reminder date is calculated correctly (1 day before due date, or same day if due soon)
- [ ] Verify reminder has status='pending'
- [ ] Confirm reminder has correct priority based on bill priority

### Manual Reminders
- [ ] Open Bills page and find a bill
- [ ] Click "Set Reminder" button (if exists in UI)
- [ ] Verify reminder is created with custom days_before
- [ ] Test RPC function directly: `SELECT schedule_manual_reminder('<bill-id>', 3);`

### Cron Scheduling
- [ ] Run setup-reminder-cron function to configure daily job
- [ ] Verify cron job exists: `SELECT * FROM cron.job WHERE jobname = 'process-bill-reminders-daily';`
- [ ] Manually trigger: Call `/functions/v1/process-due-reminders`
- [ ] Check Edge Function logs for execution results

### Email Delivery
- [ ] Set RESEND_API_KEY and RESEND_FROM secrets in Supabase
- [ ] Create a bill due today or tomorrow
- [ ] Wait for auto-reminder OR manually trigger process-due-reminders
- [ ] Verify email received in inbox
- [ ] Check bill_reminders table: status should be 'sent'
- [ ] Verify email_sent_at timestamp is set
- [ ] Check delivery_status is 'delivered'

### RLS & Security
- [ ] Verify users can only see their own reminders
- [ ] Test that one user cannot access another user's reminders
- [ ] Confirm trigger creates reminders even with RLS enabled
- [ ] Test manual reminder function respects user ownership

### Logs & Debugging
- [ ] Check Supabase Studio → Edge Functions → process-due-reminders → Logs
- [ ] Check Supabase Studio → Edge Functions → send-individual-reminder → Logs
- [ ] Look for structured console.log messages with bill_id, reminder_date, status
- [ ] Verify error messages are logged when email fails

---

## Resources

- [Supabase Dashboard](https://supabase.com/dashboard/project/qusloccwftavvcsttmnq)
- [SQL Editor](https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/sql/new)
- [Auth Logs](https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/users)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Setup Guide](./SETUP_NEW_PROJECT.md)
