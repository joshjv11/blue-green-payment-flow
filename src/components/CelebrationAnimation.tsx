import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface CelebrationAnimationProps {
  trigger: boolean;
  xpAwarded?: number;
  levelUp?: boolean;
  newLevel?: number;
  badgeName?: string;
  onComplete?: () => void;
}

export const CelebrationAnimation = ({ 
  trigger, 
  xpAwarded = 0,
  levelUp = false,
  newLevel,
  badgeName,
  onComplete 
}: CelebrationAnimationProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShow(true);
      
      // Trigger confetti
      const duration = levelUp ? 3000 : 1500;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: levelUp ? 7 : 3,
          angle: 60,
          spread: levelUp ? 70 : 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#FFC107', '#FFB300', '#FFA000', '#FF6F00'],
        });
        confetti({
          particleCount: levelUp ? 7 : 3,
          angle: 120,
          spread: levelUp ? 70 : 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#FFC107', '#FFB300', '#FFA000', '#FF6F00'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();

      // Hide after animation
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, duration + 500);

      return () => clearTimeout(timer);
    }
  }, [trigger, levelUp, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
        >
          {/* XP Notification */}
          {xpAwarded > 0 && !levelUp && (
            <motion.div
              initial={{ scale: 0, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -100, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              className={cn(
                "px-6 py-4 rounded-2xl glass-strong backdrop-blur-2xl",
                "border border-[hsl(45,100%,60%)]/50 shadow-pro-glow",
                "bg-gradient-to-br from-[hsl(45,100%,60%)]/20 to-[hsl(35,100%,55%)]/10"
              )}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.5,
                  times: [0, 0.5, 1],
                }}
                className="text-center"
              >
                <div className="text-4xl font-black pro-gradient-text mb-1">
                  +{xpAwarded} XP
                </div>
                {badgeName && (
                  <div className="text-sm text-foreground font-semibold">
                    {badgeName}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Level Up Notification */}
          {levelUp && newLevel && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              className="text-center"
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: 2,
                  ease: "easeInOut"
                }}
                className={cn(
                  "px-8 py-6 rounded-3xl glass-strong backdrop-blur-2xl",
                  "border-2 border-[hsl(45,100%,60%)] shadow-pro-strong",
                  "bg-gradient-to-br from-[hsl(45,100%,60%)]/30 to-[hsl(35,100%,55%)]/20"
                )}
              >
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 2,
                    ease: "easeInOut",
                    repeat: 1
                  }}
                  className="text-6xl mb-3"
                >
                  ⭐
                </motion.div>
                <div className="text-3xl font-black pro-gradient-text mb-2">
                  LEVEL UP!
                </div>
                <div className="text-xl font-bold text-foreground">
                  You're now Level {newLevel}
                </div>
                {badgeName && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-3 text-sm text-muted-foreground"
                  >
                    🎉 {badgeName}
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
