import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type UserPlan = 'free' | 'pro' | 'premium';

interface PlanContextType {
  plan: UserPlan;
  isAdmin: boolean;
  loading: boolean;
  billLimit: number;
  hasUnlimitedBills: boolean;
  hasAdvancedAnalytics: boolean;
  hasEmailReminders: boolean;
  aiQueriesLimit: number;
  aiQueriesUsed: number;
  hasUnlimitedAI: boolean;
  canAddBill: (currentCount: number) => boolean;
  canMakeAIQuery: () => boolean;
  getAIQueriesRemaining: () => number;
  trackAIQuery: () => Promise<boolean>;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

// Stale-while-revalidate cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TTL = 30 * 60 * 1000; // 30 minutes - serve stale data if fresh fetch fails
const planCache = new Map<string, CacheEntry>();

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<UserPlan>('free');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiQueriesUsed, setAiQueriesUsed] = useState(0);
  const [aiQueriesLimit, setAiQueriesLimit] = useState(3);
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPlanWithTimeout = useCallback(async (timeoutMs = 10000) => {
    if (!user?.id) return null;

    // Check cache first
    const cacheKey = user.id;
    const cached = planCache.get(cacheKey);
    const now = Date.now();

    // Return fresh cache immediately
    if (cached && now - cached.timestamp < CACHE_TTL) {
      console.log('📊 Using cached plan data');
      return cached.data;
    }

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    );

    try {
      // Try user_plan_view first (optimized view)
      const viewPromise = supabase
        .from('user_plan_view')
        .select('*')
        .maybeSingle();

      let { data, error } = await Promise.race([
        viewPromise,
        timeoutPromise
      ]) as any;

      if (signal.aborted) throw new Error('Request aborted');

      // If view query fails, fallback to direct table query
      if (error || !data) {
        console.warn('⚠️ View query failed, using direct table query');
        const fallbackPromise = supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const fallbackResult = await Promise.race([
          fallbackPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Fallback timeout')), 3000))
        ]) as any;

        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (signal.aborted) throw new Error('Request aborted');
      if (error) throw error;

      // Update cache
      planCache.set(cacheKey, { data, timestamp: now });
      return data;

    } catch (error: any) {
      console.error('❌ Plan fetch error:', error);

      // Serve stale data if available
      if (cached && now - cached.timestamp < STALE_TTL) {
        console.warn('⚠️ Using stale cached data due to fetch error');
        return cached.data;
      }

      // If we have stale data, don't show error toast
      if (!cached) {
        throw error;
      }
      return null;
    }
  }, [user?.id]);

  const refreshPlan = useCallback(async () => {
    if (!user?.id || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);

    try {
      const planData = await fetchPlanWithTimeout();

      if (planData) {
        const userPlan: UserPlan = planData.plan === 'premium' ? 'premium' : planData.plan === 'pro' || planData.plan === 'enterprise' ? 'pro' : 'free';
        setPlan(userPlan);
        setAiQueriesUsed(planData.ai_queries_used || 0);
        setAiQueriesLimit(planData.ai_queries_limit || 3);
        console.log('✅ Plan refreshed:', {
          userPlan,
          rawPlanFromDB: planData.plan,
          isActive: planData.is_active,
          expiresAt: planData.expires_at
        });
      } else {
        // Create default plan if none exists
        const { error } = await supabase.rpc('create_default_user_plan', { _user_id: user.id });
        
        if (!error) {
          // Retry fetch
          const newPlanData = await fetchPlanWithTimeout();
          if (newPlanData) {
            setPlan('free');
            setAiQueriesUsed(0);
            setAiQueriesLimit(3);
          }
        }
      }

      // Check admin status (separate call, non-blocking)
      try {
        const { data: adminData } = await supabase.rpc('is_system_admin', { user_id: user.id });
        setIsAdmin(!!adminData);
      } catch (err) {
        console.warn('⚠️ Admin check failed, assuming non-admin');
        setIsAdmin(false);
      }

    } catch (error: any) {
      console.error('❌ Failed to refresh plan:', error);
      
      // Set safe defaults
      setPlan('free');
      setAiQueriesUsed(0);
      setAiQueriesLimit(3);
      setIsAdmin(false);
      
      // Only show error for non-timeout errors
      if (!error.message?.includes('timeout') && !error.message?.includes('aborted')) {
        toast({
          title: 'Plan loading issue',
          description: 'Using free plan temporarily. Some features may be limited.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id, fetchPlanWithTimeout, toast]);

  useEffect(() => {
    if (user?.id) {
      refreshPlan();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const isPro = plan === 'pro' || plan === 'premium';
  const isPremium = plan === 'premium';

  const canAddBill = useCallback((currentCount: number) => {
    return isPro || currentCount < 5;
  }, [isPro]);

  const canMakeAIQuery = useCallback(() => {
    return isPro || aiQueriesUsed < aiQueriesLimit;
  }, [isPro, aiQueriesUsed, aiQueriesLimit]);

  const getAIQueriesRemaining = useCallback(() => {
    return isPro ? Infinity : Math.max(0, aiQueriesLimit - aiQueriesUsed);
  }, [isPro, aiQueriesLimit, aiQueriesUsed]);

  const trackAIQuery = useCallback(async () => {
    if (!user?.id || isPro) return true;

    if (aiQueriesUsed >= aiQueriesLimit) return false;

    try {
      const { error } = await supabase
        .from('user_plans')
        .update({ ai_queries_used: aiQueriesUsed + 1 })
        .eq('user_id', user.id);

      if (error) throw error;

      setAiQueriesUsed(prev => prev + 1);
      
      // Invalidate cache
      planCache.delete(user.id);
      
      return true;
    } catch (error) {
      console.error('❌ Error tracking AI query:', error);
      return false;
    }
  }, [user?.id, isPro, aiQueriesUsed, aiQueriesLimit]);

  const value: PlanContextType = {
    plan,
    isAdmin,
    loading,
    billLimit: isPro ? Infinity : 5,
    hasUnlimitedBills: isPro,
    hasAdvancedAnalytics: isPro,
    hasEmailReminders: isPro,
    aiQueriesLimit,
    aiQueriesUsed,
    hasUnlimitedAI: isPro,
    canAddBill,
    canMakeAIQuery,
    getAIQueriesRemaining,
    trackAIQuery,
    refreshPlan,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

const rank = { free: 1, pro: 2, premium: 3 };

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within PlanProvider');
  }
  
  // Add hasPlan helper
  const hasPlan = (required: 'free' | 'pro' | 'premium'): boolean => {
    const planName = context.plan || 'free';
    const userRank = rank[planName as keyof typeof rank] || rank.free;
    const requiredRank = rank[required];
    
    console.log('🔐 Plan Check:', {
      userPlan: planName,
      userRank,
      required,
      requiredRank,
      hasAccess: userRank >= requiredRank,
      loading: context.loading
    });
    
    // Free tier is always accessible
    if (required === 'free') return true;
    
    // Check if plan meets rank requirement
    return userRank >= requiredRank;
  };
  
  return {
    ...context,
    hasPlan,
    planName: context.plan || 'free',
    isActive: true, // Plan is always active in current implementation
    isFree: (context.plan || 'free') === 'free',
    isPro: (context.plan || 'free') === 'pro',
    isPremium: (context.plan || 'free') === 'premium',
  };
};
