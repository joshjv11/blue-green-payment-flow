import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Flame, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

interface StreakCountdownBannerProps {
  streak: number;
  timeRemaining: string | null;
  isCritical: boolean;
  isInDanger: boolean;
  shieldCount: number;
  onUseShield: () => void;
  onBuyShield: () => void;
}

export const StreakCountdownBanner = ({
  streak,
  timeRemaining,
  isCritical,
  isInDanger,
  shieldCount,
  onUseShield,
  onBuyShield,
}: StreakCountdownBannerProps) => {
  if (!isInDanger || !timeRemaining) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Card
          className={cn(
            'relative overflow-hidden border-2 p-4',
            isCritical
              ? 'border-destructive bg-destructive/5 shadow-lg shadow-destructive/20'
              : 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/20'
          )}
        >
          {/* Animated background pulse */}
          <motion.div
            className={cn(
              'absolute inset-0 opacity-20',
              isCritical ? 'bg-destructive' : 'bg-amber-500'
            )}
            animate={{
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Melting effect overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {isCritical && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 bg-gradient-to-b from-destructive to-transparent"
                    style={{
                      left: `${10 + i * 12}%`,
                      top: 0,
                      height: '100%',
                    }}
                    animate={{
                      scaleY: [0, 1, 0],
                      opacity: [0, 0.6, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </>
            )}
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <motion.div
                animate={
                  isCritical
                    ? {
                        rotate: [0, -10, 10, -10, 0],
                        scale: [1, 1.1, 1],
                      }
                    : {}
                }
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              >
                {isCritical ? (
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-500" />
                )}
              </motion.div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-5 h-5 text-primary" />
                  <h3
                    className={cn(
                      'font-bold text-lg',
                      isCritical ? 'text-destructive' : 'text-amber-600'
                    )}
                  >
                    {isCritical ? 'CRITICAL: ' : ''}Your {streak}-Day Streak is Melting!
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isCritical ? (
                    <span className="font-bold text-destructive">
                      ⚠️ Expires in {timeRemaining}! Your streak is about to break!
                    </span>
                  ) : (
                    `Time remaining: ${timeRemaining}`
                  )}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>
                    {shieldCount > 0
                      ? `${shieldCount} shield${shieldCount > 1 ? 's' : ''} available`
                      : 'No shields available'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              {shieldCount > 0 ? (
                <Button
                  onClick={onUseShield}
                  size="sm"
                  className={cn(
                    'relative overflow-hidden group flex-1 md:flex-none',
                    'bg-gradient-to-r from-primary to-primary/80',
                    'hover:from-primary/90 hover:to-primary/70',
                    isCritical && 'animate-pulse'
                  )}
                >
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    style={{ width: '200%' }}
                  />
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="relative z-10">USE SHIELD</span>
                </Button>
              ) : (
                <Button
                  onClick={onBuyShield}
                  size="sm"
                  variant="outline"
                  className="flex-1 md:flex-none border-primary/50 hover:bg-primary/10"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Buy Shield
                </Button>
              )}
            </div>
          </div>

          {/* Critical warning bars */}
          {isCritical && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-destructive to-transparent">
              <motion.div
                className="h-full bg-white"
                animate={{ x: ['-100%', '100%'] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{ width: '30%' }}
              />
            </div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
