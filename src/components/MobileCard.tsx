import { ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useScrollParallax } from '@/hooks/useScrollParallax';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  isPro?: boolean;
  index?: number;
  enableParallax?: boolean;
}

export const MobileCard = ({ 
  children, 
  className, 
  isPro = false,
  index = 0,
  enableParallax = false
}: MobileCardProps) => {
  const { ref, offset } = useScrollParallax({ speed: 0.1 });

  return (
    <motion.div
      ref={enableParallax ? ref : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.25, 0.4, 0.25, 1]
      }}
      style={enableParallax ? {
        y: offset,
      } : {}}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative rounded-2xl border border-border/50 glass backdrop-blur-xl",
        "transition-all duration-500",
        "active:scale-[0.98]",
        // Mobile-optimized spacing
        "p-5 md:p-6",
        "shadow-glass hover:shadow-float",
        isPro && "glass-pro border-[hsl(45,100%,60%)]/30 shadow-pro-strong",
        className
      )}
    >
      {children}
      
      {/* Ambient depth glow */}
      <div 
        className={cn(
          "absolute -inset-1 rounded-2xl blur-xl -z-10 opacity-0 transition-opacity duration-500",
          "group-hover:opacity-50",
          isPro 
            ? "bg-gradient-to-br from-[hsl(45,100%,60%)]/20 to-[hsl(35,100%,55%)]/10"
            : "bg-gradient-to-br from-primary/20 to-accent/10"
        )}
      />
    </motion.div>
  );
};
