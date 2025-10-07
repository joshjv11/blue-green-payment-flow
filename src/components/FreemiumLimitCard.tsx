import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Infinity, TrendingUp } from 'lucide-react';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';

interface FreemiumLimitCardProps {
  type: 'bills' | 'ai';
  currentCount: number;
  onUpgrade: () => void;
  className?: string;
}

const FreemiumLimitCard = ({ type, currentCount, onUpgrade, className }: FreemiumLimitCardProps) => {
  const { plan, billLimit, aiQueriesUsed, aiQueriesLimit, getAIQueriesRemaining } = useSupabasePlan();

  if (plan === 'pro') return null;

  const isAtLimit = type === 'bills' ? currentCount >= billLimit : aiQueriesUsed >= aiQueriesLimit;
  const isNearLimit = type === 'bills' ? currentCount >= billLimit - 1 : aiQueriesUsed >= aiQueriesLimit - 1;

  if (!isNearLimit) return null;

  const getContent = () => {
    if (type === 'bills') {
      return {
        title: isAtLimit ? "You've reached your bill limit!" : "Almost at your bill limit!",
        message: isAtLimit 
          ? `You have ${currentCount} bills (free limit: ${billLimit}). Upgrade to Pro for unlimited bills and AI coaching.`
          : `You have ${currentCount} of ${billLimit} bills. Upgrade to Pro for unlimited bills and advanced features.`,
        icon: <Infinity className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />,
        color: "from-orange-50 to-yellow-50 border-orange-200"
      };
    } else {
      const remaining = getAIQueriesRemaining();
      return {
        title: remaining === 0 ? "AI queries limit reached!" : "Almost out of AI queries!",
        message: remaining === 0
          ? `You've used all ${aiQueriesLimit} AI queries this month. Upgrade to Pro for unlimited AI coaching.`
          : `You have ${remaining} AI queries left this month. Upgrade to Pro for unlimited AI financial coach.`,
        icon: <Zap className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />,
        color: "from-blue-50 to-purple-50 border-blue-200"
      };
    }
  };

  const content = getContent();

  return (
    <Card className={`shadow-soft bg-gradient-to-r ${content.color} ${className || ''} animate-fade-in`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          {content.icon}
          <div className="flex-1">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
              {content.title}
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
              {content.message}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                size="sm" 
                onClick={onUpgrade}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro - ₹99/month
              </Button>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Less than ₹4/day for unlimited access
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FreemiumLimitCard;