import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface DailyBudgetCardProps {
  dailyBudget: number;
  todaySpent: number;
  monthlyIncome: number;
  monthlySpent: number;
}

export function DailyBudgetCard({
  dailyBudget,
  todaySpent,
  monthlyIncome,
  monthlySpent,
}: DailyBudgetCardProps) {
  const remaining = Math.max(0, dailyBudget - todaySpent);
  const percentage = dailyBudget > 0 ? (todaySpent / dailyBudget) * 100 : 0;
  const monthlySavingsRate = monthlyIncome > 0 
    ? ((monthlyIncome - monthlySpent) / monthlyIncome) * 100 
    : 0;

  const getStatus = () => {
    if (percentage <= 80) return { color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20', message: "You're on track!", icon: TrendingUp };
    if (percentage <= 100) return { color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20', message: 'Slow down', icon: AlertCircle };
    return { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', message: 'Over budget!', icon: TrendingDown };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={`border-2 ${status.bg} ${percentage > 100 ? 'border-red-500' : percentage > 80 ? 'border-yellow-500' : 'border-green-500'}`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Today's Budget</h3>
            </div>
            <Badge variant={percentage > 100 ? 'destructive' : percentage > 80 ? 'secondary' : 'default'}>
              {format(new Date(), 'MMM dd')}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold">
                ₹{todaySpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-lg text-muted-foreground">
                / ₹{dailyBudget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            
            <Progress 
              value={Math.min(percentage, 100)} 
              className={`h-3 ${percentage > 100 ? 'bg-red-200 dark:bg-red-900' : percentage > 80 ? 'bg-yellow-200 dark:bg-yellow-900' : 'bg-green-200 dark:bg-green-900'}`}
            />
            
            <div className="flex items-center justify-between text-sm">
              <span className={`font-medium ${status.color} flex items-center gap-1`}>
                <StatusIcon className="h-4 w-4" />
                {status.message}
              </span>
              {remaining > 0 ? (
                <span className="text-muted-foreground">
                  ₹{remaining.toLocaleString('en-IN')} left today
                </span>
              ) : (
                <span className="text-red-600 font-medium">
                  ₹{Math.abs(remaining).toLocaleString('en-IN')} over budget
                </span>
              )}
            </div>
          </div>

          {/* Monthly Savings Rate */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monthly Savings Rate</span>
              <span className={`font-semibold ${monthlySavingsRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {monthlySavingsRate >= 0 ? '+' : ''}{monthlySavingsRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

