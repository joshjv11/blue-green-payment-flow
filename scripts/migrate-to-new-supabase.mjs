#!/usr/bin/env node
/**
 * Migration script to apply schema and setup to new Supabase project
 * Target: fbzfddgqfqjuvpjzvhfi
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// New project credentials
const NEW_PROJECT_REF = 'fbzfddgqfqjuvpjzvhfi';
const NEW_PROJECT_URL = `https://${NEW_PROJECT_REF}.supabase.co`;
const NEW_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTMyMTAsImV4cCI6MjA3OTI4OTIxMH0.ulFXrPwMvrXJGIjli9KQvoM_T8lb6VBqGHfP_LsfQ7Q';
const NEW_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcxMzIxMCwiZXhwIjoyMDc5Mjg5MjEwfQ.hIEALJ-LjzxUDh-L9TRxLNumA_3BEYTYxmg6OQZasz8';

// Build database connection string
const DB_URL = `postgresql://postgres:${NEW_SERVICE_ROLE_KEY}@db.${NEW_PROJECT_REF}.supabase.co:5432/postgres`;

const client = new Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

async function applySchema() {
  try {
    console.log('🔌 Connecting to new Supabase project...');
    console.log(`📍 Project: ${NEW_PROJECT_REF}`);
    console.log(`🌐 URL: ${NEW_PROJECT_URL}`);
    await client.connect();
    console.log('✅ Connected!\n');

    // Step 1: Ensure required schemas exist
    console.log('📦 Step 1: Setting up schemas...');
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE SCHEMA IF NOT EXISTS extensions;
      CREATE SCHEMA IF NOT EXISTS storage;
    `);
    console.log('✅ Schemas created\n');

    // Step 2: Create auth.users table if it doesn't exist (Supabase manages this, but we need it for FKs)
    console.log('👤 Step 2: Setting up auth.users placeholder...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text,
        encrypted_password text,
        raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    console.log('✅ Auth users table ready\n');

    // Step 3: Create auth.uid() function shim
    console.log('🔧 Step 3: Creating auth.uid() shim...');
    await client.query(`
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $$
        SELECT NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),'')::uuid
      $$;
    `);
    console.log('✅ auth.uid() function created\n');

    // Step 4: Create moddatetime extension shim
    console.log('⏰ Step 4: Creating moddatetime trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION extensions.moddatetime()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF TG_ARGV[0] IS NOT NULL THEN
          -- Ignore arg for compatibility
          NULL;
        END IF;
        IF NEW IS DISTINCT FROM OLD THEN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = TG_TABLE_SCHEMA
              AND table_name = TG_TABLE_NAME
              AND column_name = 'updated_at'
          ) THEN
            NEW.updated_at = now();
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    console.log('✅ moddatetime function created\n');

    // Step 5: Apply consolidated schema
    console.log('📋 Step 5: Applying consolidated schema...');
    const schemaPath = path.join(__dirname, '../schema-consolidated.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        if (statement.length > 10) { // Ignore very short statements
          await client.query(statement);
          successCount++;
        }
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          console.warn(`⚠️  Warning: ${err.message.split('\n')[0]}`);
          errorCount++;
        }
      }
    }
    
    console.log(`✅ Schema applied: ${successCount} statements executed, ${errorCount} warnings\n`);

    // Step 6: Create storage buckets
    console.log('🗄️  Step 6: Creating storage buckets...');
    await client.query(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES 
        ('invoice-pdfs', 'invoice-pdfs', false),
        ('receipts', 'receipts', false)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Storage buckets created\n');

    // Step 7: Verify setup
    console.log('✅ Step 7: Verifying setup...');
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    console.log(`📊 Found ${tablesResult.rows.length} tables in public schema:`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });
    console.log('');

    console.log('🎉 Migration complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Update .env file with:');
    console.log(`   VITE_SUPABASE_URL=${NEW_PROJECT_URL}`);
    console.log(`   VITE_SUPABASE_ANON_KEY=${NEW_ANON_KEY}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY=${NEW_SERVICE_ROLE_KEY}`);
    console.log('2. Update supabase/config.toml with project_id = "' + NEW_PROJECT_REF + '"');
    console.log('3. Test the app with: npm run dev');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySchema();

