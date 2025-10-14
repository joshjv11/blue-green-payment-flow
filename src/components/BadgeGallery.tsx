import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface Badge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string | null;
  badge_tier: string | null;
  earned_at: string;
  xp_earned: number | null;
}

interface BadgeGalleryProps {
  badges: Badge[];
  isPro?: boolean;
}

const getTierGradient = (tier: string | null) => {
  const gradients = {
    bronze: 'from-[hsl(30,50%,45%)] to-[hsl(30,50%,35%)]',
    silver: 'from-[hsl(0,0%,70%)] to-[hsl(0,0%,50%)]',
    gold: 'from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)]',
    platinum: 'from-[hsl(200,50%,70%)] to-[hsl(200,50%,50%)]',
    diamond: 'from-[hsl(180,100%,60%)] to-[hsl(250,95%,68%)]',
  };
  return tier ? gradients[tier as keyof typeof gradients] || gradients.bronze : gradients.bronze;
};

export const BadgeGallery = ({ badges, isPro = false }: BadgeGalleryProps) => {
  if (badges.length === 0) {
    return (
      <Card className={cn(
        "p-8 text-center glass border-border/50",
        isPro && "glass-pro border-[hsl(45,100%,60%)]/30"
      )}>
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-muted-foreground">
          No badges earned yet. Complete your first bill payment to start!
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
      <TooltipProvider>
        {badges.map((badge, index) => (
          <Tooltip key={badge.id}>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card className={cn(
                  "relative overflow-hidden p-4 text-center cursor-pointer",
                  "glass border-border/50 shadow-glass hover:shadow-float",
                  "transition-all duration-300",
                  isPro && "glass-pro"
                )}>
                  {/* Tier Glow */}
                  <div className={cn(
                    "absolute inset-0 opacity-10 blur-xl",
                    `bg-gradient-to-br ${getTierGradient(badge.badge_tier)}`
                  )} />
                  
                  {/* Badge Icon */}
                  <motion.div
                    animate={{
                      y: [0, -3, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.2
                    }}
                    className="text-4xl md:text-5xl mb-2 relative z-10"
                  >
                    {badge.badge_icon || '🏅'}
                  </motion.div>
                  
                  {/* Badge Name */}
                  <h4 className={cn(
                    "text-xs md:text-sm font-bold relative z-10",
                    `bg-gradient-to-r ${getTierGradient(badge.badge_tier)} bg-clip-text text-transparent`
                  )}>
                    {badge.badge_name}
                  </h4>
                  
                  {/* XP Badge */}
                  {badge.xp_earned && badge.xp_earned > 0 && (
                    <div className="mt-2 inline-block px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30">
                      <span className="text-[10px] font-bold text-primary">+{badge.xp_earned} XP</span>
                    </div>
                  )}
                </Card>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent className="glass backdrop-blur-xl max-w-xs">
              <div className="space-y-1">
                <p className="font-bold">{badge.badge_name}</p>
                {badge.badge_description && (
                  <p className="text-xs text-muted-foreground">{badge.badge_description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Earned {format(new Date(badge.earned_at), 'MMM d, yyyy')}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};
