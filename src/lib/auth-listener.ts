import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';

type AuthHandler = (event: AuthChangeEvent, session: Session | null) => void;

const handlers = new Set<AuthHandler>();
let initialized = false;

export function initAuthListener() {
  if (initialized) {
    return;
  }

  initialized = true;

  supabase.auth.onAuthStateChange((event, session) => {
    handlers.forEach((handler) => {
      try {
        handler(event, session);
      } catch (error) {
        console.error('Auth handler error', error);
      }
    });

    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['plan'] });
  });
}

export function subscribeToAuthEvents(handler: AuthHandler) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}
