import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { Button, ButtonProps } from '@/components/ui/button';

interface MobileTouchButtonProps extends ButtonProps {
  children: ReactNode;
  hapticType?: 'light' | 'medium' | 'heavy' | 'success';
  glowEffect?: boolean;
}

export const MobileTouchButton = ({ 
  children, 
  hapticType = 'light',
  glowEffect = false,
  onClick,
  className,
  ...props 
}: MobileTouchButtonProps) => {
  const { trigger } = useHapticFeedback();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trigger(hapticType);
    onClick?.(e);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.92 }}
      transition={{ 
        type: "spring",
        stiffness: 400,
        damping: 25
      }}
      className="relative"
    >
      <Button
        onClick={handleClick}
        className={cn(
          // Enhanced mobile touch targets
          "min-h-[48px] px-6",
          "active:scale-[0.92]",
          "transition-all duration-200",
          className
        )}
        {...props}
      >
        {children}
      </Button>
      
      {/* Glow pulse effect */}
      {glowEffect && (
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-xl bg-primary/30 blur-lg -z-10"
        />
      )}
    </motion.div>
  );
};
