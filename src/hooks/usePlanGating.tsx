import { useSupabasePlan, UserPlan } from './useSupabasePlan';
import { usePremiumStatus } from './usePremiumStatus';
import { useNavigate } from 'react-router-dom';
import { useToast } from './use-toast';

type FeatureAccess = {
  requiredPlan: UserPlan;
  featureName: string;
};

const FEATURE_ACCESS: Record<string, FeatureAccess> = {
  // Free tier - /dashboard, /bills, /analytics
  dashboard: { requiredPlan: 'free', featureName: 'Dashboard' },
  bills: { requiredPlan: 'free', featureName: 'Bills' },
  analytics: { requiredPlan: 'free', featureName: 'Analytics' },
  
  // Pro tier - /savings-goals, /emi-manager, /spending-insights, /whatsapp
  'savings-goals': { requiredPlan: 'pro', featureName: 'Savings Goals' },
  'emi-manager': { requiredPlan: 'pro', featureName: 'EMI & Debt Manager' },
  'spending-insights': { requiredPlan: 'pro', featureName: 'Spending Insights' },
  'whatsapp-reminders': { requiredPlan: 'pro', featureName: 'WhatsApp Bill Reminders' },
  
  // Premium tier - /sales, /purchases, /expenses, /inventory, /gst-summary, /exports, /reports/*, /e-invoice
  sales: { requiredPlan: 'premium', featureName: 'Sales Orders' },
  purchases: { requiredPlan: 'premium', featureName: 'Purchase Orders' },
  expenses: { requiredPlan: 'premium', featureName: 'Expenses' },
  inventory: { requiredPlan: 'premium', featureName: 'Inventory Management' },
  'gst-summary': { requiredPlan: 'premium', featureName: 'GST/VAT Summary' },
  exports: { requiredPlan: 'premium', featureName: 'Exports' },
  'reports/tax': { requiredPlan: 'premium', featureName: 'Tax Reports' },
  'reports/financial': { requiredPlan: 'premium', featureName: 'Financial Reports' },
  'e-invoice': { requiredPlan: 'premium', featureName: 'E-Invoicing (IRN, E-way Bill)' },
  'e-invoice-settings': { requiredPlan: 'premium', featureName: 'E-Invoice Settings' },
  'gstr-filing': { requiredPlan: 'premium', featureName: 'GSTR Filing (GSTR-1, GSTR-3B)' },
};

export const usePlanGating = () => {
  const planData = useSupabasePlan();
  const premiumStatus = usePremiumStatus();
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkAccess = (requiredPlan: UserPlan): boolean => {
    const rank = { free: 1, pro: 2, premium: 3 };
    const userRank = rank[premiumStatus.plan];
    const requiredRank = rank[requiredPlan];
    
    // Check if plan is active
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
