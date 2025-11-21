#!/usr/bin/env node
/**
 * Test script to verify connection to new Supabase project
 */

import { createClient } from '@supabase/supabase-js';

const NEW_PROJECT_REF = 'fbzfddgqfqjuvpjzvhfi';
const NEW_PROJECT_URL = `https://${NEW_PROJECT_REF}.supabase.co`;
const NEW_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiemZkZGdxZnFqdXZwanp2aGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTMyMTAsImV4cCI6MjA3OTI4OTIxMH0.ulFXrPwMvrXJGIjli9KQvoM_T8lb6VBqGHfP_LsfQ7Q';

async function testConnection() {
  console.log('🧪 Testing connection to new Supabase project...\n');
  console.log(`📍 Project: ${NEW_PROJECT_REF}`);
  console.log(`🌐 URL: ${NEW_PROJECT_URL}\n`);

  try {
    const supabase = createClient(NEW_PROJECT_URL, NEW_ANON_KEY);

    // Test 1: Health check
    console.log('1️⃣ Testing API health...');
    const { data: healthData, error: healthError } = await supabase.from('profiles').select('count').limit(1);
    
    if (healthError && healthError.code === 'PGRST116') {
      console.log('⚠️  profiles table not found - schema may not be applied yet');
      console.log('   Run schema-for-new-project.sql in Supabase SQL Editor\n');
    } else if (healthError) {
      console.log(`❌ API Error: ${healthError.message}\n`);
    } else {
      console.log('✅ API connection successful\n');
    }

    // Test 2: Check if tables exist (via a safe query)
    console.log('2️⃣ Checking database structure...');
    const tables = ['profiles', 'bills', 'reminders'];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`   ⚠️  ${table} table not found`);
        } else {
          console.log(`   ❌ ${table}: ${error.message}`);
        }
      } else {
        console.log(`   ✅ ${table} table exists`);
      }
    }

    console.log('\n3️⃣ Testing auth configuration...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log(`   ⚠️  Auth check: ${authError.message}`);
    } else {
      console.log('   ✅ Auth service is accessible');
    }

    console.log('\n✅ Connection tests complete!');
    console.log('\n📝 Next steps:');
    console.log('1. If tables are missing, run schema-for-new-project.sql in Supabase SQL Editor');
    console.log('2. Update .env file with new credentials');
    console.log('3. Test the app: npm run dev');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testConnection();

