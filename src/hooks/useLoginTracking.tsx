import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { trackFeatureUsage } from '@/lib/analytics';

/**
 * Hook to track user login events
 * Only tracks once per session to avoid memory waste
 */
export function useLoginTracking() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Track login only once per session
    const loginTracked = sessionStorage.getItem('login_tracked');
    if (!loginTracked) {
      trackFeatureUsage('User Login', 'view', {
        user_id: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });
      sessionStorage.setItem('login_tracked', 'true');
    }
  }, [user]);
}

