import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

interface PaymentStatus {
  hasPendingPayments: boolean;
  hasVerifiedPayments: boolean;
  lastPaymentStatus?: string;
  pendingCount: number;
}

export const useRealTimePaymentStatus = () => {
  const { user } = useAuth();
  const welcomeShownRef = useRef(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    hasPendingPayments: false,
    hasVerifiedPayments: false,
    pendingCount: 0,
  });

  useEffect(() => {
    if (!user) return;
    console.warn('Real-time payment status not migrated — returning empty status');
    welcomeShownRef.current = false;
    setPaymentStatus({
      hasPendingPayments: false,
      hasVerifiedPayments: false,
      pendingCount: 0,
    });
  }, [user]);

  return paymentStatus;
};
