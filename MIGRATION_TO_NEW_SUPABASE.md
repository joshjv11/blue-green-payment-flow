# Migration to New Supabase Project - COMPLETE ✅

## Target Project
- **Project ID**: `fbzfddgqfqjuvpjzvhfi`
- **URL**: `https://fbzfddgqfqjuvpjzvhfi.supabase.co`
- **Anon Key**: (see `.env` file)
- **Service Role Key**: (see `.env` file)

## Completed Steps

### ✅ 1. Schema Preparation
- Created `schema-for-new-project.sql` with complete schema including:
  - Auth schema setup
  - Profiles, bills, reminders tables
  - RLS policies
  - Triggers and functions
  - Storage buckets

### ✅ 2. Config Files Updated
- ✅ `src/lib/supabase.ts` - Updated fallback URL and keys
- ✅ `src/integrations/supabase/client.ts` - Updated to new project
- ✅ `supabase/config.toml` - Updated project_id
- ✅ `src/components/InvoiceOCRUploader.tsx` - Updated project ref
- ✅ `src/pages/AdminDbHealth.tsx` - Updated URLs
- ✅ `src/lib/logger.ts` - Updated URLs and keys

### ✅ 3. Test Script Created
- Created `scripts/test-new-supabase.mjs` for connection testing

## Next Steps (Manual)

### 1. Apply Schema to New Supabase Project

**Option A: Via Supabase SQL Editor (Recommended)**
1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/sql/new

2. Copy the entire contents of `schema-for-new-project.sql`

3. Paste into SQL Editor and click "Run" (or press Cmd/Ctrl + Enter)

4. Verify tables were created:
   - Go to Table Editor
   - You should see: `profiles`, `bills`, `reminders`

**Option B: Via Supabase CLI**
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login with CLI access token
supabase login --token sbp_c25a6951ea35fc18aba383fe912725fbefff5f14

# Link to new project (will prompt for database password)
supabase link --project-ref fbzfddgqfqjuvpjzvhfi

# Apply schema
supabase db push
```

### 2. Update Environment Variables

Create/update `.env` or `.env.local`:

```bash
VITE_SUPABASE_URL=https://fbzfddgqfqjuvpjzvhfi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTMyMTAsImV4cCI6MjA3OTI4OTIxMH0.ulFXrPwMvrXJGIjli9KQvoM_T8lb6VBqGHfP_LsfQ7Q
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcxMzIxMCwiZXhwIjoyMDc5Mjg5MjEwfQ.hIEALJ-LjzxUDh-L9TRxLNumA_3BEYTYxmg6OQZasz8
```

### 3. Test the Migration

```bash
# Test connection
node scripts/test-new-supabase.mjs

# Start the app
npm run dev

# Test features:
# - Sign up a new user
# - Create a bill
# - Create a reminder
# - Test admin features (if applicable)
```

### 4. Verify Tables Exist

After applying schema, run the test script:
```bash
node scripts/test-new-supabase.mjs
```

You should see:
```
✅ profiles table exists
✅ bills table exists
✅ reminders table exists
```

## Important Notes

1. **Auth Users**: Users from the old project won't be automatically migrated. Users will need to sign up again or you'll need to migrate auth data separately.

2. **Data Migration**: If you need to migrate data from the old project:
   - Export data from old project
   - Import into new project
   - See `migration/` directory for scripts

3. **Storage Buckets**: Storage buckets (`invoice-pdfs`, `receipts`) will be created automatically by the schema script.

4. **Edge Functions**: Edge functions need to be redeployed to the new project:
   ```bash
   supabase functions deploy <function-name> --project-ref fbzfddgqfqjuvpjzvhfi
   ```

## Files Changed

- `schema-for-new-project.sql` - Complete schema for new project
- `scripts/migrate-to-new-supabase.mjs` - Migration helper script
- `scripts/test-new-supabase.mjs` - Connection test script
- `scripts/apply-schema-via-api.mjs` - Schema preparation script
- `src/lib/supabase.ts` - Updated fallback keys
- `src/integrations/supabase/client.ts` - Updated project ref
- `supabase/config.toml` - Updated project_id
- `src/components/InvoiceOCRUploader.tsx` - Updated project ref
- `src/pages/AdminDbHealth.tsx` - Updated URLs
- `src/lib/logger.ts` - Updated URLs and keys

## Verification Checklist

- [ ] Schema applied to new Supabase project
- [ ] Tables visible in Table Editor (profiles, bills, reminders)
- [ ] `.env` file updated with new credentials
- [ ] Connection test passes (`node scripts/test-new-supabase.mjs`)
- [ ] App starts without errors (`npm run dev`)
- [ ] Can sign up a new user
- [ ] Can create a bill
- [ ] Can create a reminder
- [ ] Storage buckets exist (invoice-pdfs, receipts)

## Troubleshooting

### Tables not found
- Make sure you've run `schema-for-new-project.sql` in Supabase SQL Editor
- Check Supabase dashboard for any SQL errors

### Connection fails
- Verify `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check that the anon key matches the one from Supabase dashboard

### Auth errors
- Verify email confirmation is disabled in Supabase Auth settings (if needed)
- Check Site URL in Auth settings matches your app URL



