import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'pro';
  className?: string;
}

export const ProgressBar = ({ 
  value, 
  max, 
  label,
  showPercentage = true,
  variant = 'default',
  className 
}: ProgressBarProps) => {
  const percentage = Math.min((value / max) * 100, 100);
  const isPro = variant === 'pro';

  return (
    <div className={cn("space-y-2", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className={cn(
              "font-semibold tabular-nums",
              isPro ? "pro-gradient-text" : "text-foreground"
            )}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div className={cn(
        "relative h-3 overflow-hidden rounded-full",
        "bg-muted/30 border border-border/30"
      )}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 1,
            ease: [0.25, 0.4, 0.25, 1]
          }}
          className={cn(
            "h-full rounded-full relative overflow-hidden",
            isPro 
              ? "bg-gradient-to-r from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)]"
              : "bg-gradient-to-r from-primary to-accent"
          )}
        >
          {/* Shimmer effect */}
          <motion.div
            animate={{
              x: ['−100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>
        
        {/* Glow effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: percentage > 0 ? 0.6 : 0 }}
          className={cn(
            "absolute inset-0 blur-md -z-10",
            isPro 
              ? "bg-gradient-to-r from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)]"
              : "bg-gradient-to-r from-primary to-accent"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
