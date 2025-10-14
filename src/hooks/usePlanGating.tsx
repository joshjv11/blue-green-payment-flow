import { useSupabasePlan, UserPlan } from './useSupabasePlan';
import { useNavigate } from 'react-router-dom';
import { useToast } from './use-toast';

type FeatureAccess = {
  requiredPlan: UserPlan;
  featureName: string;
};

const FEATURE_ACCESS: Record<string, FeatureAccess> = {
  // Free tier - /dashboard, /bills, /analytics, /expenses
  dashboard: { requiredPlan: 'free', featureName: 'Dashboard' },
  bills: { requiredPlan: 'free', featureName: 'Bills' },
  analytics: { requiredPlan: 'free', featureName: 'Analytics' },
  expenses: { requiredPlan: 'free', featureName: 'Expenses' },
  
  // Pro tier - /sales, /purchases
  sales: { requiredPlan: 'pro', featureName: 'Sales Orders' },
  purchases: { requiredPlan: 'pro', featureName: 'Purchase Orders' },
  
  // Premium tier - /inventory, /gst-summary, /exports, /reports/*
  inventory: { requiredPlan: 'premium', featureName: 'Inventory Management' },
  'gst-summary': { requiredPlan: 'premium', featureName: 'GST/VAT Summary' },
  exports: { requiredPlan: 'premium', featureName: 'Exports' },
  'reports/tax': { requiredPlan: 'premium', featureName: 'Tax Reports' },
  'reports/financial': { requiredPlan: 'premium', featureName: 'Financial Reports' },
};

export const usePlanGating = () => {
  const planData = useSupabasePlan();
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkAccess = (requiredPlan: UserPlan): boolean => {
    const rank = { free: 1, pro: 2, premium: 3 };
    const userRank = rank[planData.plan];
    const requiredRank = rank[requiredPlan];
    return userRank >= requiredRank;
  };

  const hasFeatureAccess = (featureKey: string): boolean => {
    const feature = FEATURE_ACCESS[featureKey];
    if (!feature) return true; // Unknown features are accessible by default
    return checkAccess(feature.requiredPlan);
  };

  const requireFeatureAccess = (featureKey: string): boolean => {
    const feature = FEATURE_ACCESS[featureKey];
    if (!feature) return true;

    const hasAccess = checkAccess(feature.requiredPlan);
    
    if (!hasAccess) {
      const planName = feature.requiredPlan === 'premium' ? 'Premium' : 'Pro';
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
    checkAccess,
    hasFeatureAccess,
    requireFeatureAccess,
    getRequiredPlan,
    FEATURE_ACCESS,
  };
};
