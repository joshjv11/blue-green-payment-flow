import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, TrendingUp, Mail, Infinity, CreditCard } from 'lucide-react';
import UPIPaymentModal from './UPIPaymentModal';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBillCount?: number;
  aiQueriesUsed?: number;
  aiQueriesLimit?: number;
  trigger?: 'bills' | 'ai' | 'general';
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
  open, 
  onOpenChange, 
  currentBillCount = 0,
  aiQueriesUsed = 0,
  aiQueriesLimit = 3,
  trigger = 'general'
}) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = (plan: 'monthly' | 'yearly') => {
    setSelectedPlan(plan);
    setPaymentModalOpen(true);
    onOpenChange(false);
  };

  const freeFeatures = [
    'Up to 5 bills',
    'Only 3 AI queries per month',
    'Basic bill tracking',
    'Due date reminders',
    'Export/Import data'
  ];

  const proFeatures = [
    'Unlimited bills & AI queries',
    'AI financial coach & insights',
    'Advanced analytics & reports',
    'Email & SMS reminders',
    'Team collaboration',
    'Priority support',
    'Bill categorization',
    'Recurring bill automation',
    'Payment history tracking',
    'Smart financial recommendations'
  ];

  const getTriggerMessage = () => {
    switch (trigger) {
      case 'bills':
        return {
          title: "You've reached your bill limit!",
          message: `You have ${currentBillCount} bills (free limit: 5). Upgrade to Pro for unlimited bills and AI coaching.`,
          icon: <Infinity className="h-5 w-5 text-orange-600" />
        };
      case 'ai':
        return {
          title: "AI queries limit reached!",
          message: `You've used ${aiQueriesUsed} of ${aiQueriesLimit} AI queries this month. Upgrade for unlimited AI financial coaching.`,
          icon: <Zap className="h-5 w-5 text-orange-600" />
        };
      default:
        return {
          title: "Unlock Premium Features!",
          message: "Get unlimited bills, AI coaching, and advanced analytics for less than ₹4 per day.",
          icon: <Crown className="h-5 w-5 text-orange-600" />
        };
    }
  };

  const triggerInfo = getTriggerMessage();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Crown className="h-6 w-6 text-yellow-500" />
              Upgrade to Pro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {triggerInfo.icon}
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">{triggerInfo.title}</h3>
              </div>
              <p className="text-orange-700 dark:text-orange-300 text-sm">
                {triggerInfo.message}
              </p>
            </div>

            {/* Value Proposition */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">Smart Investment for Indians</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p>💰 <strong>Save ₹1000s</strong> in late fees with AI reminders</p>
                <p>🎬 <strong>Costs less than 1 movie ticket</strong> per month</p>
                <p>⚡ <strong>Less than ₹4/day</strong> for unlimited AI financial coach</p>
              </div>
            </div>

            {/* Plan Comparison */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Free Plan */}
              <div className="border rounded-lg p-6">
                <div className="text-center mb-4">
                  <h3 className="font-semibold text-lg">Free Plan</h3>
                  <div className="text-2xl font-bold mt-2">₹0</div>
                  <p className="text-sm text-muted-foreground">Forever</p>
                </div>
                
                <ul className="space-y-3">
                  {freeFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro Plans */}
              <div className="space-y-4">
                {/* Monthly Plan */}
                <div className="border border-primary rounded-lg p-6 relative bg-gradient-to-b from-primary/5 to-transparent">
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white">
                    Most Popular
                  </Badge>
                  
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      Pro Monthly
                    </h3>
                    <div className="text-2xl font-bold mt-2">₹99</div>
                    <p className="text-sm text-muted-foreground">per month</p>
                    <p className="text-xs text-primary font-medium">Only ₹3.30 per day</p>
                  </div>
                  
                  <ul className="space-y-2 mb-4">
                    {proFeatures.slice(0, 6).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className={index === 0 ? 'font-semibold' : ''}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={() => handleUpgrade('monthly')}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay ₹99/month via UPI
                  </Button>
                </div>

                {/* Yearly Plan */}
                <div className="border rounded-lg p-6 relative">
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-600 text-white">
                    Best Value
                  </Badge>
                  
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      Pro Yearly
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="text-lg text-muted-foreground line-through">₹1,188</div>
                      <div className="text-2xl font-bold text-green-600">₹999</div>
                    </div>
                    <p className="text-sm text-muted-foreground">per year</p>
                    <div className="flex items-center justify-center gap-1 text-xs text-green-600 font-medium mt-1">
                      <span>Save ₹189</span>
                      <Badge variant="secondary" className="text-xs px-1">2 months FREE</Badge>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-4">
                    {proFeatures.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className={index === 0 ? 'font-semibold' : ''}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={() => handleUpgrade('yearly')}
                    variant="outline" 
                    className="w-full border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/20"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay ₹999/year via UPI
                  </Button>
                </div>
              </div>
            </div>

            {/* Value Propositions */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Infinity className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold text-sm">Unlimited Bills</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Track as many bills as you need without restrictions
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold text-sm">Advanced Analytics</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Deep insights into your spending patterns and trends
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Mail className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold text-sm">Email Reminders</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Never miss a payment with automated email notifications
                </p>
              </div>
            </div>

            {/* Compare Cost */}
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                Smart Financial Decision
              </h4>
              <div className="text-sm text-red-700 dark:text-red-300 space-y-1">
                <p>One late fee: <span className="font-bold">₹500+</span></p>
                <p>Annual Pro plan: <span className="font-bold text-green-600">₹999</span></p>
                <p className="font-semibold">Pro plan pays for itself by preventing just 2 late fees!</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Maybe Later
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                ✓ Instant UPI payments ✓ Manual verification ✓ 24-hour activation
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* UPI Payment Modal */}
      <UPIPaymentModal 
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        plan={selectedPlan}
      />
    </>
  );
};

export default UpgradeModal;