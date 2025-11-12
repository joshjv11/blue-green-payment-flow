/**
 * SINGLETON Supabase client wrapper
 * Re-exports the auto-generated client from @/integrations/supabase/client
 * with apiFetch configured to prevent infinite buffering and timeouts.
 * 
 * ALWAYS import from here, NOT from @/integrations/supabase/client directly
 * to ensure only ONE client instance exists across the app.
 */

import { createClient } from '@supabase/supabase-js';
import { apiFetch } from './apiFetch';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://qusloccwftavvcsttmnq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NjgzMzYsImV4cCI6MjA1MTA0NDMzNn0.XNMiO9LcWBCCb5cGa4pFEKSsJmXQ7rCmfqZhJ0d-vE0";

// Check if Supabase is configured
export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Singleton instance - created ONCE and memoized
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  console.log('🔧 Creating singleton Supabase client...');

  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: apiFetch,
    },
  });

  console.log('✅ Supabase client initialized');
  return supabaseInstance;
}

// Export memoized singleton instance
export const supabase = getSupabaseClient();