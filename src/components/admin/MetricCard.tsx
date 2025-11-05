import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  status?: 'ok' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({ label, value, status, trend, className }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-950/20';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      case 'ok':
      default:
        return 'border-green-500 bg-green-50 dark:bg-green-950/20';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'ok':
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className={cn("border-l-4", getStatusColor(), className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
          <div className="flex items-center gap-2">
            {status && getStatusIcon()}
            {trend && getTrendIcon()}
          </div>
        </div>
        {status && (
          <Badge
            variant={
              status === 'critical' ? 'destructive' :
              status === 'warning' ? 'secondary' : 'default'
            }
            className="mt-2 text-xs"
          >
            {status === 'critical' ? 'Critical' :
             status === 'warning' ? 'Warning' : 'Healthy'}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

