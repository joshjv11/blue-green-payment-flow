import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
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
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchPremiumStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('user_is_premium')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setStatus({
            isPremium: false,
            hasProAccess: false,
            plan: 'free',
            isActive: false,
            expiresAt: null,
            isExpiringSoon: false,
            loading: false,
          });
          return;
        }

        // Check if expiring soon (within 7 days)
        const isExpiringSoon = data.expires_at 
          ? new Date(data.expires_at).getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000
          : false;

        setStatus({
          isPremium: data.is_premium || false,
          hasProAccess: data.has_pro_access || false,
          plan: (data.plan as 'free' | 'pro' | 'premium') || 'free',
          isActive: data.is_active || false,
          expiresAt: data.expires_at,
          isExpiringSoon,
          loading: false,
        });

        // Show expiry warning
        if (isExpiringSoon && data.is_active) {
          const daysLeft = Math.ceil(
            (new Date(data.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          );
          toast({
            title: "Subscription Expiring Soon",
            description: `Your ${data.plan} plan expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew to continue using premium features.`,
            variant: "default",
          });
        }

        // Show expired warning
        if (!data.is_active && data.expires_at && new Date(data.expires_at) < new Date()) {
          toast({
            title: "Subscription Expired",
            description: "Your premium access has expired. Renew to continue using advanced modules.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error('Error fetching premium status:', error);
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    fetchPremiumStatus();

    // Poll every 60 s — PostgREST has no realtime WebSocket support.
    const interval = setInterval(fetchPremiumStatus, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  return status;
};
