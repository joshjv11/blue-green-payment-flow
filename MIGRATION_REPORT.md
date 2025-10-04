# Migration Report: Error Logging & Priority Fix

**Date:** 2025-10-04  
**Version:** 1.0  
**Status:** ✅ Completed

## Summary

Implemented a comprehensive error/click logging system and fixed the Add Bill priority constraint issue that was causing failures when creating bill reminders.

---

## A) Error Logging System

### Database Changes

**New Table: `app_logs`**
- Comprehensive logging with fields for errors, warnings, and info events
- Columns: level, event, route, component, action, message, error details, stack trace, HTTP status, IP, user agent, context (JSONB)
- RLS enabled: authenticated users can insert, only admins can view
- Indexes on: created_at, level, user_id, event

**New Function: `admin_get_logs(p_level, p_limit)`**
- Security definer function for admins to retrieve logs
- Filters by level (info/warn/error) and limits results
- Returns last 200 logs by default

### Edge Function

**`log-client-event`**
- Location: `supabase/functions/log-client-event/index.ts`
- Public endpoint (JWT verification disabled)
- Accepts log events from frontend
- Extracts user ID from Authorization header if present
- Captures IP address and user agent
- Returns request_id for correlation
- Never throws to client (always returns 200/400/500 JSON)

### Frontend Logger

**`src/lib/logger.ts`**
- Helper functions: `logEvent()`, `logError()`, `logWarning()`, `logInfo()`
- Fire-and-forget with `keepalive: true` to ensure logs sent even on page close
- Swallows all errors to prevent breaking user experience
- Auto-captures route, session ID, and context
- Development mode console logging

### Integration Points

1. **ErrorBoundary** (`src/components/ErrorBoundary.tsx`)
   - Logs all unhandled React errors with component stack

2. **Add Bill** (`src/pages/Bills.tsx`)
   - Logs errors during bill creation/update with context (bill name, amount, priority)
   - Provides user-friendly error message for priority constraint violations

3. **Analytics** (`src/pages/Analytics.tsx`)
   - Logs errors during data fetching

### Admin UI

**New Page: `/admin/logs`**
- Location: `src/pages/AdminLogs.tsx`
- Filter logs by level (all/error/warn/info)
- Table view with time, level, event, route, component, message, status code
- Click log row to view full details: error message, stack trace, context JSON
- Refresh button to reload logs
- Requires admin privileges (checks via `is_system_admin()`)

### How to View Logs

1. **Navigate to Admin Logs**
   ```
   Go to: /admin/logs
   ```

2. **Filter by Level**
   - Use dropdown to filter: All Levels / Errors / Warnings / Info

3. **View Details**
   - Click the eye icon on any log row
   - See full error message, stack trace, and context

4. **Refresh**
   - Click "Refresh" button to fetch latest logs

5. **Via SQL (for debugging)**
   ```sql
   -- View recent errors
   SELECT * FROM admin_get_logs('error', 100);
   
   -- View all recent logs
   SELECT * FROM admin_get_logs(NULL, 200);
   ```

---

## B) Add Bill Priority Constraint Fix

### Problem

Users were getting this error when adding bills:
```
Failed to create bill: new row for relation "bill_reminders" 
violates check constraint "bill_reminders_priority_check"
```

**Root Cause:** The priority values from the UI ('low', 'medium', 'high') were not being normalized before insertion into `bill_reminders` table, which has a strict CHECK constraint.

### Solution

1. **Schema Alignment**
   - Ensured `bill_reminders.priority` has CHECK constraint: `priority IN ('low', 'medium', 'high')`

2. **Trigger Normalization**
   - Updated `auto_create_bill_reminder()` function to normalize priority:
     ```sql
     normalized_priority := CASE
       WHEN normalized_priority LIKE 'low%' THEN 'low'
       WHEN normalized_priority LIKE 'high%' THEN 'high'
       ELSE 'medium'
     END;
     ```
   - Also normalizes `reminder_days_before` to range 0-30

3. **Manual Reminder Function**
   - Updated `schedule_manual_reminder()` to apply same normalization

