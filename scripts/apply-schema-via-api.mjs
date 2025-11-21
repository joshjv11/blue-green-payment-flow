#!/usr/bin/env node
/**
 * Apply schema to new Supabase project using REST API
 * This script formats the SQL for easy copy-paste into Supabase SQL Editor
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEW_PROJECT_REF = 'fbzfddgqfqjuvpjzvhfi';
const NEW_PROJECT_URL = `https://${NEW_PROJECT_REF}.supabase.co`;

console.log('📋 Preparing schema for new Supabase project...');
console.log(`📍 Project: ${NEW_PROJECT_REF}`);
console.log(`🌐 URL: ${NEW_PROJECT_URL}\n`);

// Read the consolidated schema
const schemaPath = path.join(__dirname, 'schema-consolidated.sql');
let schemaSql = readFileSync(schemaPath, 'utf8');

// Enhance schema with storage buckets setup
const enhancedSchema = `
-- ========================================
-- SUPABASE SCHEMA SETUP FOR ${NEW_PROJECT_REF}
-- ========================================
-- Run this entire script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/${NEW_PROJECT_REF}/sql/new
-- ========================================

-- Ensure schemas exist
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS storage;

-- Create auth.users table placeholder (Supabase manages this, but we need it for FKs)
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  encrypted_password text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create auth.uid() function shim
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),'')::uuid
$$;

-- Create moddatetime trigger function
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

-- ========================================
-- MAIN SCHEMA (from schema-consolidated.sql)
-- ========================================

${schemaSql}

-- ========================================
-- STORAGE BUCKETS
-- ========================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('invoice-pdfs', 'invoice-pdfs', false),
  ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- VERIFICATION
-- ========================================

SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) as column_count
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
`;

// Write enhanced schema to file
const outputPath = path.join(__dirname, '../schema-for-new-project.sql');
const fs = await import('fs');
fs.writeFileSync(outputPath, enhancedSchema, 'utf8');

console.log('✅ Schema prepared!');
console.log('');
console.log('📝 Next steps:');
console.log('1. Open Supabase SQL Editor:');
console.log(`   https://supabase.com/dashboard/project/${NEW_PROJECT_REF}/sql/new`);
console.log('');
console.log('2. Copy and paste the contents of:');
console.log(`   ${outputPath}`);
console.log('');
console.log('3. Click "Run" (or press Cmd/Ctrl + Enter)');
console.log('');
console.log('4. Verify tables were created in Table Editor');
console.log('');
console.log('Alternatively, you can use Supabase CLI:');
console.log(`   supabase link --project-ref ${NEW_PROJECT_REF} --password <db_password>`);
console.log(`   supabase db push`);
console.log('');

