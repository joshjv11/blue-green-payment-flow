import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Gift, Zap, Crown, Palette, Star, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

interface DailyBonusWheelProps {
  onClaim: () => Promise<any>;
  onClose: () => void;
  loading?: boolean;
}

const rewardIcons = {
  xp: Zap,
  badge_boost: Star,
  premium_access: Crown,
  theme: Palette,
  collectible: Gift,
};

const rewardColors = {
  xp: 'from-amber-500 to-orange-500',
  badge_boost: 'from-blue-500 to-cyan-500',
  premium_access: 'from-purple-500 to-pink-500',
  theme: 'from-green-500 to-emerald-500',
  collectible: 'from-red-500 to-rose-500',
};

export const DailyBonusWheel = ({ onClaim, onClose, loading }: DailyBonusWheelProps) => {
  const [spinning, setSpinning] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [reward, setReward] = useState<any>(null);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FFC107', '#FF9800', '#FF5722'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FFC107', '#FF9800', '#FF5722'],
      });
    }, 250);
  };

  const handleSpin = async () => {
    setSpinning(true);
    
    setTimeout(async () => {
      const result = await onClaim();
      
      if (result) {
        setReward(result);
        setClaimed(true);
        triggerConfetti();
        
        // Trigger haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100, 50, 200]);
        }
      }
      
      setSpinning(false);
    }, 3000);
  };

  const getRewardTitle = (rewardData: any) => {
    switch (rewardData.reward_type) {
      case 'xp':
        return `${rewardData.reward_value.amount} XP Bonus!`;
      case 'badge_boost':
        return `${rewardData.reward_value.boost_percentage}% Badge Boost!`;
      case 'premium_access':
        return `${rewardData.reward_value.duration_hours / 24} Day Premium Access!`;
      case 'theme':
        return `${rewardData.reward_value.theme_name} Theme Unlocked!`;
      case 'collectible':
        return `${rewardData.reward_value.rarity.toUpperCase()} Collectible!`;
      default:
        return 'Mystery Reward!';
    }
  };

  const getRewardDescription = (rewardData: any) => {
    switch (rewardData.reward_type) {
      case 'xp':
        return 'Instant XP boost to level up faster';
      case 'badge_boost':
        return 'Your next badge progress is boosted';
      case 'premium_access':
        return 'Unlimited AI queries & premium features';
      case 'theme':
        return `Exclusive ${rewardData.reward_value.theme_name} theme for ${rewardData.reward_value.duration_days} days`;
      case 'collectible':
        return 'A rare collectible added to your gallery';
      default:
        return 'Amazing reward claimed!';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <Card className="relative max-w-lg w-full p-8 bg-gradient-to-br from-background via-background/95 to-primary/5 border-primary/20 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-50 animate-pulse" />
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <AnimatePresence mode="wait">
          {!claimed ? (
            <motion.div
              key="wheel"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Mystery box animation */}
              <motion.div
                animate={spinning ? {
                  rotateY: [0, 360],
                  scale: [1, 1.2, 1],
                } : {}}
                transition={{
                  duration: 3,
                  ease: "easeInOut",
                  repeat: spinning ? Infinity : 0,
                }}
                className="relative"
              >
                <div className={cn(
                  "w-32 h-32 rounded-2xl flex items-center justify-center",
                  "bg-gradient-to-br from-primary/20 to-primary/10",
                  "border-2 border-primary/30 shadow-lg",
                  spinning && "shadow-primary/50"
                )}>
                  <Gift className="w-16 h-16 text-primary" />
                  
                  {/* Floating particles */}
                  {spinning && (
                    <>
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 rounded-full bg-primary"
                          animate={{
                            x: [0, Math.cos(i * 45) * 60],
                            y: [0, Math.sin(i * 45) * 60],
                            opacity: [1, 0],
                            scale: [1, 0],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </motion.div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Daily Surprise Bonus
                </h2>
                <p className="text-muted-foreground">
                  {spinning ? 'Opening your reward...' : 'Spin to reveal your mystery reward!'}
                </p>
                <p className="text-sm text-primary font-semibold">
                  🎁 Random XP • Boosts • Premium Access • Themes • Collectibles
                </p>
              </div>

              <Button
                onClick={handleSpin}
                disabled={spinning || loading}
                size="lg"
                className={cn(
                  "relative overflow-hidden group",
                  "bg-gradient-to-r from-primary to-primary/80",
                  "hover:from-primary/90 hover:to-primary/70",
                  "min-h-[44px] min-w-[200px]"
                )}
              >
                <motion.div
                  animate={spinning ? { rotate: 360 } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{ width: '200%', left: '-50%' }}
                />
                <span className="relative z-10 font-bold">
                  {spinning ? 'SPINNING...' : 'CLAIM REWARD'}
                </span>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="reward"
              initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Reward display */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.2, type: "spring" }}
                className={cn(
                  "w-32 h-32 rounded-2xl flex items-center justify-center",
                  "bg-gradient-to-br",
                  rewardColors[reward?.reward_type as keyof typeof rewardColors] || rewardColors.xp,
                  "shadow-2xl shadow-primary/50"
                )}
              >
                {reward && (() => {
                  const Icon = rewardIcons[reward.reward_type as keyof typeof rewardIcons] || Gift;
                  return <Icon className="w-16 h-16 text-white" />;
                })()}
              </motion.div>

              <div className="text-center space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70"
                >
                  {reward && getRewardTitle(reward)}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-muted-foreground"
                >
                  {reward && getRewardDescription(reward)}
                </motion.p>
                {reward?.streak_day > 1 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-sm font-bold text-primary"
                  >
                    🔥 {reward.streak_day} Day Streak!
                  </motion.p>
                )}
              </div>

              <Button
                onClick={onClose}
                size="lg"
                className="min-h-[44px] min-w-[200px]"
              >
                Awesome!
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sparkle effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/40"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};