4. **UI Validation**
   - SmartBillForm already correctly sends 'low'/'medium'/'high'
   - Added better error message when constraint violation occurs

### Files Modified

**Database:**
- New migration with priority normalization in triggers

**Frontend:**
- `src/pages/Bills.tsx`: Added graceful error handling with user-friendly messages

**Tests:**
- `tests/bill-priority.test.ts`: Comprehensive tests for all priority values

---

## Testing

### New Test Files

1. **`tests/logging.test.ts`**
   - ✅ Edge function accepts valid log events
   - ✅ Logs inserted into database correctly
   - ✅ Error logs with stack traces handled
   - ✅ Required field validation

2. **`tests/bill-priority.test.ts`**
   - ✅ Create bill with "low" priority and auto-reminder
   - ✅ Create bill with "high" priority and auto-reminder
   - ✅ Default to "medium" when not specified
   - ✅ Handle custom reminder_days_before

### Run Tests

```bash
npm test
```

---

## Configuration Changes

**`supabase/config.toml`**
- Added `log-client-event` function with `verify_jwt = false` (public endpoint)

---

## Deployment Checklist

- [x] Database migration applied
- [x] Edge function created: `log-client-event`
- [x] Frontend logger helper created
- [x] ErrorBoundary integrated with logging
- [x] Add Bill error handling improved
- [x] Analytics error logging added
- [x] Admin logs page created
- [x] Tests added and passing
- [x] Config.toml updated

---

## Verification Steps

### 1. Test Error Logging

1. Open browser console
2. Navigate to `/bills`
3. Try to add a bill with invalid data
4. Check `/admin/logs` to see the logged error

### 2. Test Add Bill Priority Fix

1. Go to `/bills`
2. Click "Add New Bill"
3. Fill in form with:
   - Name: "Test Electricity"
   - Amount: 2500
   - Due Date: 7 days from now
   - Priority: "High Priority"
   - Auto-Remind: ON (1 day before)
4. Click "Add Bill"
5. ✅ Should succeed without constraint error
6. Check that reminder was created:
   ```sql
   SELECT b.name, br.priority, br.reminder_days_before
   FROM bills b
   JOIN bill_reminders br ON br.bill_id = b.id
   WHERE b.name = 'Test Electricity';
   ```

### 3. Test Admin Logs UI

1. Login as admin
2. Navigate to `/admin/logs`
3. View recent logs
4. Filter by "Errors" only
5. Click eye icon to view details
6. Verify stack trace and context visible

---

## Edge Function Testing

Test the edge function directly:

```bash
# In Supabase Dashboard > Edge Functions > log-client-event
curl -X POST https://yqzzcvkgeoghirfrflzq.supabase.co/functions/v1/log-client-event \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "level": "info",
    "event": "test_event",
    "message": "Testing from curl",
    "context": {"test": true}
  }'
```

Expected response:
```json
{"success": true, "request_id": "uuid-here"}
```

---

## Follow-up Items

1. **Monitor Logs** in `/admin/logs` for recurring errors
2. **Set up alerts** for critical errors (optional, future enhancement)
3. **Add log retention policy** to prevent table growth (recommended: keep 30 days)
4. **Consider log aggregation** for production (optional)

---

## Secrets Required

✅ All required secrets already configured:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No new secrets needed.

---

## Links

- **Admin Logs Page:** /admin/logs
- **Edge Function:** https://supabase.com/dashboard/project/yqzzcvkgeoghirfrflzq/functions/log-client-event/logs

---

## Acceptance Criteria

✅ New table `app_logs` created with RLS  
✅ Function `admin_get_logs` created  
✅ Edge Function `log-client-event` deployed  
✅ Helper `logEvent` integrated  
✅ ErrorBoundary logs errors  
✅ `/admin/logs` page implemented  
✅ Add Bill works without priority constraint error  
✅ Reminders created with normalized priority  
✅ All changes documented in this report  
✅ Tests pass  

---

**Report Status:** ✅ Complete  
**Ready for Production:** Yes
