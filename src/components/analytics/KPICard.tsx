import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  secondaryValue?: string;
  comparison?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon: LucideIcon;
  tooltip: string;
  sparklineData?: number[];
  status: 'success' | 'warning' | 'error' | 'neutral';
  onClick?: () => void;
  loading?: boolean;
}

export function KPICard({
  label,
  value,
  secondaryValue,
  comparison,
  icon: Icon,
  tooltip,
  sparklineData,
  status,
  onClick,
  loading
}: KPICardProps) {
  const statusColors = {
    success: 'text-green-600 dark:text-green-400 bg-green-500/10',
    warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10',
    error: 'text-red-600 dark:text-red-400 bg-red-500/10',
    neutral: 'text-muted-foreground bg-muted/50'
  };

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus
  };

  const TrendIcon = comparison ? trendIcons[comparison.trend] : Minus;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-4 w-24 bg-muted rounded mb-3" />
          <div className="h-8 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card 
              className={cn(
                "cursor-pointer transition-all duration-300 hover:shadow-lg",
                onClick && "hover:scale-[1.02]"
              )}
              onClick={onClick}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    {label}
                  </div>
                  <div className={cn(
                    "p-2 rounded-xl transition-transform group-hover:scale-110",
                    statusColors[status]
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className={cn(
                    "text-3xl font-bold",
                    status === 'success' && 'text-green-600 dark:text-green-400',
                    status === 'warning' && 'text-yellow-600 dark:text-yellow-400',
                    status === 'error' && 'text-red-600 dark:text-red-400',
                    status === 'neutral' && 'text-foreground'
                  )}>
                    {value}
                  </div>

                  {secondaryValue && (
                    <div className="text-sm text-muted-foreground">
                      {secondaryValue}
                    </div>
                  )}

                  {comparison && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        comparison.trend === 'up' && 'text-green-600 border-green-600 dark:text-green-400 dark:border-green-400',
                        comparison.trend === 'down' && 'text-red-600 border-red-600 dark:text-red-400 dark:border-red-400',
                        comparison.trend === 'neutral' && 'text-muted-foreground border-muted'
                      )}
                    >
                      <TrendIcon className="h-3 w-3 mr-1" />
                      {comparison.value}
                    </Badge>
                  )}
                </div>

                {sparklineData && sparklineData.length > 0 && (
                  <div className="mt-4 h-12 flex items-end gap-1">
                    {sparklineData.map((value, idx) => {
                      const maxValue = Math.max(...sparklineData);
                      const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex-1 rounded-sm transition-all duration-300",
                            status === 'success' && 'bg-green-500/30',
                            status === 'warning' && 'bg-yellow-500/30',
                            status === 'error' && 'bg-red-500/30',
                            status === 'neutral' && 'bg-muted'
                          )}
                          style={{ height: `${height}%` }}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
