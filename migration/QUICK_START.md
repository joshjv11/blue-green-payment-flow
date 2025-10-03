# Quick Start: Migration Commands

Run these commands in exact order:

## 1. Setup Environment
```bash
cd migration
cp .env.example .env.old
cp .env.example .env.new
```

Edit `.env.old` with OLD project credentials  
Edit `.env.new` with NEW project credentials (already has NEW project ref)

## 2. Schema Migration
```bash
make schema.dump-old
make schema.push-new
```

## 3. Data Export
```bash
make data.export
```

## 4. Auth Migration (Choose ONE)
```bash
# Path A: Simple (users re-login)
make auth.pathA

# OR Path B: Advanced (UUID preservation)
make auth.pathB
```

## 5. Data Import
```bash
make data.import
```

## 6. Storage Sync
```bash
make storage.sync
```

## 7. Verification
```bash
make verify
```

## 8. Generate Report
```bash
make report
```

---

## One-Command Migration (All steps)
```bash
make migrate
```

This runs all steps in sequence using Path A for auth.

---

## After Migration

1. Update app `.env`:
```bash
VITE_SUPABASE_URL=https://qusloccwftavvcsttmnq.supabase.co
VITE_SUPABASE_ANON_KEY=${NEW_ANON_KEY}
```

2. Reconfigure OAuth providers:
   - https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/providers
   - Update redirect URL to: `https://qusloccwftavvcsttmnq.supabase.co/auth/v1/callback`

3. Test application thoroughly

4. Review `MIGRATION_REPORT.md` for statistics
