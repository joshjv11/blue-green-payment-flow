// Stubbed for MVP — all plan logic is handled by PlanContext hardcoded values.
export type UserPlan = 'free' | 'pro' | 'premium';

export const useSupabasePlan = () => ({
  plan: 'pro' as UserPlan,
  billLimit: Infinity,
  hasUnlimitedBills: true,
  hasAdvancedAnalytics: true,
  hasEmailReminders: true,
  aiQueriesLimit: 1000,
  aiQueriesUsed: 0,
  hasUnlimitedAI: true,
  hasInventory: true,
  hasGSTAutomation: true,
  hasExports: true,
  hasFinancialReports: true,
  isPremium: false,
  loading: false,
  canAddBill: () => true,
  canMakeAIQuery: () => true,
  getAIQueriesRemaining: () => Infinity,
  trackAIQuery: async () => true,
  upgradeToPro: async () => {},
  downgradeToFree: async () => {},
  fetchUserPlan: async () => {},
});
