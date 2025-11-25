import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Hardcoded admin email - matches AdminCMS.tsx
const ADMIN_EMAIL = 'joshuavaz55@gmail.com';

export function useSystemAdminStatus() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Development override: treat everyone as admin for debugging
    if (process.env.NODE_ENV === 'development') {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const checkAdmin = async () => {
      if (!user?.email) {
        if (isMounted) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        // Simple email-based admin check
        const isAdminUser = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        if (isMounted) {
          setIsAdmin(isAdminUser);
        }
      } catch (err: any) {
        console.warn('[AdminGuard] Admin check failure:', err);
        if (isMounted) {
          setIsAdmin(false);
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
  }, [user?.email]);

  return { isAdmin, loading };
}




