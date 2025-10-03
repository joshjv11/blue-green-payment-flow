# 🚀 Deployment Checklist for NEW Supabase Project

## ✅ Pre-Deployment

- [ ] **Environment Variables Set**
  - `VITE_SUPABASE_URL=https://qusloccwftavvcsttmnq.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` (from Supabase dashboard)
  - `SUPABASE_SERVICE_ROLE_KEY` (keep secure!)

- [ ] **Database Schema Applied**
  ```bash
  make db.setup
  ```

- [ ] **First Admin User Created**
  - Sign up via app
  - Run: `make admin EMAIL=your-email@example.com`

- [ ] **Smoke Tests Pass**
  ```bash
  npm run supa:check  # or: make smoke
  make verify
  ```

## 🔐 Authentication Configuration

### Google OAuth Setup

1. **Navigate to Auth Providers:**
   https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/providers

2. **Enable Google Provider**
   - Toggle "Enable Google provider"
   - Add your Google Client ID
   - Add your Google Client Secret

3. **Set Redirect URLs**
   - **Redirect URL:** `https://qusloccwftavvcsttmnq.supabase.co/auth/v1/callback`
   - Click "Save"

### Site URL Configuration

1. **Navigate to Auth Settings:**
   https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/url-configuration

2. **Set Site URL:**
   - **Development:** `http://localhost:8080`
   - **Production:** `https://app.invoiceflow.in` (or your domain)

3. **Add Redirect URLs** (comma-separated):
   ```
   http://localhost:8080/**
   https://app.invoiceflow.in/**
   ```

### Email Templates

Customize auth emails (optional):
https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/templates

**Recommended changes:**
- Welcome email
- Password reset email
- Magic link email

### Email Confirmation Settings

For development/testing:
- Disable "Confirm email" to speed up testing
- Re-enable for production

https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/providers
→ Email Auth → Toggle "Confirm email"

## 📊 Database Configuration

### RLS Policies

Verify RLS is enabled and policies are correct:
https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/database/policies

**Expected policies:**
- `profiles`: Users see own profile, admins see all
- `bills`: Users see own bills only
- `reminders`: Users see own reminders only

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

## 🌐 Production Deployment

### Frontend (.env for production)

```bash
VITE_SUPABASE_URL=https://qusloccwftavvcsttmnq.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

**Never include:**
- `SUPABASE_SERVICE_ROLE_KEY` in frontend builds

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

## ✨ Final Checklist

- [ ] All environment variables set
- [ ] Database schema applied
- [ ] RLS policies enabled and tested
- [ ] First admin user created
- [ ] Google OAuth configured (if using)
- [ ] Site URL and redirect URLs set
- [ ] Smoke tests passing
- [ ] Production build tested
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Team notified of new project

**Once complete, your app is ready for production! 🎉**
