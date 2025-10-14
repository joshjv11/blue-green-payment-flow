import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface MotivationalBannerProps {
  message: string;
  icon?: string;
  type?: 'streak' | 'achievement' | 'motivation' | 'warning';
  dismissible?: boolean;
  isPro?: boolean;
}

export const MotivationalBanner = ({ 
  message, 
  icon = '💪',
  type = 'motivation',
  dismissible = true,
  isPro = false 
}: MotivationalBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  const typeStyles = {
    streak: 'from-orange-500/20 to-red-500/10 border-orange-500/30',
    achievement: 'from-[hsl(45,100%,60%)]/20 to-[hsl(35,100%,55%)]/10 border-[hsl(45,100%,60%)]/30',
    motivation: 'from-primary/20 to-accent/10 border-primary/30',
    warning: 'from-yellow-500/20 to-orange-500/10 border-yellow-500/30',
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        className={cn(
          "relative overflow-hidden rounded-2xl p-4",
          "glass-strong backdrop-blur-xl border",
          `bg-gradient-to-r ${typeStyles[type]}`,
          "shadow-glass",
          isPro && "glass-pro"
        )}
      >
        {/* Animated background pulse */}
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 blur-xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-2xl md:text-3xl"
          >
            {icon}
          </motion.div>
          
          <p className="flex-1 text-sm md:text-base font-semibold text-foreground">
            {message}
          </p>

          {dismissible && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDismissed(true)}
              className="h-8 w-8 rounded-lg hover:bg-background/50"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
