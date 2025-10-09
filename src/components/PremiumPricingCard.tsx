import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Crown, Sparkles } from 'lucide-react';

interface PremiumPricingCardProps {
  onUpgrade: (plan: 'monthly' | 'yearly') => void;
}

const PremiumPricingCard = ({ onUpgrade }: PremiumPricingCardProps) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const features = [
    'Automated late-payment reminders',
    'Analytics dashboard & insights',
    'Unlimited bills & AI queries',
    'Priority customer support',
    'Email & SMS notifications',
    'Custom branding (coming soon)',
  ];

  const price = billingCycle === 'monthly' ? '₹99' : '₹999';
  const period = billingCycle === 'monthly' ? 'month' : 'year';
  const savings = billingCycle === 'yearly' ? 'Save ₹189 (2 months FREE)' : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={{ 
        y: -6,
        transition: { duration: 0.3 }
      }}
      className="relative w-full max-w-md mx-auto"
    >
      {/* Glassmorphism Card */}
      <div 
        className="relative bg-glass-gradient backdrop-blur-glass rounded-2xl shadow-glass border border-white/50 p-8 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.65), rgba(230, 240, 255, 0.6))',
        }}
      >
        {/* Premium Border Glow */}
        <div className="absolute inset-0 rounded-2xl opacity-50 blur-sm" 
          style={{
            background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(189 94% 43%))',
            padding: '2px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        {/* Best Value Badge */}
        {billingCycle === 'yearly' && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="absolute -top-3 -right-3"
          >
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 text-xs font-bold shadow-lg">
              💰 Best Value
            </Badge>
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 mb-3"
          >
            <Crown className="h-8 w-8 text-yellow-500" />
            <Sparkles className="h-5 w-5 text-cyan-500" />
          </motion.div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Upgrade to Pro
          </h2>
          
          <p className="text-sm text-muted-foreground font-medium">
            Automated reminders, analytics & premium support
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-6 bg-white/60 rounded-full p-1 backdrop-blur-sm">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
              billingCycle === 'monthly'
                ? 'bg-premium-gradient text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
              billingCycle === 'yearly'
                ? 'bg-premium-gradient text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Yearly
          </button>
        </div>

        {/* Price Section */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              {price}
            </span>
            <span className="text-lg text-muted-foreground">/ {period}</span>
          </div>
          {savings && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-green-600 font-semibold mt-2"
            >
              {savings}
            </motion.p>
          )}
        </div>

        {/* Features List */}
        <div className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.1, duration: 0.3 }}
              className="flex items-start gap-3"
            >
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/90">{feature}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={() => onUpgrade(billingCycle)}
            size="lg"
            className="w-full bg-premium-gradient text-white text-lg font-bold shadow-premium-glow hover:shadow-float transition-all duration-300 animate-heartbeat"
          >
            <Crown className="h-5 w-5 mr-2" />
            Upgrade to Pro Now
          </Button>
        </motion.div>

        {/* Trust Badge */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          ✓ Instant UPI payments ✓ 24-hour activation
        </p>
      </div>

      {/* Floating Background Elements */}
      <div className="absolute -z-10 top-0 left-0 w-full h-full">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-indigo-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-cyan-300/20 rounded-full blur-3xl" />
      </div>
    </motion.div>
  );
};

export default PremiumPricingCard;
