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
  const { hasPlan, loading } = usePlan();

  useEffect(() => {
    if (loading) return;

    const hasAccess = hasPlan(requiredPlan);

    if (!hasAccess) {
      const planName = requiredPlan === 'premium' 
        ? 'Premium (₹500/month)' 
        : 'Pro (₹100/month)';
      
      toast({
        title: "Upgrade Required",
        description: `${featureName} requires ${planName} plan.`,
        variant: "destructive",
      });

      setTimeout(() => {
        navigate('/upgrade', { replace: true });
      }, 1500);
    }
  }, [loading, hasPlan, requiredPlan, featureName, navigate, toast]);

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

  const hasAccess = hasPlan(requiredPlan);

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};
