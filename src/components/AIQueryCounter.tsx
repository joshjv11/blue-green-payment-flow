import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Crown, Infinity } from 'lucide-react';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';

interface AIQueryCounterProps {
  onUpgrade?: () => void;
  showButton?: boolean;
}

const AIQueryCounter = ({ onUpgrade, showButton = true }: AIQueryCounterProps) => {
  const { plan, aiQueriesUsed, aiQueriesLimit, getAIQueriesRemaining, hasUnlimitedAI } = useSupabasePlan();

  if (hasUnlimitedAI) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200">
          <Infinity className="h-3 w-3 mr-1" />
          Unlimited AI Queries
        </Badge>
        <Crown className="h-4 w-4 text-yellow-500" />
      </div>
    );
  }

  const remaining = getAIQueriesRemaining();
  const usagePercent = (aiQueriesUsed / aiQueriesLimit) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-medium">AI Queries</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono ${remaining === 0 ? 'text-red-600' : remaining <= 1 ? 'text-orange-600' : 'text-muted-foreground'}`}>
            {remaining} left
          </span>
          <Badge 
            variant={remaining === 0 ? "destructive" : remaining <= 1 ? "secondary" : "outline"}
            className="text-xs"
          >
            {aiQueriesUsed}/{aiQueriesLimit}
          </Badge>
        </div>
      </div>

      <Progress 
        value={usagePercent} 
        className={`h-2 ${usagePercent >= 100 ? 'bg-red-100' : usagePercent >= 80 ? 'bg-orange-100' : ''}`}
      />

      {remaining === 0 && showButton && onUpgrade && (
        <div className="pt-2">
          <Button size="sm" onClick={onUpgrade} className="w-full text-xs">
            <Crown className="h-3 w-3 mr-1" />
            Upgrade for Unlimited AI - ₹99/month
          </Button>
        </div>
      )}
      
      {remaining <= 1 && remaining > 0 && (
        <p className="text-xs text-orange-600">
          ⚠️ Only {remaining} AI {remaining === 1 ? 'query' : 'queries'} left this month
        </p>
      )}
    </div>
  );
};

export default AIQueryCounter;