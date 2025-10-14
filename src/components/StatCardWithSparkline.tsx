import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface StatCardWithSparklineProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  sparklineData?: { value: number }[];
  iconColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  isPro?: boolean;
}

export const StatCardWithSparkline = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  sparklineData = [],
  iconColor = 'text-primary',
  gradientFrom = 'from-primary/10',
  gradientTo = 'to-primary/5',
  isPro = false,
}: StatCardWithSparklineProps) => {
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-float",
      isPro 
        ? "glass-pro border-[hsl(45,100%,60%)]/30 shadow-pro-strong hover:shadow-pro-glow" 
        : "glass border-border/50 shadow-glass"
    )}>
      {/* Gradient Background Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity duration-500",
        isPro 
          ? "from-[hsl(45,100%,60%)]/10 to-[hsl(35,100%,55%)]/5"
          : `${gradientFrom} ${gradientTo}`
      )} />
      
      <CardContent className="relative p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide">
              {title}
            </p>
            <div className={cn(
              "text-2xl md:text-3xl font-bold tracking-tight transition-colors duration-300",
              isPro ? "pro-gradient-text" : "text-foreground"
            )}>
              {value}
            </div>
            {trendValue && (
              <div className={cn(
                "text-xs font-medium flex items-center gap-1",
                trend === 'up' && "text-green-500",
                trend === 'down' && "text-red-500",
                trend === 'neutral' && "text-muted-foreground"
              )}>
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trendValue}
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
            isPro 
              ? "bg-gradient-to-br from-[hsl(45,100%,60%)]/20 to-[hsl(35,100%,55%)]/10"
              : "bg-primary/10"
          )}>
            <Icon className={cn(
              "h-5 w-5 md:h-6 md:w-6 transition-colors duration-300",
              isPro ? "text-[hsl(45,100%,60%)]" : iconColor
            )} />
          </div>
        </div>
        
        {/* Sparkline */}
        {sparklineData.length > 0 && (
          <div className="h-12 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={isPro ? "hsl(45, 100%, 60%)" : "hsl(250, 95%, 68%)"} 
                  strokeWidth={2}
                  dot={false}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
