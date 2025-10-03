# NEW Supabase Project Setup Guide

This guide walks you through reconnecting your app to the NEW Supabase project with a fresh schema.

## 🎯 Overview

**NEW Project Details:**
- Project Ref: `qusloccwftavvcsttmnq`
- URL: `https://qusloccwftavvcsttmnq.supabase.co`
- Status: Fresh installation, clean schema

## 📋 Prerequisites

- Node.js LTS (v18+)
- PostgreSQL client (`psql`)
- Supabase CLI (optional but recommended): `npm install -g supabase`
- Your NEW project credentials (anon key, service role key)

## 🚀 Quick Start

### 1. Set Environment Variables

Create/update your `.env` file:

```bash
# Copy the example
cp .env.example .env

# Edit .env and add your NEW project credentials:
VITE_SUPABASE_URL=https://qusloccwftavvcsttmnq.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key-here
```

**⚠️ IMPORTANT:** Never commit `.env` to git!

### 2. Apply Database Schema

```bash
# This creates tables, RLS policies, triggers, and functions
make db.setup
```

This will create:
- ✅ `profiles` table (user profiles with admin flag)
- ✅ `bills` table (invoices/bills)
- ✅ `reminders` table (bill reminders)
- ✅ RLS policies for all tables
- ✅ Auto-create profile trigger on signup
- ✅ Updated_at triggers
- ✅ Helper functions

### 3. Update App Configuration

The app's Supabase client files have been updated to point to the NEW project:
- `src/integrations/supabase/client.ts`
- `src/lib/supabase.ts`

No additional changes needed!

### 4. Sign Up Your First User

1. Start your app: `npm run dev`
2. Navigate to the signup page
3. Create your account
4. Verify your email (check Supabase Auth settings if you need to disable email confirmation for testing)

### 5. Promote Yourself to Admin

```bash
make admin EMAIL=your-email@example.com
```

This sets `is_admin=true` on your profile, giving you access to admin features.

### 6. Verify Setup

```bash
# Run smoke tests
make smoke

# Check database
make verify
```

## 🔧 Additional Configuration

### Google OAuth Setup

1. Go to: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/providers
2. Enable Google provider
3. Set redirect URL to: `https://qusloccwftavvcsttmnq.supabase.co/auth/v1/callback`
4. Add your app's domain to "Authorized redirect URLs"
5. Set Site URL to your production domain (e.g., `https://app.invoiceflow.in`)

### Email Templates

Customize auth emails:
https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/templates

### RLS Policies

View/edit policies:
https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/database/policies

## 📥 Importing Old Data (Optional)

If you have CSV exports from your old project:

1. Place CSV files in `import/` directory:
   - `import/profiles.csv`
   - `import/bills.csv`
   - `import/reminders.csv`

2. Review `import/README.md` for CSV format requirements

3. Run import:
   ```bash
   make import
   ```

**Note:** User mapping is required if `user_id` UUIDs differ between projects.

## 🧪 Testing Checklist

- [ ] Environment variables set in `.env`
- [ ] Database schema applied (`make db.setup`)
- [ ] Can sign up new user via app
- [ ] Profile auto-created on signup
- [ ] Admin promotion works (`make admin`)
- [ ] Can create/view bills
- [ ] Can create/view reminders
- [ ] RLS prevents users from seeing each other's data
- [ ] Smoke tests pass (`make smoke`)
- [ ] Google OAuth configured (if using)

## 🐛 Troubleshooting

### "relation 'profiles' does not exist"
Run: `make db.setup`

### "User already exists" on import
This is safe - the import script uses `ON CONFLICT DO NOTHING`

### Can't connect to database
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check if IP is whitelisted (Supabase dashboard → Settings → Database)
- Ensure you're using the NEW project credentials

### RLS blocks queries
- Ensure you're logged in
- Verify your user has a profile in the database
- Check admin flag if accessing admin routes

### Email confirmation required
Disable in Supabase dashboard:
https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/providers
→ Email → Disable "Confirm email"

## 📚 Useful Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq
- **SQL Editor:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/sql/new
- **Auth Users:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/users
- **Database Tables:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/editor
- **RLS Policies:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/database/policies

## 🔄 Migration from Old Project

Since you no longer have access to the old project, the main migration scripts in `/migration` are for reference only. If you later regain access, you can use those scripts to automate the full migration.

For now, follow the "Quick Start" above to get your app running on the NEW project with a fresh start.

## ⚡ Commands Reference

```bash
# Setup
make db.setup                    # Apply schema to NEW project
make admin EMAIL=user@email.com  # Promote user to admin

# Verification
make verify                      # List tables and row counts
make smoke                       # Run connectivity tests

# Import (optional)
make import                      # Import data from CSV files

# Cleanup
make clean                       # Remove temporary files
```

## 🎉 Next Steps

Once setup is complete:

1. **Test core features:** Signup, login, create bills, create reminders
2. **Configure production:** Set production URLs in Auth settings
3. **Enable features:** Email templates, OAuth providers, webhooks
4. **Monitor:** Set up error tracking and analytics
5. **Deploy:** Update production environment variables

---

**Questions?** Check the main `README.md` or Supabase documentation.
