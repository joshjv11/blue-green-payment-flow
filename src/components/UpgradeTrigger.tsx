import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Plus } from 'lucide-react';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import UpgradeModal from './UpgradeModal';

interface UpgradeTriggerProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  trigger?: 'bills' | 'ai' | 'general';
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  disabled?: boolean;
}

const UpgradeTrigger = ({ 
  variant = 'default',
  size = 'default', 
  trigger = 'general',
  children,
  className,
  showIcon = true,
  disabled = false
}: UpgradeTriggerProps) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { plan, aiQueriesUsed, aiQueriesLimit } = useSupabasePlan();

  // Don't show upgrade button for Pro users
  if (plan === 'pro') {
    return null;
  }

  const handleClick = () => {
    setShowUpgradeModal(true);
  };

  const getDefaultText = () => {
    switch (trigger) {
      case 'bills':
        return 'Upgrade for Unlimited Bills';
      case 'ai':
        return 'Upgrade for AI Features';
      default:
        return 'Upgrade to Pro';
    }
  };

  const getIcon = () => {
    switch (trigger) {
      case 'bills':
        return <Plus className="h-4 w-4" />;
      case 'ai':
        return <Zap className="h-4 w-4" />;
      default:
        return <Crown className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
        disabled={disabled}
      >
        {showIcon && getIcon()}
        {children || getDefaultText()}
      </Button>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentBillCount={0} // This will be passed from parent components if needed
        aiQueriesUsed={aiQueriesUsed}
        aiQueriesLimit={aiQueriesLimit}
        trigger={trigger}
      />
    </>
  );
};

export default UpgradeTrigger;