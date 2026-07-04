import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import * as orgsApi from '@/lib/endpoints/orgs';
import { useToast } from './use-toast';

interface PremiumStatus {
  isPremium: boolean;
  hasProAccess: boolean;
  plan: 'free' | 'pro' | 'premium';
  isActive: boolean;
  expiresAt: string | null;
  isExpiringSoon: boolean;
  loading: boolean;
}

export const usePremiumStatus = (): PremiumStatus => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    hasProAccess: false,
    plan: 'free',
    isActive: false,
    expiresAt: null,
    isExpiringSoon: false,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setStatus((prev) => ({ ...prev, loading: false }));
      return;
    }

    const fetchPremiumStatus = async () => {
      try {
        const org = await orgsApi.getMyOrganization();
        const plan = (org.plan === 'pro' || org.plan === 'premium' ? org.plan : 'free') as PremiumStatus['plan'];
        const isPremium = plan !== 'free';

        setStatus({
          isPremium,
          hasProAccess: isPremium,
          plan,
          isActive: isPremium,
          expiresAt: null,
          isExpiringSoon: false,
          loading: false,
        });
      } catch (error: unknown) {
        console.warn('Premium status unavailable, defaulting to free:', error);
        setStatus({
          isPremium: false,
          hasProAccess: false,
          plan: 'free',
          isActive: false,
          expiresAt: null,
          isExpiringSoon: false,
          loading: false,
        });
      }
    };

    fetchPremiumStatus();
    const interval = setInterval(fetchPremiumStatus, 60_000);
    return () => clearInterval(interval);
  }, [user, toast]);

  return status;
};
