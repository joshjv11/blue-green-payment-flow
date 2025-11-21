# Quick Start Guide - New Supabase Project

## 🎯 Target Project
**Project ID**: `fbzfddgqfqjuvpjzvhfi`  
**URL**: `https://fbzfddgqfqjuvpjzvhfi.supabase.co`

## ⚡ 3-Step Setup

### Step 1: Apply Schema (2 minutes)
1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/sql/new

2. Copy entire contents of `schema-for-new-project.sql`

3. Paste and click **"Run"** (or press `Cmd/Ctrl + Enter`)

4. Verify tables created:
   - Go to Table Editor
   - You should see: `profiles`, `bills`, `reminders`

### Step 2: Set Environment Variables (1 minute)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Or create `.env.local` manually:
```bash
VITE_SUPABASE_URL=https://fbzfddgqfqjuvpjzvhfi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTMyMTAsImV4cCI6MjA3OTI4OTIxMH0.ulFXrPwMvrXJGIjli9KQvoM_T8lb6VBqGHfP_LsfQ7Q
```

### Step 3: Test Connection (30 seconds)
```bash
node scripts/test-new-supabase.mjs
```

You should see:
```
✅ profiles table exists
✅ bills table exists
✅ reminders table exists
✅ Auth service is accessible
```

## 🚀 Start the App
```bash
npm run dev
```

Then:
1. Sign up a new user
2. Create your first bill
3. Test reminders

## ✅ Verification Checklist
- [ ] Schema applied (tables visible in Table Editor)
- [ ] `.env.local` created with credentials
- [ ] Connection test passes
- [ ] App starts without errors
- [ ] Can sign up a new user
- [ ] Can create a bill

## 📚 More Info
See `MIGRATION_TO_NEW_SUPABASE.md` for detailed migration steps and troubleshooting.

