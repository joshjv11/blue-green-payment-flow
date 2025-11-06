import { Shield, Lock, Award, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface TrustBadge {
  icon: React.ElementType;
  label: string;
  description?: string;
  verified?: boolean;
}

const badges: TrustBadge[] = [
  {
    icon: Shield,
    label: '256-bit Encryption',
    description: 'Bank-level security',
    verified: true,
  },
  {
    icon: Award,
    label: 'GSTN Approved Partner',
    description: 'Official integration',
    verified: true,
  },
  {
    icon: Lock,
    label: 'ISO 27001 Certified',
    description: 'Data security standards',
    verified: true,
  },
  {
    icon: CheckCircle2,
    label: '10,000+ Users',
    description: 'Trusted by businesses',
    verified: true,
  },
];

interface TrustBadgesProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export function TrustBadges({ className, variant = 'full' }: TrustBadgesProps) {
  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Badge
                variant="outline"
                className="glass-card border-success/30 text-success bg-success/5 px-3 py-1.5"
              >
                <Icon className="h-3 w-3 mr-1.5" />
                {badge.label}
              </Badge>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {badges.map((badge, index) => {
        const Icon = badge.icon;
        return (
          <motion.div
            key={badge.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="glass-card border-success/20 hover:border-success/40 transition-colors">
              <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 rounded-full bg-success/10">
                    <Icon className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{badge.label}</div>
                    {badge.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {badge.description}
                      </div>
                    )}
                  </div>
                  {badge.verified && (
                    <Badge variant="outline" className="text-xs border-success/30 text-success bg-success/5">
                      Verified
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

