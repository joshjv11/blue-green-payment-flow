import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Infinity } from 'lucide-react';
import UPIPaymentModal from './UPIPaymentModal';
import PremiumPricingCard from './PremiumPricingCard';

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
        <DialogContent className="max-w-xl mx-4 sm:mx-auto overflow-hidden border-0 bg-transparent shadow-none">
          {/* Context Banner */}
          {trigger !== 'general' && (
            <div className="mb-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                {triggerInfo.icon}
                <h3 className="font-semibold text-orange-800 dark:text-orange-200 text-sm">{triggerInfo.title}</h3>
              </div>
              <p className="text-orange-700 dark:text-orange-300 text-xs">
                {triggerInfo.message}
              </p>
            </div>
          )}

          {/* Premium Pricing Card */}
          <PremiumPricingCard onUpgrade={handleUpgrade} />
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