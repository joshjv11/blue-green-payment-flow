#!/usr/bin/env node

/**
 * Quick migration script for YOUR data (joshuavaz55@gmail.com)
 * This migrates all data for users who are already signed up
 */

import { createClient } from '@supabase/supabase-js';

const OLD_SUPABASE_URL = 'https://qusloccwftavvcsttmnq.supabase.co';
const OLD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc4OTQxNCwiZXhwIjoyMDc0MzY1NDE0fQ.sabLfnzwaJxxhzvmy0k0U4rtOKeFvKKJGRScnx64y0M';

const NEW_SUPABASE_URL = 'https://fbzfddgqfqjuvpjzvhfi.supabase.co';
const NEW_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcxMzIxMCwiZXhwIjoyMDc5Mjg5MjEwfQ.hIEALJ-LjzxUDh-L9TRxLNumA_3BEYTYxmg6OQZasz8';

const MY_EMAIL = 'joshuavaz55@gmail.com';

async function migrateMyData() {
  console.log('🚀 Migrating YOUR data...\n');

  const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SERVICE_ROLE_KEY);
  const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY);

  // Get user IDs
  const { data: oldUsers } = await oldSupabase.auth.admin.listUsers();
  const { data: newUsers } = await newSupabase.auth.admin.listUsers();

  const oldUser = oldUsers.users.find(u => u.email.toLowerCase() === MY_EMAIL.toLowerCase());
  const newUser = newUsers.users.find(u => u.email.toLowerCase() === MY_EMAIL.toLowerCase());

  if (!oldUser) {
    console.error(`❌ User ${MY_EMAIL} not found in old project`);
    return;
  }

  if (!newUser) {
    console.error(`❌ User ${MY_EMAIL} not found in new project. Please sign up first!`);
    return;
  }

  console.log(`✅ Found you in both projects!`);
  console.log(`   Old ID: ${oldUser.id.substring(0, 8)}...`);
  console.log(`   New ID: ${newUser.id.substring(0, 8)}...\n`);

  const tables = ['profiles', 'bills', 'reminders', 'user_plans', 'payment_transactions', 'customers', 'products', 'expenses'];
  
  for (const table of tables) {
    try {
      // Get your data from old project
      const { data: oldData, error: fetchError } = await oldSupabase
        .from(table)
        .select('*');

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.log(`⚠️  ${table}: Table doesn't exist in old project`);
          continue;
        }
        console.error(`❌ Error fetching ${table}:`, fetchError.message);
        continue;
      }

      if (!oldData || oldData.length === 0) {
        console.log(`⚠️  ${table}: No data found`);
        continue;
      }

      // Filter to only YOUR data
      let myData = oldData;
      if (table === 'profiles') {
        myData = oldData.filter(row => row.id === oldUser.id);
      } else {
        myData = oldData.filter(row => row.user_id === oldUser.id);
      }

      if (myData.length === 0) {
        console.log(`⚠️  ${table}: No data for you`);
        continue;
      }

      // First, get what columns exist in the new table
      let allowedColumns = null;
      try {
        // Try to get a sample row to see what columns exist
        const { data: sample } = await newSupabase.from(table).select('*').limit(1);
        if (sample && sample.length > 0) {
          allowedColumns = Object.keys(sample[0]);
        } else {
          // If no data, try inserting an empty object to see what columns are allowed
          // Actually, let's just use the first row's columns as a guide
          if (mappedData.length > 0) {
            // We'll filter based on what we try to insert
            allowedColumns = Object.keys(mappedData[0]);
          }
        }
      } catch (e) {
        // If we can't get columns, we'll filter by trying to insert
      }

      // Map user IDs and filter columns
      const mappedData = myData.map(row => {
        const mapped = { ...row };
        if (table === 'profiles') {
          mapped.id = newUser.id;
        } else if (mapped.user_id) {
          mapped.user_id = newUser.id;
        }
        
        // Filter to only columns that exist in new table
        if (allowedColumns && allowedColumns.length > 0) {
          const filtered = {};
          allowedColumns.forEach(col => {
            if (mapped.hasOwnProperty(col)) {
              filtered[col] = mapped[col];
            }
          });
          return filtered;
        }
        
        // Known columns to remove for each table
        if (table === 'profiles') {
          delete mapped.email;
          delete mapped.avatar_url;
          delete mapped.phone_number;
          delete mapped.whatsapp_phone_number;
          delete mapped.whatsapp_reminder_settings;
          delete mapped.short_id;
          delete mapped.business_legal_name;
          delete mapped.company_address;
          delete mapped.company_gstin;
          delete mapped.company_pan;
          delete mapped.company_state;
          delete mapped.company_state_code;
          delete mapped.email_notifications_enabled;
          delete mapped.sms_notifications_enabled;
          delete mapped.reminder_email;
          delete mapped.tax_regime;
          delete mapped.is_active;
        } else if (table === 'bills') {
          // Map name to title before filtering
          if (mapped.name && !mapped.title) {
            mapped.title = mapped.name;
          }
          // Ensure title exists
          if (!mapped.title && mapped.name) {
            mapped.title = mapped.name;
          }
          // Keep only: id, user_id, title, amount, due_date, status, notes, created_at, updated_at
          const allowedBillCols = ['id', 'user_id', 'title', 'amount', 'due_date', 'status', 'notes', 'created_at', 'updated_at'];
          const filtered = {};
          allowedBillCols.forEach(col => {
            if (col === 'title' && !mapped.title && mapped.name) {
              filtered[col] = mapped.name; // Use name as fallback for title
            } else if (mapped.hasOwnProperty(col)) {
              filtered[col] = mapped[col];
            }
          });
          // Ensure title is not null
          if (!filtered.title && mapped.name) {
            filtered.title = mapped.name;
          }
          return filtered;
        }
        
        return mapped;
      });

      // Insert into new project row by row to handle errors gracefully
      let inserted = 0;
      for (const row of mappedData) {
        try {
          const { error: insertError } = await newSupabase
            .from(table)
            .upsert(row, { onConflict: table === 'profiles' ? 'id' : undefined });
          
          if (insertError) {
            console.error(`   Row failed: ${insertError.message.substring(0, 80)}`);
          } else {
            inserted++;
          }
        } catch (e) {
          console.error(`   Row error: ${e.message.substring(0, 80)}`);
        }
      }
      
      if (inserted > 0) {
        console.log(`✅ ${table}: Migrated ${inserted}/${mappedData.length} rows`);
      }

      // Already handled above
    } catch (error) {
      console.error(`❌ Error with ${table}:`, error.message);
    }
  }

  console.log('\n✅ Migration complete! Check your app now.');
}

migrateMyData();

