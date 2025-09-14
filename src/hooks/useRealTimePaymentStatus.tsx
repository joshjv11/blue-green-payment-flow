import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
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

        // Handle newly verified payments
        if (verified.length > 0) {
          console.log('🎉 Found newly verified payments:', verified.length);
          
          // Show welcome message
          toast({
            title: "🎉 Payment Verified!",
            description: "Welcome to Pro! All features are now unlocked.",
            duration: 8000,
          });

          // Navigate to dashboard with welcome flag
          setTimeout(() => {
            navigate('/dashboard?welcome=pro');
          }, 2000);
        }

      } catch (error) {
        console.error('❌ Error fetching payment status:', error);
      }
    };

    // Initial fetch
    fetchPaymentStatus();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`payment_status_${user.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'payment_transactions',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('💳 Real-time payment update:', payload);
          fetchPaymentStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, toast, navigate]);

  return paymentStatus;
};