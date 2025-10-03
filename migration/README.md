# Supabase Project Migration Guide

## Overview
Automated, idempotent migration from OLD Supabase project to NEW project.

**NEW Project Details:**
- Project Ref: `qusloccwftavvcsttmnq`
- URL: `https://qusloccwftavvcsttmnq.supabase.co`

## Prerequisites
- Node.js LTS (v18+)
- PostgreSQL client (`psql`)
- Supabase CLI (`npm install -g supabase`)
- Linux/macOS shell

## Environment Setup

1. Copy environment templates:
```bash
cp .env.example .env.old
cp .env.example .env.new
```

2. Fill in `.env.old` with OLD project credentials:
```bash
OLD_PROJECT_REF=your-old-project-ref
OLD_SUPABASE_URL=https://your-old-project.supabase.co
OLD_SERVICE_ROLE_KEY=your-old-service-role-key
```

3. Fill in `.env.new` with NEW project credentials:
```bash
NEW_PROJECT_REF=qusloccwftavvcsttmnq
NEW_SUPABASE_URL=https://qusloccwftavvcsttmnq.supabase.co
NEW_ANON_KEY=your-new-anon-key
NEW_SERVICE_ROLE_KEY=your-new-service-role-key
```

## Migration Steps (Recommended Order)

### 1. Schema Migration
```bash
make schema.dump-old    # Export schema from OLD project
make schema.push-new    # Apply schema to NEW project
```

### 2. Data Export
```bash
make data.export        # Export all data from OLD project to CSV
```

### 3. Auth Migration (Choose ONE path)

**Path A: Easy Re-login (Recommended)**
Users re-login on NEW project. User mapping by email.
```bash
make auth.pathA
```

**Path B: Advanced UUID Preservation**
Attempt to preserve user UUIDs. Requires Admin API access.
```bash
make auth.pathB
```

### 4. Data Import
```bash
make data.import        # Import data to NEW project
```

### 5. Storage Sync
```bash
make storage.sync       # Copy all storage buckets and files
```

### 6. Verification
```bash
make verify            # Run sanity checks and compare counts
```

### 7. Generate Report
```bash
make report            # Create MIGRATION_REPORT.md
```

## Full Migration Command
```bash
make migrate           # Run all steps in sequence
```

## Auth Migration Paths

### Path A: Easy Re-login
- Users will need to re-login on the new project
- User IDs will be different
- Foreign keys are remapped by matching emails
- **Pros:** Simple, always works
- **Cons:** Users must re-authenticate

### Path B: Advanced UUID Preservation
- Attempts to preserve original user UUIDs
- Uses Supabase Admin API
- Builds user mapping table if UUIDs differ
- **Pros:** Seamless for users
- **Cons:** Complex, may have API limitations

## OAuth Reconfiguration

After migration, update OAuth providers in NEW project:
1. Go to: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/auth/providers
2. Update redirect URLs to: `https://qusloccwftavvcsttmnq.supabase.co/auth/v1/callback`
3. Re-save all enabled providers (Google, etc.)

## Application Configuration

Update your app's `.env` file:
```bash
VITE_SUPABASE_URL=https://qusloccwftavvcsttmnq.supabase.co
VITE_SUPABASE_ANON_KEY=${NEW_ANON_KEY}
```

## Troubleshooting

### Schema issues
- Check extensions: `make schema.check-extensions`
- Manually enable missing extensions in NEW project

### Data import fails
- Check FK constraints: `make data.check-fks`
- Verify table order in `scripts/table-order.txt`

### RLS blocks queries
- Temporarily disable RLS during import
- Re-enable after verification

### Storage sync slow
- Increase parallelism in `scripts/storage-sync.ts`
- Run multiple times (idempotent)

## Files Generated
- `exports/schema.sql` - Full schema dump
- `exports/data/*.csv` - Data exports per table
- `exports/auth/users.json` - User export (Path B only)
- `exports/storage/manifest.json` - Storage file list
- `MIGRATION_REPORT.md` - Final migration report

## Safety Features
- All scripts are idempotent (re-runnable)
- Dry-run mode available for most operations
- Transaction-based imports with rollback
- No hardcoded credentials
- Comprehensive logging

## Support
Review logs in `logs/` directory for detailed execution traces.
