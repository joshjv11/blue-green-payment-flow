import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '../../.env.old' });
const OLD_URL = process.env.OLD_SUPABASE_URL!;
const OLD_KEY = process.env.OLD_SERVICE_ROLE_KEY!;

dotenv.config({ path: '../../.env.new' });
const NEW_URL = process.env.NEW_SUPABASE_URL!;
const NEW_KEY = process.env.NEW_SERVICE_ROLE_KEY!;

const oldSupabase = createClient(OLD_URL, OLD_KEY, {
  auth: { persistSession: false }
});

const newSupabase = createClient(NEW_URL, NEW_KEY, {
  auth: { persistSession: false }
});

interface User {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at?: string;
  phone?: string;
  user_metadata?: any;
  app_metadata?: any;
}

async function exportUsers(): Promise<User[]> {
  console.log('→ Fetching users from OLD project...');
  
  // Use Admin API to list users
  const { data, error } = await oldSupabase.auth.admin.listUsers({
    perPage: 1000 // Adjust as needed
  });
  
  if (error) {
    console.error('ERROR fetching users:', error);
    throw error;
  }
  
  const users = data.users.map((u: any) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    email_confirmed_at: u.email_confirmed_at,
    phone: u.phone,
    user_metadata: u.user_metadata,
    app_metadata: u.app_metadata
  }));
  
  console.log(`  ✓ Fetched ${users.length} users`);
  
  // Save to file
  const exportPath = path.join('../../exports/auth/old_users.json');
  fs.writeFileSync(exportPath, JSON.stringify(users, null, 2));
  console.log(`  ✓ Saved to ${exportPath}`);
  
  return users;
}

async function importUsers(users: User[]): Promise<void> {
  console.log('→ Importing users to NEW project...');
  
  const userMapping: { old_id: string; new_id: string; email: string }[] = [];
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`  [${i + 1}/${users.length}] ${user.email}`);
    
    try {
      // Create user via Admin API
      const { data, error } = await newSupabase.auth.admin.createUser({
        email: user.email,
        email_confirm: !!user.email_confirmed_at,
        phone: user.phone,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata
      });
      
      if (error) {
        console.error(`    ✗ Error: ${error.message}`);
        failed++;
        continue;
      }
      
      console.log(`    ✓ Created (ID: ${data.user.id})`);
      
      // Track mapping
      userMapping.push({
        old_id: user.id,
        new_id: data.user.id,
        email: user.email
      });
      
      success++;
      
      // Rate limiting: small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err: any) {
      console.error(`    ✗ Exception: ${err.message}`);
      failed++;
    }
  }
  
  console.log('');
  console.log(`✓ Import complete: ${success} success, ${failed} failed`);
  
  // Save user mapping
  const mappingPath = path.join('../../exports/auth/user_mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(userMapping, null, 2));
  console.log(`✓ User mapping saved to ${mappingPath}`);
  
  // Generate SQL to remap FKs
  generateRemapSQL(userMapping);
}

function generateRemapSQL(mapping: { old_id: string; new_id: string; email: string }[]): void {
  const sqlPath = path.join('../../exports/auth/rekey_user_fks.sql');
  
  const mappingValues = mapping
    .map(m => `  ('${m.old_id}', '${m.new_id}')`)
    .join(',\n');
  
  const sql = `
-- Generated user ID mapping from Path B migration
-- Run this after data import to update foreign keys

CREATE TEMP TABLE user_id_mapping (
  old_user_id UUID,
  new_user_id UUID
);

INSERT INTO user_id_mapping (old_user_id, new_user_id) VALUES
${mappingValues};

-- Update user_id in all dependent tables

-- profiles
UPDATE public.profiles p
SET id = m.new_user_id
FROM user_id_mapping m
WHERE p.id = m.old_user_id;

-- bills
UPDATE public.bills b
SET user_id = m.new_user_id
FROM user_id_mapping m
WHERE b.user_id = m.old_user_id;

-- user_plans
UPDATE public.user_plans up
SET user_id = m.new_user_id
FROM user_id_mapping m
WHERE up.user_id = m.old_user_id;

-- Add more tables as needed

SELECT COUNT(*) AS remapped_count FROM user_id_mapping;
`;
  
  fs.writeFileSync(sqlPath, sql);
  console.log(`✓ FK remap SQL generated: ${sqlPath}`);
}

async function main() {
  try {
    const users = await exportUsers();
    await importUsers(users);
    
    console.log('');
    console.log('========================================');
    console.log('✓ User migration complete');
    console.log('========================================');
    console.log('');
    console.log('Next: Run data import, then execute:');
    console.log('  psql $NEW_DB_URL -f exports/auth/rekey_user_fks.sql');
    
  } catch (error: any) {
    console.error('FATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();
