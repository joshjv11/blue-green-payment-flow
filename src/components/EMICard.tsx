import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, TrendingDown, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatINRCompact } from '@/utils/currency';

interface EMI {
  id: string;
  loan_name: string;
  lender_name: string | null;
  loan_type: string;
  emi_amount: number;
  remaining_tenure_months: number;
  total_tenure_months: number;
  next_due_date: string | null;
  is_active: boolean;
}

interface EMICardProps {
  emi: EMI;
  onViewAll?: () => void;
}

export function EMICard({ emi, onViewAll }: EMICardProps) {
  const navigate = useNavigate();
  const dueDate = emi.next_due_date ? new Date(emi.next_due_date) : null;
  const today = new Date();
  const daysUntilDue = dueDate 
    ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const progress = emi.total_tenure_months > 0
    ? ((emi.total_tenure_months - emi.remaining_tenure_months) / emi.total_tenure_months) * 100
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              {emi.loan_name}
              {!emi.is_active && (
                <Badge variant="secondary" className="text-xs">Completed</Badge>
              )}
              {daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Due Soon
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {emi.loan_type.replace('_', ' ')}
              {emi.lender_name && ` • ${emi.lender_name}`}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">EMI Amount</div>
            <div className="font-semibold">{formatINRCompact(emi.emi_amount)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Progress</div>
            <div className="font-semibold">
              {Math.round(progress)}% ({emi.total_tenure_months - emi.remaining_tenure_months}/{emi.total_tenure_months})
            </div>
          </div>
        </div>

        {dueDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Next Due: {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            {daysUntilDue !== null && daysUntilDue >= 0 && (
              <span className="text-xs">({daysUntilDue}d)</span>
            )}
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => navigate('/emi-manager')}
        >
          <TrendingDown className="h-3 w-3 mr-2" />
          Manage EMI
        </Button>
      </CardContent>
    </Card>
  );
}

