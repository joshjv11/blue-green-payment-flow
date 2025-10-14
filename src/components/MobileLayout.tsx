import { ReactNode, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
}

export const MobileLayout = ({ children, className }: MobileLayoutProps) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    // Prevent pull-to-refresh on mobile
    document.body.style.overscrollBehavior = 'contain';
    
    // Enhanced touch scrolling
    const handleTouchMove = (e: TouchEvent) => {
      // Allow smooth momentum scrolling
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

  return (
    <>
      {/* Progress indicator - Mobile only */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary z-[100] origin-left md:hidden"
        style={{ scaleX }}
      />
      
      <div className={cn(
        "min-h-screen mobile-scroll-container",
        // Mobile-optimized padding
        "px-3 md:px-4",
        // Smooth momentum scrolling
        "overscroll-contain",
        className
      )}>
        {children}
      </div>
    </>
  );
};
