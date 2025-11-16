import fs from 'fs';
import { Client } from 'pg';

async function main() {
  const dbUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  const schemaPath = process.argv[2] || 'scripts/schema-consolidated.sql';
  if (!dbUrl) {
    console.error('DATABASE_PUBLIC_URL (or DATABASE_URL) is required in env');
    process.exit(1);
  }
  let sql = fs.readFileSync(schemaPath, 'utf8');
  // Remove moddatetime extension creation if present (not available on vanilla Postgres)
  sql = sql.replace(/create\s+extension\s+if\s+not\s+exists\s+moddatetime[\s\S]*?;/gi, '');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`Connected. Applying schema from ${schemaPath} ...`);
    // Ensure auth schema exists for FK references used in our schema (compat layer).
    const prelude = `
      create schema if not exists auth;
      create table if not exists auth.users (
        id uuid primary key,
        email text,
        created_at timestamptz default now()
      );
      create or replace function auth.uid()
      returns uuid
      language sql
      stable
      as $$
        select nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),'')::uuid
      $$;
      create schema if not exists extensions;
      drop function if exists extensions.moddatetime();
      create or replace function extensions.moddatetime()
      returns trigger as $$
      begin
        if TG_ARGV[0] is not null then
          -- ignore arg, keep compat
          null;
        end if;
        if NEW is distinct from OLD then
          if exists (select 1
                     from information_schema.columns
                     where table_schema = TG_TABLE_SCHEMA
                       and table_name = TG_TABLE_NAME
                       and column_name = 'updated_at') then
            NEW.updated_at = now();
          end if;
        end if;
        return NEW;
      end;
      $$ language plpgsql;
    `;
    await client.query(prelude);
    await client.query(sql);
    console.log('✅ Schema applied successfully.');
  } catch (e) {
    console.error('❌ Schema apply failed:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();


