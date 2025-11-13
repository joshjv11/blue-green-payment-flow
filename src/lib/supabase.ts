/**
 * SINGLETON Supabase client wrapper.
 * Always import from here to ensure there is only one instance.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Helper to read environment variables in Vite/Node/browser contexts
const getEnvVar = (name: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const value = (import.meta as any).env?.[name];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  if (typeof process !== 'undefined' && process.env?.[name]) {
    return process.env[name];
  }
  if (typeof window !== 'undefined' && (window as any).__env?.[name]) {
    return (window as any).__env[name];
  }
  return undefined;
};

const FALLBACK_SUPABASE_URL = 'https://qusloccwftavvcsttmnq.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3ODk0MTQsImV4cCI6MjA3NDM2NTQxNH0.8YpZ9eWRA2c96zmMJMOBPpgNWjoKACwpwNGafOsyUS0';

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL') ?? FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ?? FALLBACK_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  console.log('🔧 Creating singleton Supabase client...');

  const authStorage =
    typeof window !== 'undefined' && window.localStorage ? window.localStorage : undefined;

  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

export const supabase = getSupabaseClient();
