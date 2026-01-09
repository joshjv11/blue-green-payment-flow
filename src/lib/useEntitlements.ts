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
          console.error('❌ useEntitlements auth error:', {
            message: authError.message || 'Unknown error',
            code: authError.code,
            fullError: JSON.stringify(authError, Object.getOwnPropertyNames(authError), 2)
          });
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
        // Use order and limit to get the latest plan if multiple exist
        const { data: userPlans, error: fetchError } = await supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        const userPlan = userPlans && userPlans.length > 0 ? userPlans[0] : null;
        
        if (fetchError) {
          console.error('❌ useEntitlements fetch error:', {
            message: fetchError.message || 'Unknown error',
            code: fetchError.code,
            details: fetchError.details,
            hint: fetchError.hint,
            fullError: JSON.stringify(fetchError, Object.getOwnPropertyNames(fetchError), 2)
          });
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
        
        console.error('❌ useEntitlements error:', {
          message: e?.message || String(e),
          code: e?.code,
          details: e?.details,
          hint: e?.hint,
          fullError: e ? JSON.stringify(e, Object.getOwnPropertyNames(e), 2) : 'No error object'
        });
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
