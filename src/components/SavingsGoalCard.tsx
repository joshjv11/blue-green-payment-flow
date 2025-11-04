import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, CheckCircle2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatINRCompact } from '@/utils/currency';

interface SavingsGoal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  goal_type: string;
  target_date: string | null;
  is_completed: boolean;
}

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  onViewAll?: () => void;
}

export function SavingsGoalCard({ goal, onViewAll }: SavingsGoalCardProps) {
  const navigate = useNavigate();
  const progress = (goal.current_amount / goal.target_amount) * 100;
  const remaining = goal.target_amount - goal.current_amount;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {goal.goal_name}
              {goal.is_completed && (
                <Badge variant="default" className="bg-green-600 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Done
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {goal.goal_type.replace('_', ' ')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">
              {formatINRCompact(goal.current_amount)} / {formatINRCompact(goal.target_amount)}
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {formatINRCompact(remaining)} remaining
          </p>
        </div>

        {goal.target_date && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(goal.target_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => navigate('/savings-goals')}
        >
          <TrendingUp className="h-3 w-3 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}

