# CSV Import Guide

This directory contains tools to import data from CSV exports into your NEW Supabase project.

## Overview

If you have CSV exports from your old project (`profiles.csv`, `bills.csv`, `reminders.csv`), you can use the SQL script provided here to import them while preserving UUIDs and relationships.

## CSV Format Requirements

### profiles.csv
```csv
id,user_id,email,full_name,company,is_admin,is_active,created_at,updated_at
uuid,uuid,email@example.com,Full Name,Company Name,false,true,2024-01-01 00:00:00+00,2024-01-01 00:00:00+00
```

### bills.csv
```csv
id,user_id,title,amount,due_date,client_email,client_name,status,notes,created_at,updated_at
uuid,uuid,Invoice Title,1000.00,2024-12-31,client@example.com,Client Name,pending,Some notes,2024-01-01 00:00:00+00,2024-01-01 00:00:00+00
```

### reminders.csv
```csv
id,bill_id,user_id,reminder_date,reminder_type,sent,created_at
uuid,uuid,uuid,2024-12-25 09:00:00+00,email,false,2024-01-01 00:00:00+00
```

## Import Steps

1. **Place your CSV files in this directory** (`import/`)

2. **Connect to your database:**
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or using psql directly
   psql "postgresql://postgres:${SUPABASE_SERVICE_ROLE_KEY}@db.qusloccwftavvcsttmnq.supabase.co:5432/postgres"
   ```

3. **Run the import script:**
   ```bash
   psql $DATABASE_URL -f import/import.sql
   ```

4. **Verify the import:**
   ```bash
   make verify
   ```

## Important Notes

- **User Mapping**: If `user_id` values in your CSVs don't match auth users in the NEW project, you'll need to:
  - First import/migrate auth users (see main migration guide)
  - Or manually create a mapping table and update foreign keys
  
- **UUID Preservation**: The script preserves original UUIDs from the CSV

- **Idempotent**: Uses `ON CONFLICT DO NOTHING`, so it's safe to re-run

- **FK Order**: Import order is: profiles → bills → reminders (respects foreign keys)

- **Transactions**: All imports are wrapped in transactions for safety

## Manual Import via Supabase Dashboard

If you prefer the UI:

1. Go to: https://supabase.com/dashboard/project/qusloccwftavvcsttmnq/editor
2. Table Editor → Select table → Insert → Import from CSV
3. Map columns correctly
4. Run import

## Troubleshooting

**Error: "duplicate key value violates unique constraint"**
- Some rows already exist. This is safe with `ON CONFLICT DO NOTHING`

**Error: "violates foreign key constraint"**
- Ensure you import in the correct order: profiles → bills → reminders
- Verify that referenced users/bills exist

**Error: "invalid input syntax for type uuid"**
- Check that UUID columns contain valid UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

## Alternative: Direct SQL Export/Import

If you have direct database access to the old project:

```bash
# Export from OLD
pg_dump -h old-host -U postgres -d postgres \
  --table=public.profiles \
  --table=public.bills \
  --table=public.reminders \
  --data-only --column-inserts > export.sql

# Import to NEW
psql $NEW_DATABASE_URL -f export.sql
```
