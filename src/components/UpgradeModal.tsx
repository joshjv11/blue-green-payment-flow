import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, TrendingUp, Mail, Infinity } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBillCount: number;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ open, onOpenChange, currentBillCount }) => {
  const handleUpgrade = () => {
    // Placeholder for actual upgrade flow
    alert('Upgrade functionality will be implemented here. This will redirect to a payment page.');
    onOpenChange(false);
  };

  const freeFeatures = [
    'Up to 5 bills',
    'Basic bill tracking',
    'Due date reminders',
    'Export/Import data'
  ];

  const proFeatures = [
    'Unlimited bills',
    'Advanced analytics & insights',
    'Email reminders (coming soon)',
    'Priority support',
    'Bill categorization',
    'Recurring bill automation',
    'Payment history tracking',
    'Financial health scoring'
  ];

  return (
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
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-orange-800">You've reached your limit!</h3>
            </div>
            <p className="text-orange-700 text-sm">
              You have {currentBillCount} bills (free limit: 5). Upgrade to Pro for unlimited bills and advanced features.
            </p>
          </div>

          {/* Plan Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Free Plan */}
            <div className="border rounded-lg p-6">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg">Free Plan</h3>
                <div className="text-2xl font-bold mt-2">$0</div>
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

            {/* Pro Plan */}
            <div className="border border-primary rounded-lg p-6 relative bg-gradient-to-b from-primary/5 to-transparent">
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                Recommended
              </Badge>
              
              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Pro Plan
                </h3>
                <div className="text-2xl font-bold mt-2">$9.99</div>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
              
              <ul className="space-y-3">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span className={index === 0 ? 'font-semibold' : ''}>{feature}</span>
                  </li>
                ))}
              </ul>
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              size="lg"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro - $9.99/month
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="sm:w-auto"
            >
              Maybe Later
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              ✓ Cancel anytime ✓ 30-day money-back guarantee ✓ Instant access
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;