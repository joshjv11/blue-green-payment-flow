/**
 * Smoke test to verify Supabase connectivity and basic setup
 * Run: npm run supa:check
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

async function runSmokeTests() {
  console.log('🔍 Running Supabase Smoke Tests...\n');

  // Test 1: Anon key connectivity
  console.log('1️⃣  Testing anon key connectivity...');
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    const { data, error } = await anonClient.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
      console.log('   ⚠️  Could not query profiles (expected if RLS is strict):', error.message);
    } else {
      console.log('   ✅ Anon client connected successfully');
    }
  } catch (err) {
    console.error('   ❌ Anon client failed:', err);
  }

  // Test 2: Service role key (if provided)
  if (SUPABASE_SERVICE_ROLE_KEY) {
    console.log('\n2️⃣  Testing service role key...');
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
      // Check auth users count (sanitized)
      const { count: userCount, error: userError } = await serviceClient
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (userError) {
        console.log('   ⚠️  Could not query profiles:', userError.message);
      } else {
        console.log(`   ✅ Service role connected. Profiles count: ${userCount ?? 0}`);
      }

      // Check tables exist
      const { data: tables, error: tablesError } = await serviceClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['profiles', 'bills', 'reminders']);

      if (tablesError) {
        console.log('   ⚠️  Could not query information_schema:', tablesError.message);
      } else {
        console.log('   ✅ Tables found:', tables?.map(t => t.table_name).join(', '));
      }
    } catch (err) {
      console.error('   ❌ Service role test failed:', err);
    }
  } else {
    console.log('\n2️⃣  Skipping service role test (SUPABASE_SERVICE_ROLE_KEY not set)');
  }

  // Test 3: Database time (simple health check)
  console.log('\n3️⃣  Testing database health...');
  try {
    const { data, error } = await anonClient.rpc('now' as any);
    if (error) {
      console.log('   ⚠️  RPC call failed:', error.message);
    } else {
      console.log('   ✅ Database responding:', data);
    }
  } catch (err) {
    console.log('   ℹ️  RPC test skipped (function may not exist)');
  }

  console.log('\n✅ Smoke tests complete!');
  console.log('\nNext steps:');
  console.log('  - Sign up via your app');
  console.log('  - Promote your user to admin: make admin "your-email@example.com"');
  console.log('  - Run: make verify');
}

runSmokeTests().catch(console.error);
