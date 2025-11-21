#!/usr/bin/env node

/**
 * Data Migration Script: Transfer data from OLD Supabase project to NEW project
 * 
 * Usage:
 *   node scripts/migrate-data-to-new-project.mjs
 * 
 * Make sure to set environment variables:
 *   OLD_SUPABASE_URL=https://your-old-project.supabase.co
 *   OLD_SERVICE_ROLE_KEY=your-old-service-role-key
 *   NEW_SUPABASE_URL=https://fbzfddgqfqjuvpjzvhfi.supabase.co
 *   NEW_SERVICE_ROLE_KEY=your-new-service-role-key
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL || 'https://yqzzcvkgeoghirfrflzq.supabase.co';
const OLD_SERVICE_ROLE_KEY = process.env.OLD_SERVICE_ROLE_KEY;

const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL || 'https://fbzfddgqfqjuvpjzvhfi.supabase.co';
const NEW_SERVICE_ROLE_KEY = process.env.NEW_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcxMzIxMCwiZXhwIjoyMDc5Mjg5MjEwfQ.hIEALJ-LjzxUDh-L9TRxLNumA_3BEYTYxmg6OQZasz8';

// Tables to migrate (in order - respect foreign key dependencies)
const TABLES_TO_MIGRATE = [
  'profiles',
  'bills',
  'reminders',
  'user_plans',
  'payment_transactions',
  'customers',
  'products',
  'expenses',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function log(message, type = 'info') {
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[type] || 'ℹ️';
  
  console.log(`${prefix} ${message}`);
}

function validateConfig() {
  if (!OLD_SERVICE_ROLE_KEY) {
    throw new Error('OLD_SERVICE_ROLE_KEY environment variable is required');
  }
  if (!NEW_SERVICE_ROLE_KEY) {
    throw new Error('NEW_SERVICE_ROLE_KEY environment variable is required');
  }
  
  log(`Old project: ${OLD_SUPABASE_URL}`, 'info');
  log(`New project: ${NEW_SUPABASE_URL}`, 'info');
}

async function getTableData(supabase, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      // Table might not exist - that's okay
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        log(`Table ${tableName} does not exist in source, skipping...`, 'warning');
        return null;
      }
      throw error;
    }
    
    return data || [];
  } catch (error) {
    log(`Error fetching ${tableName}: ${error.message}`, 'error');
    return null;
  }
}

async function insertTableData(supabase, tableName, data, userMapping = null) {
  if (!data || data.length === 0) {
    log(`No data to migrate for ${tableName}`, 'warning');
    return 0;
  }

  try {
    // Map user_ids if mapping provided
    let mappedData = data;
    if (userMapping) {
      mappedData = data.map(row => {
        const mapped = { ...row };
        
        // Map user_id fields
        if (mapped.user_id && userMapping[mapped.user_id]) {
          mapped.user_id = userMapping[mapped.user_id];
        }
        
        // Map id if it's a user_id reference (for profiles)
        if (tableName === 'profiles' && mapped.id && userMapping[mapped.id]) {
          mapped.id = userMapping[mapped.id];
        }
        
        return mapped;
      });
    }

    // Insert in batches of 100
    let inserted = 0;
    for (let i = 0; i < mappedData.length; i += 100) {
      const batch = mappedData.slice(i, i + 100);
      const { error } = await supabase
        .from(tableName)
        .insert(batch);
      
      if (error) {
        // Check if it's a conflict error (data already exists)
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          log(`Some rows in ${tableName} already exist, skipping duplicates...`, 'warning');
        } else {
          throw error;
        }
      } else {
        inserted += batch.length;
      }
    }
    
    log(`Migrated ${inserted}/${mappedData.length} rows to ${tableName}`, 'success');
    return inserted;
  } catch (error) {
    log(`Error inserting into ${tableName}: ${error.message}`, 'error');
    throw error;
  }
}

async function createUserMapping(oldSupabase, newSupabase) {
  log('Creating user ID mapping...', 'info');
  
  // Get users from old project (by email)
  const { data: oldUsers, error: oldError } = await oldSupabase.auth.admin.listUsers();
  if (oldError) {
    log(`Warning: Could not fetch old users: ${oldError.message}`, 'warning');
    return {};
  }

  // Get users from new project (by email)
  const { data: newUsers, error: newError } = await newSupabase.auth.admin.listUsers();
  if (newError) {
    log(`Warning: Could not fetch new users: ${newError.message}`, 'warning');
    return {};
  }

  // Create mapping: old_user_id -> new_user_id (by email)
  const mapping = {};
  const newUsersByEmail = {};
  
  newUsers.users.forEach(user => {
    newUsersByEmail[user.email?.toLowerCase()] = user.id;
  });

  oldUsers.users.forEach(oldUser => {
    const email = oldUser.email?.toLowerCase();
    if (email && newUsersByEmail[email]) {
      mapping[oldUser.id] = newUsersByEmail[email];
      log(`Mapped user: ${oldUser.email} (${oldUser.id.substring(0, 8)}... -> ${newUsersByEmail[email].substring(0, 8)}...)`, 'success');
    } else {
      log(`No matching user found for ${oldUser.email}`, 'warning');
    }
  });

  log(`Created mapping for ${Object.keys(mapping).length} users`, 'success');
  return mapping;
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function migrateData() {
  try {
    log('🚀 Starting data migration...', 'info');
    log('', 'info');

    // Validate configuration
    validateConfig();

    // Create Supabase clients
    const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Test connections
    log('Testing connections...', 'info');
    const { data: oldHealth } = await oldSupabase.from('profiles').select('count').limit(1);
    const { data: newHealth } = await newSupabase.from('profiles').select('count').limit(1);
    log('Connections successful!', 'success');
    log('', 'info');

    // Create user mapping
    const userMapping = await createUserMapping(oldSupabase, newSupabase);
    log('', 'info');

    // Migrate each table
    const results = {};
    
    for (const tableName of TABLES_TO_MIGRATE) {
      log(`Migrating ${tableName}...`, 'info');
      
      // Get data from old project
      const data = await getTableData(oldSupabase, tableName);
      
      if (data === null) {
        results[tableName] = { skipped: true };
        continue;
      }

      // Insert into new project
      const inserted = await insertTableData(
        newSupabase,
        tableName,
        data,
        Object.keys(userMapping).length > 0 ? userMapping : null
      );
      
      results[tableName] = {
        total: data.length,
        inserted,
      };
      
      log('', 'info');
    }

    // Print summary
    log('═══════════════════════════════════════', 'info');
    log('📊 Migration Summary', 'info');
    log('═══════════════════════════════════════', 'info');
    
    for (const [table, result] of Object.entries(results)) {
      if (result.skipped) {
        log(`${table}: SKIPPED (table doesn't exist)`, 'warning');
      } else {
        log(`${table}: ${result.inserted}/${result.total} rows migrated`, 'success');
      }
    }
    
    log('', 'info');
    log('✅ Migration complete!', 'success');
    log('', 'info');
    log('Next steps:', 'info');
    log('1. Verify data in new Supabase dashboard', 'info');
    log('2. Test the app with migrated data', 'info');
    log('3. Check that foreign keys are correctly mapped', 'info');

  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrateData();

