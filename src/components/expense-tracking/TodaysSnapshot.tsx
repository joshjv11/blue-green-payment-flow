import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyBudgetCard } from './DailyBudgetCard';
import { Calendar, TrendingUp, Target } from 'lucide-react';
import { format, startOfWeek, startOfMonth } from 'date-fns';

interface TodaysSnapshotProps {
  dailyBudget: number;
  todaySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  monthlyIncome: number;
  monthlySavingsRate: number;
}

export function TodaysSnapshot({
  dailyBudget,
  todaySpent,
  weeklySpent,
  monthlySpent,
  monthlyIncome,
  monthlySavingsRate,
}: TodaysSnapshotProps) {
  const weekStart = startOfWeek(new Date());
  const monthStart = startOfMonth(new Date());

  return (
    <div className="space-y-4">
      <DailyBudgetCard
        dailyBudget={dailyBudget}
        todaySpent={todaySpent}
        monthlyIncome={monthlyIncome}
        monthlySpent={monthlySpent}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{weeklySpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Since {format(weekStart, 'MMM dd')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{monthlySpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Since {format(monthStart, 'MMM dd')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlySavingsRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {monthlySavingsRate >= 0 ? '+' : ''}{monthlySavingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlySavingsRate >= 0 ? 'On track' : 'Over spending'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
