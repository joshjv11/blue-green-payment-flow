import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';

interface PaymentStatus {
  hasPendingPayments: boolean;
  hasVerifiedPayments: boolean;
  lastPaymentStatus?: string;
  pendingCount: number;
}

export const useRealTimePaymentStatus = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const welcomeShownRef = useRef(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    hasPendingPayments: false,
    hasVerifiedPayments: false,
    pendingCount: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchPaymentStatus = async () => {
      try {
        const { data: payments, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const pending = payments?.filter(p => p.status === 'pending') || [];
        const verified = payments?.filter(p => p.status === 'verified' && !p.processed) || [];

        setPaymentStatus({
          hasPendingPayments: pending.length > 0,
          hasVerifiedPayments: verified.length > 0,
          lastPaymentStatus: payments?.[0]?.status || undefined,
          pendingCount: pending.length,
        });

        // Handle newly verified payments — show welcome toast only once per session
        if (verified.length > 0 && !welcomeShownRef.current) {
          welcomeShownRef.current = true;
          console.log('🎉 Found newly verified payments:', verified.length);

          toast({
            title: "🎉 Payment Verified!",
            description: "Welcome to Pro! All features are now unlocked.",
            duration: 8000,
          });

          setTimeout(() => {
            navigate('/dashboard?welcome=pro');
          }, 2000);
        }

      } catch (error: any) {
        // Gracefully handle missing table (PGRST205)
        if (error?.code === 'PGRST205' || error?.message?.includes('does not exist')) {
          // Table doesn't exist - this is expected in some setups
          return;
        }
        // Only log unexpected errors
        console.warn('⚠️ Error fetching payment status:', error);
      }
    };

    // Initial fetch
    fetchPaymentStatus();

    // Poll every 10 seconds for payment status updates
    const interval = setInterval(fetchPaymentStatus, 10_000);
    return () => clearInterval(interval);
  }, [user, toast, navigate]);

  return paymentStatus;
};