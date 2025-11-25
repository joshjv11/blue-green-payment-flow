import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Trophy, Star, Flame, Award, Gem } from 'lucide-react';

interface TierBadgeProps {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  level: number;
  variant?: 'compact' | 'full' | 'icon-only';
  showLevel?: boolean;
  className?: string;
}

const tierConfig = {
  bronze: {
    icon: Flame,
    gradient: 'from-[hsl(30,50%,45%)] to-[hsl(30,50%,35%)]',
    color: 'text-[hsl(30,50%,45%)]',
    label: 'Bronze',
    glow: '0 0 20px hsl(30 50% 45% / 0.3)',
  },
  silver: {
    icon: Award,
    gradient: 'from-[hsl(0,0%,70%)] to-[hsl(0,0%,50%)]',
    color: 'text-[hsl(0,0%,70%)]',
    label: 'Silver',
    glow: '0 0 20px hsl(0 0% 70% / 0.3)',
  },
  gold: {
    icon: Star,
    gradient: 'from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)]',
    color: 'text-[hsl(45,100%,60%)]',
    label: 'Gold',
    glow: '0 0 20px hsl(45 100% 60% / 0.4)',
  },
  platinum: {
    icon: Trophy,
    gradient: 'from-[hsl(200,50%,70%)] to-[hsl(200,50%,50%)]',
    color: 'text-[hsl(200,50%,70%)]',
    label: 'Platinum',
    glow: '0 0 20px hsl(200 50% 70% / 0.4)',
  },
  diamond: {
    icon: Gem,
    gradient: 'from-[hsl(180,100%,60%)] to-[hsl(250,95%,68%)]',
    color: 'text-[hsl(180,100%,60%)]',
    label: 'Diamond',
    glow: '0 0 25px hsl(180 100% 60% / 0.5)',
  },
};

export const TierBadge = ({ 
  tier, 
  level,
  variant = 'compact', 
  showLevel = true,
  className 
}: TierBadgeProps) => {
  // Defensive: Ensure tier is valid, fallback to bronze
  const validTier = (tier && tierConfig[tier]) ? tier : 'bronze';
  const config = tierConfig[validTier];
  const Icon = config.icon;

  if (variant === 'icon-only') {
    return (
      <motion.div
        whileHover={{ scale: 1.1, rotate: 10 }}
        className={cn(
          "inline-flex items-center justify-center h-6 w-6 rounded-full",
          `bg-gradient-to-br ${config.gradient}`,
          className
        )}
        style={{ boxShadow: config.glow }}
      >
        <Icon className="h-3.5 w-3.5 text-[hsl(230,35%,7%)]" strokeWidth={2.5} />
      </motion.div>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          `bg-gradient-to-r ${config.gradient}`,
          "text-[hsl(230,35%,7%)] font-bold text-xs",
          "shadow-pro-glow",
          className
        )}
        style={{ boxShadow: config.glow }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
        <span>{config.label}</span>
        {showLevel && <span className="opacity-80">L{level}</span>}
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-xl",
        `bg-gradient-to-r ${config.gradient}`,
        "text-[hsl(230,35%,7%)] font-bold",
        "shadow-pro-glow relative overflow-hidden",
        className
      )}
      style={{ boxShadow: config.glow }}
    >
      {/* Shimmer effect */}
      <motion.div
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      
      <Icon className="h-5 w-5 relative z-10" strokeWidth={2.5} />
      <div className="relative z-10">
        <div className="text-sm font-black">{config.label} Tier</div>
        {showLevel && (
          <div className="text-xs opacity-90">Level {level}</div>
        )}
      </div>
    </motion.div>
  );
};
