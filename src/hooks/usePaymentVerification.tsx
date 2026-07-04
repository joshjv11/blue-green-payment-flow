import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useAppPlan } from './useAppPlan';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';

export const usePaymentVerification = () => {
  const { user } = useAuth();
  const { upgradeToPro, fetchUserPlan } = useAppPlan();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pendingPayments, setPendingPayments] = useState<unknown[]>([]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    console.warn('Payment verification not migrated — payment_transactions endpoint unavailable');
    setPendingPayments([]);
  }, [user, upgradeToPro, fetchUserPlan, toast, navigate]);

  return { pendingPayments };
};
