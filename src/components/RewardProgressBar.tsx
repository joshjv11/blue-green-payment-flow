import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Flame, Star, Trophy } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';

interface RewardProgressBarProps {
  currentXP: number;
  currentLevel: number;
  tier: string;
  streak: number;
  isPro?: boolean;
}

const getTierColor = (tier: string) => {
  const colors = {
    bronze: 'from-[hsl(30,50%,45%)] to-[hsl(30,50%,35%)]',
    silver: 'from-[hsl(0,0%,70%)] to-[hsl(0,0%,50%)]',
    gold: 'from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)]',
    platinum: 'from-[hsl(200,50%,70%)] to-[hsl(200,50%,50%)]',
    diamond: 'from-[hsl(180,100%,60%)] to-[hsl(250,95%,68%)]',
  };
  return colors[tier as keyof typeof colors] || colors.bronze;
};

const getTierIcon = (tier: string) => {
  if (tier === 'diamond' || tier === 'platinum') return Trophy;
  if (tier === 'gold') return Star;
  return Flame;
};

export const RewardProgressBar = ({ 
  currentXP, 
  currentLevel, 
  tier,
  streak,
  isPro = false 
}: RewardProgressBarProps) => {
  // Calculate XP for current level and next level
  const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100;
  const nextLevelXP = Math.pow(currentLevel, 2) * 100;
  const xpForNextLevel = nextLevelXP - currentLevelXP;
  const xpProgress = currentXP - currentLevelXP;
  const progressPercentage = (xpProgress / xpForNextLevel) * 100;

  const animatedXP = useCountUp({ end: currentXP, duration: 1500 });
  const animatedLevel = useCountUp({ end: currentLevel, duration: 1000 });
  
  const TierIcon = getTierIcon(tier);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        "p-4 md:p-5 glass-strong backdrop-blur-2xl",
        "shadow-float hover:shadow-premium-glow transition-all duration-500",
        "border-border/50",
        isPro && "glass-pro border-[hsl(45,100%,60%)]/30"
      )}
    >
      {/* Ambient Background Glow */}
      <div className={cn(
        "absolute inset-0 opacity-20 blur-3xl -z-10",
        `bg-gradient-to-br ${getTierColor(tier)}`
      )} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={cn(
                "p-2.5 rounded-xl",
                `bg-gradient-to-br ${getTierColor(tier)}`
              )}
            >
              <TierIcon className="h-5 w-5 text-[hsl(230,35%,7%)]" strokeWidth={2.5} />
            </motion.div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm md:text-base font-bold uppercase tracking-wider",
                  `bg-gradient-to-r ${getTierColor(tier)} bg-clip-text text-transparent`
                )}>
                  {tier} Tier
                </span>
                {streak > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30"
                  >
                    <Flame className="h-3 w-3 text-orange-400" />
                    <span className="text-xs font-bold text-orange-400">{streak}</span>
                  </motion.div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Finance Streak</p>
            </div>
          </div>

          <div className="text-right">
            <div className={cn(
              "text-xl md:text-2xl font-bold tabular-nums",
              isPro && "pro-gradient-text"
            )}>
              Level {animatedLevel}
            </div>
            <p className="text-xs text-muted-foreground">{animatedXP} XP</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentLevelXP} XP</span>
            <span className="font-semibold">{Math.round(progressPercentage)}% to Level {currentLevel + 1}</span>
            <span>{nextLevelXP} XP</span>
          </div>
          
          <div className="relative h-3 overflow-hidden rounded-full bg-muted/30 border border-border/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
              transition={{
                duration: 1.5,
                ease: [0.25, 0.4, 0.25, 1],
                delay: 0.3
              }}
              className={cn(
                "h-full rounded-full relative",
                `bg-gradient-to-r ${getTierColor(tier)}`
              )}
            >
              {/* Shimmer effect */}
              <motion.div
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              />
            </motion.div>
            
            {/* Glow effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className={cn(
                "absolute inset-0 blur-lg -z-10",
                `bg-gradient-to-r ${getTierColor(tier)}`
              )}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Motivational Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs md:text-sm text-center mt-3 text-muted-foreground font-medium"
        >
          {getMotivationalMessage(currentLevel, tier, streak)}
        </motion.p>
      </div>
    </motion.div>
  );
};

const getMotivationalMessage = (level: number, tier: string, streak: number) => {
  if (streak >= 7) return `🔥 ${streak}-day streak! You're unstoppable!`;
  if (tier === 'diamond') return "💎 Elite status achieved – you're in the top 1%!";
  if (tier === 'platinum') return '⭐ Platinum Tier – financial mastery!';
  if (tier === 'gold') return '🏆 Gold Tier unlocked – keep it up!';
  if (tier === 'silver') return "✨ Silver Tier – you're on fire!";
  if (level >= 5) return "🚀 You're among the top 20% of punctual payers!";
  if (streak > 0) return `Keep your ${streak}-day streak alive!`;
  return '💪 Start your journey to financial mastery!';
};
