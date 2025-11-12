import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useSupabasePlan } from './useSupabasePlan';
import { useToast } from './use-toast';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export const usePaymentVerification = () => {
  const { user } = useAuth();
  const { upgradeToPro, fetchUserPlan } = useSupabasePlan();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);

  // Check for real-time payment verification from Supabase
  useEffect(() => {
    if (!user || !isSupabaseConfigured || typeof window === 'undefined') return;
    if (!navigator.onLine) return;

    const checkPaymentStatus = async () => {
      try {
        console.log('💳 Checking payment status for user:', user.email);
        
        const { data: verifiedPayments, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'verified')
          .eq('processed', false);

        if (error) {
          if (error.code === 'PGRST205' || error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
            if (pendingPayments.length > 0) {
              setPendingPayments([]);
            }
            return;
          }
          console.warn('⚠️ Payment verification error:', error);
          return;
        }

        if (verifiedPayments && verifiedPayments.length > 0) {
          console.log('✅ Found verified payments:', verifiedPayments.length);
          
          // Auto-upgrade user to Pro
          await upgradeToPro();
          
          // Mark payments as processed
          const { error: updateError } = await supabase
            .from('payment_transactions')
            .update({ processed: true })
            .in('id', verifiedPayments.map(p => p.id));

          if (updateError) {
            console.error('❌ Error marking payments as processed:', updateError);
          }

          // Show success message and redirect
          toast({
            title: "🎉 Welcome to Pro!",
            description: "Your payment has been verified! All Pro features are now unlocked.",
            duration: 8000,
          });

          // Redirect to dashboard with success state
          setTimeout(() => {
            navigate('/dashboard?welcome=true');
          }, 2000);

          // Refresh plan data
          await fetchUserPlan();
        }

        const { data: pending, error: pendingError } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending');

        if (pendingError) {
          if (pendingError.code === 'PGRST205' || pendingError.code === 'PGRST204' || pendingError.code === '42P01' || pendingError.message?.includes('does not exist')) {
            if (pendingPayments.length > 0) {
              setPendingPayments([]);
            }
            return;
          }
          console.warn('⚠️ Payment verification pending error:', pendingError);
          return;
        }

        setPendingPayments(pending || []);

      } catch (error: any) {
        if (error?.code !== 'PGRST205' && error?.code !== 'PGRST204' && error?.code !== '42P01') {
          console.error('❌ Error checking payment status:', error);
        }
      }
    };

    // Initial check
    checkPaymentStatus();

    // Check every 30 seconds for payment updates
    const interval = setInterval(checkPaymentStatus, 30000);

    return () => clearInterval(interval);
  }, [user, upgradeToPro, fetchUserPlan, toast, navigate]);

  return {
    pendingPayments,
    hasPendingPayments: pendingPayments.length > 0,
  };
};