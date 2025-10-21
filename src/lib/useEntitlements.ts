import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Entitlements = {
  user_id: string;
  plan: string;
  is_premium: boolean;
  is_enterprise: boolean;
  subscription_status: boolean | null;
  current_period_end: string | null;
};

export function useEntitlements() {
  const [data, setData] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setData(null);
          setLoading(false);
          return;
        }
        
        const { data: entitlements, error: fetchError } = await supabase
          .from('user_entitlements_v1')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (fetchError) throw fetchError;
        setData(entitlements as Entitlements);
      } catch (e: any) {
        setError(e?.message ?? String(e));
        // Fallback to free plan on error
        setData({
          user_id: '',
          plan: 'free',
          is_premium: false,
          is_enterprise: false,
          subscription_status: null,
          current_period_end: null,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { 
    data, 
    loading, 
    error, 
    isPremium: !!data?.is_premium, 
    plan: data?.plan ?? 'free' 
  };
}
