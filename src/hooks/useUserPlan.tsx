import { useLocalStorage } from './useLocalStorage';
import { useAuth } from './useAuth';

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
  const [userPlan, setUserPlan] = useLocalStorage<UserPlan>(`user_plan_${user?.id}`, 'free');

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
    setUserPlan('pro');
  };

  const downgradeToFree = () => {
    setUserPlan('free');
  };

  return {
    ...currentPlanData,
    canAddBill,
    upgradeToPro,
    downgradeToFree,
    setUserPlan
  };
};