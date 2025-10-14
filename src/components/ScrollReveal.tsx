import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface ScrollRevealProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const ScrollReveal = ({ 
  children, 
  direction = 'up', 
  delay = 0,
  className 
}: ScrollRevealProps) => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1, triggerOnce: true });

  const directionOffset = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0, 
        y: directionOffset[direction].y,
        x: directionOffset[direction].x
      }}
      animate={{ 
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : directionOffset[direction].y,
        x: isVisible ? 0 : directionOffset[direction].x
      }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.4, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
