import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan } from '@/contexts/PlanContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RequirePlanProps {
  children: React.ReactNode;
  requiredPlan: 'free' | 'pro' | 'premium';
  featureName?: string;
}

export const RequirePlan = ({ 
  children, 
  requiredPlan,
  featureName = 'this feature'
}: RequirePlanProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPlan, loading, plan } = usePlan();

  useEffect(() => {
    if (loading) {
      console.log('⏳ RequirePlan: Still loading, waiting...');
      return;
    }

    console.log('🔒 RequirePlan Check:', {
      requiredPlan,
      featureName,
      userPlan: plan,
      loading
    });

    // Always allow access if plan check fails to prevent white screens
    try {
      const hasAccess = hasPlan(requiredPlan);
      
      console.log('🔑 Access Check Result:', hasAccess);

      if (!hasAccess) {
        const planName = requiredPlan === 'premium' 
          ? 'Premium (₹999/month)' 
          : 'Pro (₹100/month)';
        
        console.log('❌ Access Denied - Redirecting to upgrade');
        
        toast({
          title: "Upgrade Required",
          description: `${featureName} requires ${planName} plan. You have: ${plan || 'free'}`,
          variant: "destructive",
        });

        setTimeout(() => {
          navigate('/upgrade', { replace: true });
        }, 1500);
      } else {
        console.log('✅ Access Granted');
      }
    } catch (error) {
      console.error('[RequirePlan] Error checking plan access:', error);
      // Allow access on error to prevent white screens
    }
  }, [loading, hasPlan, requiredPlan, featureName, navigate, toast, plan]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Always render children if not loading to prevent white screens
  try {
    const hasAccess = hasPlan(requiredPlan);
    if (!hasAccess) {
      return null;
    }
  } catch (error) {
    console.error('[RequirePlan] Error checking access:', error);
    // Render children on error to prevent white screens
  }

  return <>{children}</>;
};
