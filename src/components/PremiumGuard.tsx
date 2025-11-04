import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface PremiumGuardProps {
  children: React.ReactNode;
  requiredPlan?: 'pro' | 'premium';
  featureName?: string;
}

export const PremiumGuard = ({ 
  children, 
  requiredPlan = 'premium',
  featureName = 'this feature'
}: PremiumGuardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium, hasProAccess, loading, isActive } = usePremiumStatus();

  useEffect(() => {
    if (loading) return;

    const hasAccess = requiredPlan === 'premium' ? isPremium : hasProAccess;

    if (!hasAccess || !isActive) {
      const planName = requiredPlan === 'premium' ? 'Premium (₹999/month)' : 'Pro (₹100/month)';
      
      toast({
        title: "Upgrade Required",
        description: `Access to ${featureName} requires ${planName} plan.`,
        variant: "destructive",
      });

      setTimeout(() => {
        navigate('/upgrade', { replace: true });
      }, 1500);
    }
  }, [loading, isPremium, hasProAccess, isActive, requiredPlan, featureName, navigate, toast]);

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

  const hasAccess = requiredPlan === 'premium' ? isPremium : hasProAccess;

  if (!hasAccess || !isActive) {
    return null;
  }

  return <>{children}</>;
};
