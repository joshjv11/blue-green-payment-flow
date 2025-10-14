import { useEffect } from 'react';
import { usePlanGating } from '@/hooks/usePlanGating';

interface PlanGateProps {
  featureKey: string;
  children: React.ReactNode;
}

export const PlanGate = ({ featureKey, children }: PlanGateProps) => {
  const { requireFeatureAccess } = usePlanGating();

  useEffect(() => {
    requireFeatureAccess(featureKey);
  }, [featureKey]);

  return <>{children}</>;
};
