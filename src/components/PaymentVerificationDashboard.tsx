import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, Search, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PaymentTransaction {
  id: string;
  user_id: string;
  user_email: string;
  user_phone?: string;
  upi_id?: string;
  transaction_id: string;
  amount: number;
  plan_type: string;
  status: 'pending' | 'verified' | 'rejected';
  payment_date: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
}

const PaymentVerificationDashboard = () => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const mockTransactions: PaymentTransaction[] = [
    {
      id: '1',
      user_id: 'user1',
      user_email: 'user@example.com',
      user_phone: '+91 9876543210',
      upi_id: 'user@paytm',
      transaction_id: '123456789012',
      amount: 99,
      plan_type: 'pro_monthly',
      status: 'pending',
      payment_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
  ];

  useEffect(() => {
    // Simulate loading and use mock data for now
    setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 1000);
  }, []);

  const handleVerification = async (transactionId: string, status: 'verified' | 'rejected') => {
    // Mock verification - in production this would update Supabase
    setTransactions(prev => 
      prev.map(t => 
        t.id === transactionId 
          ? { ...t, status, verified_at: new Date().toISOString() }
          : t
      )
    );

    toast({
      title: status === 'verified' ? "Payment Verified" : "Payment Rejected",
      description: `Transaction ${status} successfully`,
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transaction_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payment Verification</h2>
        <Button variant="outline">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="search">Search Transactions</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Email or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="status">Filter by Status</Label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(transaction.status)}>
                      {transaction.status === 'pending' && <Clock className="h-4 w-4 mr-1" />}
                      {transaction.status === 'verified' && <CheckCircle className="h-4 w-4 mr-1" />}
                      {transaction.status === 'rejected' && <XCircle className="h-4 w-4 mr-1" />}
                      {transaction.status}
                    </Badge>
                    <Badge variant="outline">₹{transaction.amount}</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Email:</span> {transaction.user_email}</div>
                    <div><span className="font-medium">Transaction ID:</span> {transaction.transaction_id}</div>
                    <div><span className="font-medium">Created:</span> {format(new Date(transaction.created_at), 'MMM dd, yyyy')}</div>
                  </div>
                </div>

                {transaction.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleVerification(transaction.id, 'verified')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleVerification(transaction.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PaymentVerificationDashboard;