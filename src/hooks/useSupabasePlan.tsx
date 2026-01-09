import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type UserPlan = 'free' | 'pro' | 'premium';

interface UserPlanData {
  plan: UserPlan;
  billLimit: number;
  hasUnlimitedBills: boolean;
  hasAdvancedAnalytics: boolean;
  hasEmailReminders: boolean;
  aiQueriesLimit: number;
  aiQueriesUsed: number;
  hasUnlimitedAI: boolean;
  hasInventory: boolean;
  hasGSTAutomation: boolean;
  hasExports: boolean;
  hasFinancialReports: boolean;
  isPremium: boolean;
}

interface SupabaseUserPlan {
  id: string;
  user_id: string;
  plan: 'free' | 'pro' | 'premium';
  ai_queries_used: number;
  ai_queries_limit: number;
  ai_queries_reset_date: string;
  is_active: boolean;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useSupabasePlan = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userPlan, setUserPlan] = useState<SupabaseUserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserPlan = async () => {
    if (!user) {
      console.log('📊 No user found, skipping plan fetch');
      return;
    }

    console.log('📊 Fetching plan for user:', user.email);
    setLoading(true);

    try {
      // First try to get existing plan (latest one)
      // Use order and limit to get the latest plan if multiple exist (fixes duplicate row error)
      const { data: existingPlans, error: fetchError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const existingPlan = existingPlans && existingPlans.length > 0 ? existingPlans[0] : null;

      if (fetchError) {
        console.error('❌ Error fetching user plan:', {
          message: fetchError.message || 'Unknown error',
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
          fullError: JSON.stringify(fetchError, null, 2)
        });
        throw fetchError;
      }

      if (!existingPlan) {
        console.log('📊 No existing plan found, creating default plan...');
        
        // Try to create plan directly first (more reliable)
        const { data: directPlan, error: directError } = await supabase
          .from('user_plans')
          .insert({
            user_id: user.id,
            plan: 'free',
            ai_queries_used: 0,
            ai_queries_limit: 3,
            ai_queries_reset_date: new Date().toISOString().split('T')[0],
            is_active: true,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (!directError && directPlan) {
          console.log('✅ Plan created directly');
          setUserPlan(directPlan as SupabaseUserPlan);
          setLoading(false);
          return;
        }
        
        // If direct insert fails, try RPC as fallback
        console.log('📊 Direct insert failed, trying RPC function...');
        const { error: rpcError } = await supabase
          .rpc('create_default_user_plan', { _user_id: user.id });

        if (rpcError) {
          console.error('❌ Error creating default plan:', {
            message: rpcError.message || 'Unknown error',
            code: rpcError.code,
            details: rpcError.details,
            hint: rpcError.hint,
            fullError: JSON.stringify(rpcError, null, 2)
          });
          
          // If RPC doesn't exist, create plan directly
          if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
            console.log('📊 RPC function not found, creating plan directly...');
            const { data: directPlan, error: directError } = await supabase
              .from('user_plans')
              .insert({
                user_id: user.id,
                plan: 'free',
                ai_queries_used: 0,
                ai_queries_limit: 3,
                ai_queries_reset_date: new Date().toISOString().split('T')[0],
                is_active: true,
                started_at: new Date().toISOString(),
              })
              .select()
              .single();
            
            if (directError) {
              console.error('❌ Error creating plan directly:', {
                message: directError.message,
                code: directError.code,
                details: directError.details
              });
              throw directError;
            }
            
            console.log('✅ Plan created directly');
            setUserPlan(directPlan as SupabaseUserPlan);
            setLoading(false);
            return;
          }
          
          throw rpcError;
        }

        // Fetch the newly created plan
        const { data: newPlan, error: newFetchError } = await supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (newFetchError) {
          console.error('❌ Error fetching new plan:', {
            message: newFetchError.message || 'Unknown error',
            code: newFetchError.code,
            details: newFetchError.details,
            hint: newFetchError.hint,
            fullError: JSON.stringify(newFetchError, null, 2)
          });
          throw newFetchError;
        }

        console.log('✅ Default plan created successfully');
        setUserPlan(newPlan as SupabaseUserPlan);
      } else {
        console.log('✅ Existing plan found:', existingPlan.plan);
        setUserPlan(existingPlan as SupabaseUserPlan);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch user plan:', {
        message: error?.message || String(error),
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : 'No error object'
      });

      // Set a safe default plan to prevent crashes
      const defaultPlan = {
        id: crypto.randomUUID(),
        user_id: user.id,
        plan: 'free',
        ai_queries_used: 0,
        ai_queries_limit: 3,
        ai_queries_reset_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as SupabaseUserPlan;

      console.log('⚠️ Using fallback default plan');
      setUserPlan(defaultPlan);

      // Only show error toast for non-permission errors
      if (!error.message?.includes('permission') && !error.message?.includes('policy')) {
        toast({
          title: "Plan loading issue",
          description: "Using free plan temporarily. Some features may be limited.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getPlanData = (plan?: SupabaseUserPlan): UserPlanData => {
    if (!plan) {
      return {
        plan: 'free',
        billLimit: 5,
        hasUnlimitedBills: false,
        hasAdvancedAnalytics: false,
        hasEmailReminders: false,
        aiQueriesLimit: 3,
        aiQueriesUsed: 0,
        hasUnlimitedAI: false,
        hasInventory: false,
        hasGSTAutomation: false,
        hasExports: false,
        hasFinancialReports: false,
        isPremium: false,
      };
    }

    const isActive = plan.is_active && (!plan.expires_at || new Date(plan.expires_at) > new Date());
    const isPro = (plan.plan === 'pro' && isActive);
    const isPremium = (plan.plan === 'premium' && isActive);

    return {
      plan: isPremium ? 'premium' : (isPro ? 'pro' : 'free'),
      billLimit: (isPro || isPremium) ? Infinity : 5,
      hasUnlimitedBills: isPro || isPremium,
      hasAdvancedAnalytics: isPro || isPremium,
      hasEmailReminders: isPro || isPremium,
      aiQueriesLimit: plan.ai_queries_limit,
      aiQueriesUsed: plan.ai_queries_used,
      hasUnlimitedAI: isPro || isPremium,
      hasInventory: isPremium,
      hasGSTAutomation: isPremium,
      hasExports: isPremium,
      hasFinancialReports: isPremium,
      isPremium,
    };
  };

  const currentPlanData = getPlanData(userPlan);

  const canAddBill = (currentBillCount: number): boolean => {
    return currentBillCount < currentPlanData.billLimit;
  };

  const canMakeAIQuery = (): boolean => {
    if (!userPlan) return false;
    return currentPlanData.hasUnlimitedAI || currentPlanData.aiQueriesUsed < currentPlanData.aiQueriesLimit;
  };

  const getAIQueriesRemaining = (): number => {
    if (currentPlanData.hasUnlimitedAI) return Infinity;
    return Math.max(0, currentPlanData.aiQueriesLimit - currentPlanData.aiQueriesUsed);
  };

  const trackAIQuery = async () => {
    if (!user || !userPlan || currentPlanData.hasUnlimitedAI) return true;

    if (currentPlanData.aiQueriesUsed >= currentPlanData.aiQueriesLimit) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_plans')
        .update({
          ai_queries_used: currentPlanData.aiQueriesUsed + 1
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setUserPlan(prev => prev ? {
        ...prev,
        ai_queries_used: prev.ai_queries_used + 1
      } : null);

      return true;
    } catch (error: any) {
      console.error('Error tracking AI query:', error);
      return false;
    }
  };

  const upgradeToPro = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_plans')
        .update({
          plan: 'pro',
          ai_queries_limit: 999999,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchUserPlan();
      toast({
        title: "Upgraded to Pro!",
        description: "You now have access to all Pro features",
      });
    } catch (error: any) {
      console.error('Error upgrading to Pro:', error);
      toast({
        title: "Error",
        description: "Failed to upgrade plan",
        variant: "destructive",
      });
    }
  };

  const downgradeToFree = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_plans')
        .update({
          plan: 'free',
          ai_queries_limit: 3,
          ai_queries_used: Math.min(3, currentPlanData.aiQueriesUsed),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchUserPlan();
      toast({
        title: "Downgraded to Free",
        description: "Your account has been downgraded to the free plan",
      });
    } catch (error: any) {
      console.error('Error downgrading to free:', error);
      toast({
        title: "Error",
        description: "Failed to downgrade plan",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserPlan();
    } else {
      setUserPlan(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    ...currentPlanData,
    loading,
    canAddBill,
    canMakeAIQuery,
    getAIQueriesRemaining,
    trackAIQuery,
    upgradeToPro,
    downgradeToFree,
    fetchUserPlan,
  };
};