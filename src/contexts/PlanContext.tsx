import React, { createContext, useContext } from 'react';

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
  hasPlan: (required: UserPlan) => boolean;
  planName: UserPlan;
  isActive: boolean;
  isFree: boolean;
  isPro: boolean;
  isPremium: boolean;
}

const HARDCODED_PLAN: PlanContextType = {
  plan: 'pro',
  isAdmin: false,
  loading: false,
  billLimit: Infinity,
  hasUnlimitedBills: true,
  hasAdvancedAnalytics: true,
  hasEmailReminders: true,
  aiQueriesLimit: 1000,
  aiQueriesUsed: 0,
  hasUnlimitedAI: true,
  canAddBill: () => true,
  canMakeAIQuery: () => true,
  getAIQueriesRemaining: () => Infinity,
  trackAIQuery: async () => true,
  refreshPlan: async () => {},
  hasPlan: () => true,
  planName: 'pro',
  isActive: true,
  isFree: false,
  isPro: true,
  isPremium: false,
};

const PlanContext = createContext<PlanContextType>(HARDCODED_PLAN);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PlanContext.Provider value={HARDCODED_PLAN}>
    {children}
  </PlanContext.Provider>
);

export const usePlan = () => useContext(PlanContext);
