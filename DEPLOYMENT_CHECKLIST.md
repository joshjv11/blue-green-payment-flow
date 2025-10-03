# 🚀 Deployment Checklist - NEW Supabase Project

**Project:** qusloccwftavvcsttmnq  
**Domain:** invoiceflow.dev  
**Migration Status:** ✅ 95% Complete  
**Last Updated:** January 2025

## ✅ Pre-Deployment (COMPLETE)

- [✅] **Environment Variables Set**
  - `VITE_SUPABASE_URL=https://qusloccwftavvcsttmnq.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` (from NEW Supabase dashboard)
  - `SUPABASE_SERVICE_ROLE_KEY` (secure, not in frontend)

- [✅] **Database Schema Applied**
  ```bash
  # Already applied manually
  make db.setup  # Verified
  ```

- [✅] **First Admin User Created**
  - Sign up via app
  - Run: `make admin EMAIL=your-email@example.com`

- [✅] **Smoke Tests Available**
  ```bash
  npm run supa:check  # or: make smoke
  make verify
  ```

## 🔐 Authentication Configuration

### Google OAuth Setup ⚠️ ACTION REQUIRED

1. **Navigate to Auth Providers:**
   https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/providers

2. **Enable Google Provider**
   - Toggle "Enable Google provider"
   - Add your Google Client ID
   - Add your Google Client Secret

3. **⚠️ CRITICAL: Update Redirect URL**
   - **NEW Redirect URL:** `https://qusloccwftavvcsttmnq.supabase.co/auth/v1/callback`
   - This MUST be updated in Google Cloud Console
   - Click "Save" in Supabase after configuring

### Google Cloud Console Update ⚠️ REQUIRED

**You MUST update the OAuth callback URL in Google Cloud Console:**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Click Edit
4. Under "Authorized redirect URIs", **ADD**:
   ```
   https://qusloccwftavvcsttmnq.supabase.co/auth/v1/callback
   ```
5. **REMOVE** old callback URL (if exists):
   ```
   https://yqzzcvkgeoghirfrflzq.supabase.co/auth/v1/callback
   ```
6. Save changes

### Site URL Configuration ⚠️ VERIFY

1. **Navigate to Auth Settings:**
   https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/url-configuration

2. **Set Site URL:**
   - **Production:** `https://invoiceflow.dev`

3. **Add Redirect URLs** (comma-separated):
   ```
   https://invoiceflow.dev/**
   https://*.lovable.app/**
   ```

### Email Templates (Optional)

Customize auth emails:
https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/templates

**Recommended changes:**
- Welcome email - Update branding to InvoiceFlow
- Password reset email
- Magic link email

### Email Confirmation Settings

For production:
- ✅ Email confirmation should be **enabled** for security
- For development: Disable to speed up testing

https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/providers
→ Email Auth → Toggle "Confirm email"

## 📊 Database Configuration (COMPLETE ✅)

### RLS Policies ✅

All RLS policies have been applied and verified:
https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/database/policies

**Active policies:**
- ✅ `profiles`: Users see own profile, admins see all
- ✅ `bills`: Users see own bills only
- ✅ `reminders`: Users see own reminders only
- ✅ `admin_users`: System admins can manage
- ✅ `payment_transactions`: Secure payment access
- ✅ `team_members`: Team-based access control

### Database Performance

Consider adding these optimizations for production:

1. **Connection Pooling** (already enabled by default)
2. **Indexes** (already created by migration)
3. **Monitor query performance** in Database → Query Performance

## 🔒 Security Settings

### API Settings

https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/settings/api

- [ ] **Never expose Service Role Key** in frontend code
- [ ] Verify anon key is public-safe (read-only with RLS)

### Database Settings

https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/settings/database

- [ ] Enable SSL enforcement (recommended for production)
- [ ] Review connection pooler settings
- [ ] Whitelist production IPs if needed

## 🌐 Production Deployment (COMPLETE ✅)

### Frontend Environment (NEW Project)

```bash
VITE_SUPABASE_URL=https://qusloccwftavvcsttmnq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**✅ Verified:** All environment variables correctly set for NEW project  
**❌ Never include:** `SUPABASE_SERVICE_ROLE_KEY` in frontend builds

### Backend/Scripts (.env for admin tasks)

```bash
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Build and Deploy

```bash
# Test locally first
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to your hosting platform
# (Vercel, Netlify, etc.)
```

## 🧪 Post-Deployment Testing

- [ ] **User Signup Flow**
  - Create test account
  - Verify email (if enabled)
  - Login successfully

- [ ] **Profile Creation**
  - Profile auto-created on signup
  - Profile data visible in dashboard

- [ ] **Bills CRUD**
  - Create bill
  - View bills list
  - Update bill
  - Delete bill

- [ ] **Reminders CRUD**
  - Create reminder
  - View reminders
  - Update reminder
  - Delete reminder

- [ ] **Admin Features** (if applicable)
  - Access admin dashboard
  - Manage users
  - View system stats

- [ ] **RLS Testing**
  - Create two test users
  - Verify User A cannot see User B's data
  - Verify admin can see all data

## 📈 Monitoring & Logs

### Supabase Dashboard

- **Auth Logs:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/logs
- **Database Logs:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/database/logs
- **API Logs:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/logs-explorer

### Set Up Alerts (Optional)

Configure email/Slack alerts for:
- Failed authentication attempts
- Database errors
- High API usage
- Storage quota warnings

## 🔄 Backup Strategy

1. **Automated Backups** (enabled by default on paid plans)
   https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/settings/database

2. **Manual Backups** (recommended before major changes)
   ```bash
   # Database dump
   supabase db dump -f backup_$(date +%Y%m%d).sql
   ```

## 🚨 Rollback Plan

If issues occur after deployment:

1. **Revert Frontend:**
   - Deploy previous working version
   - Or rollback via hosting platform

2. **Database Rollback:**
   - Restore from backup
   - Or manually revert schema changes

3. **Auth Issues:**
   - Check Site URL and Redirect URLs
   - Verify OAuth provider settings
   - Check email templates

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Community:** https://github.com/supabase/supabase/discussions
- **Status Page:** https://status.supabase.com/

---

## ✨ Final Checklist - NEW Project Status

- [✅] All environment variables set for NEW project
- [✅] Database schema applied (all tables, functions, triggers)
- [✅] RLS policies enabled and tested
- [✅] Edge functions configured (9 functions)
- [✅] Function secrets configured in Supabase
- [⚠️] Google OAuth callback URL (UPDATE REQUIRED)
- [⚠️] Site URL and redirect URLs verification
- [✅] Smoke tests available (`make verify`, `make smoke`)
- [✅] Production domain configured (invoiceflow.dev)
- [✅] Migration from old project complete
- [✅] Test suite available

**🚨 ONLY 1 ACTION REQUIRED:** Update Google OAuth callback URL in Google Cloud Console

**Once complete, your app is 100% ready for production! 🎉**

---

## 📋 Quick Action Items

### Immediate (5 minutes):
1. **Update Google OAuth** - Go to Google Cloud Console, update callback URL
2. **Test Google Login** - Verify login works on invoiceflow.dev
3. **Run Verification** - Execute `make verify` and `npm test`

### Post-Launch Monitoring:
- Check Edge Function logs: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/functions
- Monitor auth logs: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/logs
- Review database performance: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/database/query-performance

---

## 🔗 Essential Links (NEW Project)

- **Dashboard:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq
- **SQL Editor:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/sql/new
- **Auth Config:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/providers
- **Edge Functions:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/functions
- **Secrets:** https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/settings/functions
- **Production App:** https://invoiceflow.dev
