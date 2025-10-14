import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Crown, Zap, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { cn } from '@/lib/utils';

interface ShieldShopProps {
  open: boolean;
  onClose: () => void;
  onPurchase: (type: 'basic' | 'premium' | 'insurance') => Promise<void>;
  currentXP: number;
  shieldCounts: {
    basic: number;
    premium: number;
    insurance: number;
  };
}

const shieldTypes = [
  {
    type: 'basic' as const,
    name: 'Basic Shield',
    icon: Shield,
    cost: 50,
    duration: '7 days',
    color: 'from-blue-500 to-cyan-500',
    description: 'One-time streak protection',
    features: ['Saves your streak once', 'Valid for 7 days', 'Stackable'],
  },
  {
    type: 'premium' as const,
    name: 'Premium Shield',
    icon: Sparkles,
    cost: 150,
    duration: '30 days',
    color: 'from-purple-500 to-pink-500',
    description: 'Extended protection period',
    features: ['Saves your streak once', 'Valid for 30 days', 'Priority support', 'Stackable'],
  },
  {
    type: 'insurance' as const,
    name: 'Streak Insurance',
    icon: Crown,
    cost: 500,
    duration: '1 year',
    color: 'from-amber-500 to-orange-500',
    description: 'Ultimate streak protection',
    features: [
      'Saves your streak once',
      'Valid for 1 year',
      'Auto-activates when needed',
      'Extremely rare',
    ],
    rare: true,
  },
];

export const StreakShieldShop = ({
  open,
  onClose,
  onPurchase,
  currentXP,
  shieldCounts,
}: ShieldShopProps) => {
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (type: 'basic' | 'premium' | 'insurance') => {
    setPurchasing(type);
    try {
      await onPurchase(type);
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Streak Protection Shop
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Your XP: <span className="font-bold text-primary">{currentXP}</span>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {shieldTypes.map((shield, index) => {
            const Icon = shield.icon;
            const owned = shieldCounts[shield.type];
            const canAfford = currentXP >= shield.cost;

            return (
              <motion.div
                key={shield.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={cn(
                    'relative overflow-hidden p-6 h-full flex flex-col',
                    'border-2 transition-all duration-300',
                    canAfford
                      ? 'border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/20'
                      : 'border-border opacity-60',
                    shield.rare && 'bg-gradient-to-br from-amber-500/5 to-orange-500/5'
                  )}
                >
                  {shield.rare && (
                    <div className="absolute top-2 right-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-5 h-5 text-amber-500" />
                      </motion.div>
                    </div>
                  )}

                  {/* Icon */}
                  <div
                    className={cn(
                      'w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center',
                      'bg-gradient-to-br',
                      shield.color,
                      'shadow-lg'
                    )}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-center mb-2">{shield.name}</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {shield.description}
                  </p>

                  {/* Features */}
                  <div className="flex-1 space-y-2 mb-4">
                    {shield.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Zap className="w-3 h-3 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Duration */}
                  <div className="text-center mb-4">
                    <p className="text-xs text-muted-foreground">Valid for</p>
                    <p className="text-sm font-bold text-primary">{shield.duration}</p>
                  </div>

                  {/* Owned count */}
                  {owned > 0 && (
                    <div className="text-center mb-3 text-xs text-primary font-bold">
                      You own: {owned}
                    </div>
                  )}

                  {/* Purchase button */}
                  <Button
                    onClick={() => handlePurchase(shield.type)}
                    disabled={!canAfford || purchasing === shield.type}
                    className={cn(
                      'w-full relative overflow-hidden',
                      canAfford && 'bg-gradient-to-r',
                      canAfford && shield.color
                    )}
                  >
                    {purchasing === shield.type ? (
                      'Purchasing...'
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        {shield.cost} XP
                      </>
                    )}
                  </Button>

                  {!canAfford && (
                    <p className="text-xs text-destructive text-center mt-2">
                      Need {shield.cost - currentXP} more XP
                    </p>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Info section */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            How Shields Work
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Shields automatically protect your streak when it's about to break</li>
            <li>Each shield can only be used once</li>
            <li>You can own multiple shields for extra protection</li>
            <li>Insurance shields are rare and provide the longest protection</li>
            <li>Earn shields through activities or purchase with XP</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};
