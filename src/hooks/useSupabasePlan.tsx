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
    if (!user) return;

    try {
      setLoading(true);
      
      // First try to get existing plan
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setUserPlan(data as SupabaseUserPlan);
        return;
      }

      // If no plan exists or there's an error, try to create one using the security definer function
      if (!data || error) {
        console.log('No user plan found, attempting to create one');
        
        try {
          // Use the security definer function to create the plan
          const { error: functionError } = await supabase.rpc('create_default_user_plan', {
            _user_id: user.id
          });

          if (functionError) {
            console.error('Error calling create_default_user_plan:', functionError);
          }

          // Try to fetch the plan again
          const { data: newData, error: fetchError } = await supabase
            .from('user_plans')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (newData) {
            setUserPlan(newData as SupabaseUserPlan);
          } else {
            console.warn('Could not create or fetch user plan, using defaults');
            setUserPlan(null);
          }
        } catch (createError) {
          console.error('Error creating user plan:', createError);
          setUserPlan(null);
        }
      }
    } catch (error: any) {
      console.error('Error in fetchUserPlan:', error);
      setUserPlan(null);
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