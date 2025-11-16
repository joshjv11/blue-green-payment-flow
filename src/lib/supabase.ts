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

const FALLBACK_SUPABASE_URL = 'https://pmcvuqdjiepqlkwnmwgo.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtY3Z1cWRqaWVwcWxrd25td2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNzg0MjQsImV4cCI6MjA3ODg1NDQyNH0.A2d1_reMbnSUsI0KFHhY_0sjgjmr3Pm80QDK5hEGarc';

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL') ?? FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ?? FALLBACK_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Validate API key format
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.length < 100) {
  console.error('❌ Invalid Supabase API key detected. Please check your VITE_SUPABASE_ANON_KEY environment variable.');
}

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const usingEnvKey = Boolean(getEnvVar('VITE_SUPABASE_ANON_KEY'));
  console.log('🔧 Creating singleton Supabase client...');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Using ${usingEnvKey ? 'environment' : 'fallback'} API key`);

  if (!SUPABASE_ANON_KEY) {
    console.error('❌ Supabase API key is missing! Please set VITE_SUPABASE_ANON_KEY in your .env file.');
    throw new Error('Supabase API key is required');
  }

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
