import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PAYMENT_CONFIG } from '@/config/payment';
import { CheckCircle, AlertCircle, Clock, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';

const PaymentFlowTester = () => {
  const { user } = useAuth();
  const { plan, loading: planLoading } = useSupabasePlan();
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pass' | 'fail' | 'pending';
    message: string;
  }>>([]);

  const runTests = async () => {
    console.log('🧪 Running payment flow tests...');
    const results: typeof testResults = [];

    // Test 1: UPI Configuration
    try {
      const upiTest = PAYMENT_CONFIG.UPI_ID.includes('@');
      results.push({
        test: 'UPI Configuration',
        status: upiTest ? 'pass' : 'fail',
        message: upiTest 
          ? `UPI ID configured: ${PAYMENT_CONFIG.UPI_ID}` 
          : 'UPI ID not properly configured'
      });
    } catch (error) {
      results.push({
        test: 'UPI Configuration',
        status: 'fail',
        message: 'Error checking UPI configuration'
      });
    }

    // Test 2: User Authentication
    results.push({
      test: 'User Authentication',
      status: user ? 'pass' : 'fail',
      message: user 
        ? `Authenticated as: ${user.email}` 
        : 'User not authenticated'
    });

    // Test 3: Plan Management
    results.push({
      test: 'Plan Management',
      status: !planLoading && plan ? 'pass' : 'fail',
      message: !planLoading && plan 
        ? `Current plan: ${plan}` 
        : planLoading ? 'Loading plan data...' : 'Plan data not available'
    });

    // Test 4: Payment Config
    const monthlyPlan = PAYMENT_CONFIG.PLANS.monthly;
    const yearlyPlan = PAYMENT_CONFIG.PLANS.yearly;
    results.push({
      test: 'Payment Plans',
      status: (monthlyPlan.amount > 0 && yearlyPlan.amount > 0) ? 'pass' : 'fail',
      message: `Monthly: ₹${monthlyPlan.amount}, Yearly: ₹${yearlyPlan.amount}`
    });

    setTestResults(results);
    console.log('🧪 Test results:', results);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Flow Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">System Status</h3>
          <Button onClick={runTests} size="sm">
            Run Tests
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span className="font-medium text-sm">{result.test}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Debug Information:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>UPI ID: {PAYMENT_CONFIG.UPI_ID}</div>
                <div>User: {user?.email || 'Not logged in'}</div>
                <div>Plan: {plan || 'Unknown'}</div>
                <div>Monthly Price: ₹{PAYMENT_CONFIG.PLANS.monthly.amount}</div>
                <div>Yearly Price: ₹{PAYMENT_CONFIG.PLANS.yearly.amount}</div>
              </div>
            </div>
          </div>
        )}

        {testResults.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Run Tests" to check payment flow status</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentFlowTester;