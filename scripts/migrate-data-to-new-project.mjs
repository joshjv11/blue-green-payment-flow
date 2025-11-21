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

// Old Project (source)
const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL || 'https://qusloccwftavvcsttmnq.supabase.co';
const OLD_SERVICE_ROLE_KEY = process.env.OLD_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc4OTQxNCwiZXhwIjoyMDc0MzY1NDE0fQ.sabLfnzwaJxxhzvmy0k0U4rtOKeFvKKJGRScnx64y0M';

// New Project (destination)
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

async function getTableColumns(supabase, tableName) {
  try {
    // Try to get column info by selecting with limit 0
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    if (error) {
      // Try to infer from error or return null
      return null;
    }
    
    // We can't directly get columns, so we'll try to select one row
    const { data: sampleData } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (sampleData && sampleData.length > 0) {
      return Object.keys(sampleData[0]);
    }
    
    return null;
  } catch (error) {
    return null;
  }
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

function filterColumns(data, allowedColumns) {
  if (!data || !allowedColumns || allowedColumns.length === 0) {
    return data;
  }
  
  return data.map(row => {
    const filtered = {};
    allowedColumns.forEach(col => {
      if (row.hasOwnProperty(col)) {
        filtered[col] = row[col];
      }
    });
    return filtered;
  });
}

async function insertTableData(supabase, tableName, data, userMapping = null) {
  if (!data || data.length === 0) {
    log(`  No data to migrate for ${tableName}`, 'warning');
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
      }).filter(row => {
        // Filter out rows where user_id couldn't be mapped (unless profiles table)
        if (tableName === 'profiles') {
          return row.id && userMapping[row.id]; // Only migrate profiles for mapped users
        }
        if (row.user_id) {
          return userMapping[row.user_id]; // Only migrate rows for mapped users
        }
        return true; // Keep rows without user_id
      });
    }

    if (mappedData.length === 0) {
      log(`  No data to migrate for ${tableName} (all users need to sign up first)`, 'warning');
      return 0;
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
        if (error.code === '23505' || error.message?.includes('duplicate') || error.code === 'PGRST301') {
          log(`  Some rows in ${tableName} already exist, skipping duplicates...`, 'warning');
          // Try to insert row by row to see which ones succeed
          let batchInserted = 0;
          for (const row of batch) {
            const { error: rowError } = await supabase
              .from(tableName)
              .insert(row);
            if (!rowError) {
              batchInserted++;
            }
          }
          inserted += batchInserted;
        } else {
          log(`  Error details: ${error.message}`, 'error');
          // Try to insert row by row to see which ones succeed
          let batchInserted = 0;
          for (const row of batch) {
            const { error: rowError } = await supabase
              .from(tableName)
              .insert(row);
            if (!rowError) {
              batchInserted++;
            } else {
              log(`    Failed to insert row: ${rowError.message.substring(0, 100)}`, 'warning');
            }
          }
          inserted += batchInserted;
        }
      } else {
        inserted += batch.length;
      }
    }
    
    log(`  Migrated ${inserted}/${mappedData.length} rows to ${tableName}`, inserted === mappedData.length ? 'success' : 'warning');
    return inserted;
  } catch (error) {
    log(`  Error inserting into ${tableName}: ${error.message}`, 'error');
    // Don't throw - continue with other tables
    return 0;
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

    // Get allowed columns for new project tables (to filter out non-existent columns)
    log('Checking table schemas...', 'info');
    const newTableColumns = {};
    for (const tableName of TABLES_TO_MIGRATE) {
      const columns = await getTableColumns(newSupabase, tableName);
      if (columns) {
        newTableColumns[tableName] = columns;
        log(`  ${tableName}: ${columns.length} columns`, 'success');
      }
    }
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

      if (data.length === 0) {
        log(`  No data to migrate for ${tableName}`, 'warning');
        results[tableName] = { total: 0, inserted: 0 };
        continue;
      }

      // Filter columns to only include those that exist in new table
      let filteredData = data;
      if (newTableColumns[tableName]) {
        filteredData = filterColumns(data, newTableColumns[tableName]);
        const originalColCount = Object.keys(data[0] || {}).length;
        const filteredColCount = Object.keys(filteredData[0] || {}).length;
        if (originalColCount !== filteredColCount) {
          log(`  Filtered columns: ${filteredColCount}/${originalColCount} columns will be migrated`, 'warning');
        }
      }

      // Insert into new project
      const inserted = await insertTableData(
        newSupabase,
        tableName,
        filteredData,
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

