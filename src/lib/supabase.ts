/**
 * SINGLETON Supabase client wrapper — now pointed at self-hosted PostgREST.
 * DB queries (supabase.from(...)) still work identically.
 * Auth and Storage are handled by the custom Express API (VITE_API_BASE).
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

// PostgREST URL — must be set via VITE_PGRST_URL environment variable.
// No fallback to any Supabase URL; a missing var will log a clear error.
const PGRST_URL = (() => {
  const url = getEnvVar('VITE_PGRST_URL');
  if (!url) {
    console.error(
      '❌ VITE_PGRST_URL is not set. ' +
      'Add it to your Vercel environment variables and redeploy. ' +
      'DB queries will fail until this is configured.'
    );
    return '';
  }
  return url;
})();

// PostgREST anon key — use the value from VITE_SUPABASE_ANON_KEY.
// Set it to "dummy-key" in Vercel if you are using self-hosted PostgREST.
const PGRST_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') ?? 'dummy-key';

export const isSupabaseConfigured = Boolean(PGRST_URL && PGRST_ANON_KEY);

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  console.log('🔧 Creating PostgREST client...');
  console.log(`📍 PostgREST URL: ${PGRST_URL}`);

  supabaseInstance = createClient<Database>(PGRST_URL, PGRST_ANON_KEY, {
    auth: {
      // Auth is handled by our custom Express server — disable built-in Supabase auth.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
        // Inject our custom JWT so PostgREST RLS policies still work.
        const token =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('invoiceflow_jwt')
            : null;
        if (token) {
          const headers = new Headers(options?.headers);
          headers.set('Authorization', `Bearer ${token}`);
          options = { ...options, headers };
        }
        return fetch(url, options);
      },
    },
  });

  return supabaseInstance;
}

const _rawClient = getSupabaseClient();

/**
 * Compatibility shim: patch supabase.auth so the dozens of existing
 * `supabase.auth.getUser()` / `supabase.auth.getSession()` call sites keep working
 * without modification. They now read the user/session from localStorage instead
 * of making a round-trip to Supabase Auth.
 */
function patchAuthCompat(client: ReturnType<typeof createClient<Database>>) {
  const buildFakeUser = () => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('invoiceflow_user') : null;
    if (!raw) return null;
    try {
      const u = JSON.parse(raw);
      return {
        id: u.id,
        email: u.email,
        user_metadata: u.user_metadata || { full_name: u.full_name, company: u.company },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };
    } catch { return null; }
  };

  const buildFakeSession = () => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('invoiceflow_jwt') : null;
    const user = buildFakeUser();
    if (!token || !user) return null;
    return { access_token: token, token_type: 'bearer', user } as any;
  };

  // Override auth methods with localStorage-backed shims
  const origAuth = client.auth as any;
  origAuth.getUser = async () => ({ data: { user: buildFakeUser() }, error: null });
  origAuth.getSession = async () => ({ data: { session: buildFakeSession() }, error: null });
  // signOut: clear localStorage (actual signOut is handled by useAuth hook)
  origAuth.signOut = async () => {
    window.localStorage.removeItem('invoiceflow_jwt');
    window.localStorage.removeItem('invoiceflow_user');
    return { error: null };
  };

  return client;
}

export const supabase = (typeof window !== 'undefined')
  ? patchAuthCompat(_rawClient)
  : _rawClient;

// ---------------------------------------------------------------------------
// Helpers for code that previously called supabase.auth.getUser()
// ---------------------------------------------------------------------------

export interface AppUser {
  id: string;
  email: string;
  full_name?: string | null;
  company?: string | null;
  user_metadata?: Record<string, any>;
}

/** Read the currently logged-in user from localStorage (set by useAuth on login). */
export function getCurrentUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('invoiceflow_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

/** Read the raw JWT string from localStorage. */
export function getCurrentToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('invoiceflow_jwt');
}
