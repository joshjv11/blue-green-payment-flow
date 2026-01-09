import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Entitlements = {
  user_id: string;
  plan: string;
  is_premium: boolean;
  is_pro: boolean;
  is_enterprise: boolean;
  subscription_status: boolean | null;
  current_period_end: string | null;
};

export function useEntitlements() {
  const [data, setData] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('❌ useEntitlements auth error:', 
            authError.message || 'Unknown error',
            '\nCode:', authError.code,
            '\nFull error:', authError
          );
          if (isMounted) {
            setData(null);
            setLoading(false);
          }
          return;
        }
        
        if (!user) {
          if (isMounted) {
            setData(null);
            setLoading(false);
          }
          return;
        }
        
        // Query user_plans table directly instead of view
        const { data: userPlan, error: fetchError } = await supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (fetchError) {
          console.error('❌ useEntitlements fetch error:', 
            fetchError.message || 'Unknown error',
            '\nCode:', fetchError.code,
            '\nDetails:', fetchError.details,
            '\nHint:', fetchError.hint,
            '\nFull error:', fetchError
          );
          throw fetchError;
        }
        
        if (!isMounted) return;
        
        if (userPlan) {
          // Check if plan is active
          const isActive = userPlan.is_active && (!userPlan.expires_at || new Date(userPlan.expires_at) > new Date());
          const plan = userPlan.plan || 'free';
          
          setData({
            user_id: user.id,
            plan: plan,
            is_premium: (plan === 'premium' || plan === 'pro') && isActive,
            is_pro: (plan === 'pro') && isActive,
            is_enterprise: plan === 'enterprise' && isActive,
            subscription_status: isActive,
            current_period_end: userPlan.expires_at,
          });
        } else {
          // No plan found - set free plan
          setData({
            user_id: user.id,
            plan: 'free',
            is_premium: false,
            is_pro: false,
            is_enterprise: false,
            subscription_status: null,
            current_period_end: null,
          });
        }
      } catch (e: any) {
        if (!isMounted) return;
        
        console.error('❌ useEntitlements error:', 
          e?.message || String(e),
          '\nCode:', e?.code,
          '\nDetails:', e?.details,
          '\nHint:', e?.hint,
          '\nFull error:', e
        );
        setError(e?.message ?? String(e));
        // Fallback to free plan on error
        setData({
          user_id: '',
          plan: 'free',
          is_premium: false,
          is_pro: false,
          is_enterprise: false,
          subscription_status: null,
          current_period_end: null,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return { 
    data, 
    loading, 
    error, 
    isPremium: !!data?.is_premium, 
    isPro: !!data?.is_pro,
    plan: data?.plan ?? 'free' 
  };
}
