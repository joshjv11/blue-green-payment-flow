import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface PaymentTransaction {
  id: string;
  transaction_id: string;
  amount: number;
  plan_type: string;
  status: string;
  created_at: string;
  verified_at?: string;
  processed?: boolean;
}

const PaymentStatusTracker = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchPayments = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setPayments((data || []) as PaymentTransaction[]);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('payment_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'payment_transactions',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('💳 Payment update received:', payload);
          fetchPayments(); // Refresh payments when status changes
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      case 'verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) return null;
  if (payments.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Recent Payment Status</h3>
      <div className="space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
            <div className="flex items-center gap-3">
              {getStatusIcon(payment.status)}
              <div>
                <div className="text-sm font-medium">
                  ₹{payment.amount} - {payment.plan_type.replace('_', ' ').toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Transaction: {payment.transaction_id}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(payment.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            <Badge className={getStatusColor(payment.status)}>
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default PaymentStatusTracker;