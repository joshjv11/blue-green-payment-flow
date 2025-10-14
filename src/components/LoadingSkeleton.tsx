import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'stat';
  count?: number;
}

export const LoadingSkeleton = ({ 
  className, 
  variant = 'card',
  count = 1 
}: LoadingSkeletonProps) => {
  const variants = {
    card: "h-32 rounded-2xl",
    text: "h-4 rounded-lg",
    circle: "h-12 w-12 rounded-full",
    stat: "h-24 rounded-xl"
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: i * 0.1,
            duration: 0.3 
          }}
          className={cn(
            "relative overflow-hidden bg-muted/30",
            variants[variant],
            className
          )}
        >
          {/* Shimmer effect */}
          <motion.div
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.2
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
          
          {/* Subtle glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
        </motion.div>
      ))}
    </>
  );
};
