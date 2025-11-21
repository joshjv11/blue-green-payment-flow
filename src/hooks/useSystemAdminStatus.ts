import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function useSystemAdminStatus() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async () => {
      if (!user?.id) {
        if (isMounted) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('is_system_admin', { user_id: user.id });

        if (error) {
          if (error.code === '42883' || error.code === 'PGRST204') {
            // Function missing — treat as non-admin without spamming logs
            if (isMounted) {
              setIsAdmin(false);
            }
            return;
          }
          console.warn('[AdminGuard] is_system_admin RPC error:', error);
          if (isMounted) {
            setIsAdmin(false);
          }
          return;
        }

        if (isMounted) {
          setIsAdmin(Boolean(data));
        }
      } catch (err: any) {
        if (
          err?.code === '42883' ||
          err?.code === 'PGRST204' ||
          err?.message?.includes('does not exist')
        ) {
          if (isMounted) {
            setIsAdmin(false);
          }
        } else {
          console.warn('[AdminGuard] Unexpected admin check failure:', err);
          if (isMounted) {
            setIsAdmin(false);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return { isAdmin, loading };
}

