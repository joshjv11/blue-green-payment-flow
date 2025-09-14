import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Crown, Infinity, AlertTriangle } from 'lucide-react';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';

interface BillLimitBannerProps {
  currentCount: number;
  onUpgrade: () => void;
}

const BillLimitBanner = ({ currentCount, onUpgrade }: BillLimitBannerProps) => {
  const { plan, billLimit } = useSupabasePlan();

  if (plan === 'pro') return null;

  const isAtLimit = currentCount >= billLimit;
  const isNearLimit = currentCount >= billLimit - 1;

  if (!isNearLimit && !isAtLimit) return null;

  return (
    <Alert className={`${isAtLimit ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'} mb-6`}>
      <AlertTriangle className={`h-4 w-4 ${isAtLimit ? 'text-red-600' : 'text-orange-600'}`} />
      <AlertDescription className="flex items-center justify-between">
        <div className={`${isAtLimit ? 'text-red-700' : 'text-orange-700'}`}>
          <strong>
            {isAtLimit ? 'Bill limit reached!' : 'Almost at your limit!'}
          </strong>
          <p className="text-sm mt-1">
            {isAtLimit 
              ? `You have ${currentCount}/${billLimit} bills. Upgrade to Pro for unlimited bills.`
              : `You have ${currentCount}/${billLimit} bills. Upgrade to Pro to add more bills.`
            }
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={onUpgrade}
          className="ml-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <Crown className="h-4 w-4 mr-1" />
          Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default BillLimitBanner;