import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type UserPlan = 'free' | 'pro';

interface UserPlanData {
  plan: UserPlan;
  billLimit: number;
  hasUnlimitedBills: boolean;
  hasAdvancedAnalytics: boolean;
  hasEmailReminders: boolean;
  aiQueriesLimit: number;
  aiQueriesUsed: number;
  hasUnlimitedAI: boolean;
}

interface SupabaseUserPlan {
  id: string;
  user_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  ai_queries_used: number;
  ai_queries_limit: number;
  ai_queries_reset_date: string;
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
      // First try to get existing plan
      const { data: existingPlan, error: fetchError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Error fetching user plan:', fetchError);
        throw fetchError;
      }

      if (!existingPlan) {
        console.log('📊 No existing plan found, creating default plan...');
        // Create default plan using RPC
        const { error: rpcError } = await supabase
          .rpc('create_default_user_plan', { _user_id: user.id });
        
        if (rpcError) {
          console.error('❌ Error creating default plan:', rpcError);
          throw rpcError;
        }

        // Fetch the newly created plan
        const { data: newPlan, error: newFetchError } = await supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (newFetchError) {
          console.error('❌ Error fetching new plan:', newFetchError);
          throw newFetchError;
        }
        
        console.log('✅ Default plan created successfully');
        setUserPlan(newPlan as SupabaseUserPlan);
      } else {
        console.log('✅ Existing plan found:', existingPlan.plan);
        setUserPlan(existingPlan as SupabaseUserPlan);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch user plan:', error);
      
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
      };
    }

    const isPro = plan.plan === 'pro' || plan.plan === 'enterprise';

    return {
      plan: isPro ? 'pro' : 'free',
      billLimit: isPro ? Infinity : 5,
      hasUnlimitedBills: isPro,
      hasAdvancedAnalytics: isPro,
      hasEmailReminders: isPro,
      aiQueriesLimit: plan.ai_queries_limit,
      aiQueriesUsed: plan.ai_queries_used,
      hasUnlimitedAI: isPro,
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
    if (user) {
      fetchUserPlan();
    }
  }, [user]);

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