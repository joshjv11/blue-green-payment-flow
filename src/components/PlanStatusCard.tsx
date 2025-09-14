import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Users, TrendingUp } from 'lucide-react';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';

interface PlanStatusCardProps {
  onUpgrade?: () => void;
  compact?: boolean;
}

const PlanStatusCard = ({ onUpgrade, compact = false }: PlanStatusCardProps) => {
  const { plan, loading, aiQueriesUsed, aiQueriesLimit, hasUnlimitedAI } = useSupabasePlan();

  if (loading) {
    return (
      <Card className="border-muted/40">
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPro = plan === 'pro';

  if (compact) {
    return (
      <Card className={`border ${isPro ? 'border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10' : 'border-muted/40'}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPro ? (
                <Crown className="h-4 w-4 text-primary" />
              ) : (
                <Zap className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Badge variant={isPro ? "default" : "secondary"} className="text-xs">
                  {isPro ? 'Pro Plan' : 'Free Plan'}
                </Badge>
                {!isPro && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {aiQueriesUsed}/{aiQueriesLimit} AI queries used
                  </p>
                )}
              </div>
            </div>
            {!isPro && onUpgrade && (
              <Button size="sm" onClick={onUpgrade} className="h-7 text-xs">
                Upgrade
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border ${isPro ? 'border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10' : 'border-muted/40'}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {isPro ? (
                <div className="p-2 bg-primary/10 rounded-full">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <div className="p-2 bg-muted/50 rounded-full">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg">
                  {isPro ? 'Pro Plan' : 'Free Plan'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isPro 
                    ? 'All features unlocked'
                    : 'Limited features - upgrade for full access'
                  }
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span>{isPro ? 'Unlimited' : '5'} bills</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>
                  {hasUnlimitedAI ? 'Unlimited' : `${aiQueriesUsed}/${aiQueriesLimit}`} AI queries
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{isPro ? 'Team' : 'Personal'} features</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-muted-foreground" />
                <span>{isPro ? 'Advanced' : 'Basic'} analytics</span>
              </div>
            </div>
          </div>

          {!isPro && onUpgrade && (
            <div className="text-center">
              <Button onClick={onUpgrade} className="mb-2">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
              <p className="text-xs text-muted-foreground">
                ₹99/month
              </p>
            </div>
          )}
        </div>

        {isPro && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Crown className="h-4 w-4" />
              <span className="font-medium">Pro benefits active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unlimited bills, AI coaching, advanced analytics, and priority support
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlanStatusCard;