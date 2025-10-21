import { useAuth } from './useAuth';
import { useEntitlements } from '@/lib/useEntitlements';

export type UserPlan = 'free' | 'pro';

interface UserPlanData {
  plan: UserPlan;
  billLimit: number;
  hasUnlimitedBills: boolean;
  hasAdvancedAnalytics: boolean;
  hasEmailReminders: boolean;
}

export const useUserPlan = () => {
  const { user } = useAuth();
  const { plan: entitlementPlan } = useEntitlements();
  const userPlan = (entitlementPlan === 'premium' ? 'pro' : entitlementPlan) as UserPlan;

  const getPlanData = (plan: UserPlan): UserPlanData => {
    switch (plan) {
      case 'free':
        return {
          plan: 'free',
          billLimit: 5,
          hasUnlimitedBills: false,
          hasAdvancedAnalytics: false,
          hasEmailReminders: false,
        };
      case 'pro':
        return {
          plan: 'pro',
          billLimit: Infinity,
          hasUnlimitedBills: true,
          hasAdvancedAnalytics: true,
          hasEmailReminders: true,
        };
      default:
        return getPlanData('free');
    }
  };

  const currentPlanData = getPlanData(userPlan);

  const canAddBill = (currentBillCount: number): boolean => {
    return currentBillCount < currentPlanData.billLimit;
  };

  const upgradeToPro = () => {
    // Deprecated: Plan changes now handled via database
    console.warn('upgradeToPro is deprecated. Use payment flow instead.');
  };

  const downgradeToFree = () => {
    // Deprecated: Plan changes now handled via database
    console.warn('downgradeToFree is deprecated. Use payment flow instead.');
  };

  return {
    ...currentPlanData,
    canAddBill,
    upgradeToPro,
    downgradeToFree,
    setUserPlan: () => console.warn('setUserPlan is deprecated')
  };
};