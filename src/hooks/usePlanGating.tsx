import { useAppPlan, UserPlan } from './useAppPlan';
import { usePremiumStatus } from './usePremiumStatus';
import { useNavigate } from 'react-router-dom';
import { useToast } from './use-toast';

type FeatureAccess = {
  requiredPlan: UserPlan;
  featureName: string;
};

const FEATURE_ACCESS: Record<string, FeatureAccess> = {
  dashboard: { requiredPlan: 'free', featureName: 'Dashboard' },
  bills: { requiredPlan: 'free', featureName: 'Bills' },
  analytics: { requiredPlan: 'free', featureName: 'Analytics' },
  'whatsapp-reminders': { requiredPlan: 'pro', featureName: 'WhatsApp Bill Reminders' },
  sales: { requiredPlan: 'premium', featureName: 'Sales Orders' },
  purchases: { requiredPlan: 'premium', featureName: 'Purchase Orders' },
  expenses: { requiredPlan: 'premium', featureName: 'Expenses' },
  'gst-summary': { requiredPlan: 'premium', featureName: 'GST/VAT Summary' },
  'reports/tax': { requiredPlan: 'premium', featureName: 'Tax Reports' },
  'reports/financial': { requiredPlan: 'premium', featureName: 'Financial Reports' },
};

export const usePlanGating = () => {
  const planData = useAppPlan();
  const premiumStatus = usePremiumStatus();
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkAccess = (requiredPlan: UserPlan): boolean => {
    const rank = { free: 1, pro: 2, premium: 3 };
    const userRank = rank[premiumStatus.plan];
    const requiredRank = rank[requiredPlan];
    
    if (!premiumStatus.isActive && requiredPlan !== 'free') {
      return false;
    }
    
    return userRank >= requiredRank;
  };

  const hasFeatureAccess = (featureKey: string): boolean => {
    const feature = FEATURE_ACCESS[featureKey];
    if (!feature) return true;
    return checkAccess(feature.requiredPlan);
  };

  const requireFeatureAccess = (featureKey: string): boolean => {
    const feature = FEATURE_ACCESS[featureKey];
    if (!feature) return true;

    const hasAccess = checkAccess(feature.requiredPlan);
    
    if (!hasAccess) {
      const planName = feature.requiredPlan === 'premium' ? 'Premium (₹999/month)' : 'Pro (₹100/month)';
      toast({
        title: "Upgrade Required",
        description: `${feature.featureName} requires ${planName} plan. Redirecting to upgrade page...`,
        variant: "destructive",
      });
      
      setTimeout(() => {
        navigate('/upgrade');
      }, 1500);
    }

    return hasAccess;
  };

  const getRequiredPlan = (featureKey: string): UserPlan | null => {
    return FEATURE_ACCESS[featureKey]?.requiredPlan || null;
  };

  return {
    ...planData,
    ...premiumStatus,
    plan: premiumStatus.plan,
    checkAccess,
    hasFeatureAccess,
    requireFeatureAccess,
    getRequiredPlan,
    FEATURE_ACCESS,
  };
};
