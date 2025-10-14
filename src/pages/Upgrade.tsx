import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Rocket, X } from 'lucide-react';
import { usePlanGating } from '@/hooks/usePlanGating';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BackToDashboard } from '@/components/BackToDashboard';

const Upgrade = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { plan, loading, fetchUserPlan } = usePlanGating();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'premium' | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgradeClick = (planType: 'pro' | 'premium') => {
    setSelectedPlan(planType);
    setShowConfirmDialog(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan || !user) return;

    setUpgrading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

      const { error } = await supabase
        .from('user_plans')
        .update({
          plan: selectedPlan,
          is_active: true,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          ai_queries_limit: 999999,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchUserPlan();

      toast({
        title: "Upgrade Successful! 🎉",
        description: `You've been upgraded to ${selectedPlan === 'premium' ? 'Premium' : 'Pro'} plan. Enjoy your new features!`,
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to upgrade your plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
      setShowConfirmDialog(false);
    }
  };

  const freePlanFeatures = [
    'Up to 5 bills',
    'Payment reminders',
    'Basic analytics',
    'Expense tracking',
  ];

  const freePlanMissing = [
    'Limited to 5 bills only',
    'Only 3 AI queries/month',
    'No sales order tracking',
    'No inventory management',
    'No GST/VAT automation',
    'No exports or reports',
  ];

  const proPlanFeatures = [
    'Everything in Free',
    'Unlimited bills',
    'Unlimited AI queries',
    'Bill scheduling',
    'Sales & Purchase Orders',
    'Custom business branding',
    'Partial payment tracking',
    'Advanced analytics',
  ];

  const premiumPlanFeatures = [
    'Everything in Pro',
    '⭐ Full Inventory Management',
    '⭐ GST & VAT Automation',
    '⭐ Tally/CA-Ready Exports',
    '⭐ Financial Reports (P&L, Balance Sheet)',
    '⭐ Cash Flow Statements',
    '⭐ Cash Flow Forecasts',
    '⭐ Tax Compliance Reports',
    '⭐ Priority Support',
    'API Access (Coming Soon)',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <BackToDashboard />
        
        <div className="text-center mb-12 mt-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground">
            Unlock powerful features to grow your business
          </p>
          {plan !== 'free' && (
            <Badge variant="secondary" className="mt-4">
              Current Plan: {plan === 'premium' ? 'Premium' : 'Pro'}
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <Card className="relative border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-8 w-8 text-muted-foreground" />
                {plan === 'free' && (
                  <Badge variant="outline">Current Plan</Badge>
                )}
              </div>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">₹0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {freePlanFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
                {freePlanMissing.map((feature, i) => (
                  <li key={`missing-${i}`} className="flex items-start gap-2 opacity-50">
                    <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant="outline"
                disabled={plan === 'free'}
              >
                {plan === 'free' ? 'Current Plan' : 'Downgrade'}
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-2 border-primary shadow-lg shadow-primary/20 scale-105 hover:scale-110 transition-all">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1">
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Crown className="h-8 w-8 text-primary" />
                {plan === 'pro' && (
                  <Badge variant="default">Current Plan</Badge>
                )}
              </div>
              <CardTitle className="text-2xl">Pro</CardTitle>
              <CardDescription>For growing businesses</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">₹100</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proPlanFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => handleUpgradeClick('pro')}
                disabled={plan === 'pro' || plan === 'premium' || upgrading}
              >
                {plan === 'pro' ? 'Current Plan' : plan === 'premium' ? 'Downgrade to Pro' : 'Upgrade to Pro'}
              </Button>
            </CardFooter>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 border-purple-500/50 hover:border-purple-500 transition-all hover:shadow-xl hover:shadow-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 rounded-lg pointer-events-none" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-2">
                <Rocket className="h-8 w-8 text-purple-500" />
                {plan === 'premium' && (
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">
                    Current Plan
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Premium
              </CardTitle>
              <CardDescription>Complete financial control</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">₹500</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <ul className="space-y-3">
                {premiumPlanFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="relative">
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700"
                onClick={() => handleUpgradeClick('premium')}
                disabled={plan === 'premium' || upgrading}
              >
                {plan === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>All plans include 30-day money-back guarantee</p>
          <p className="mt-2">Need a custom plan? <a href="mailto:support@invoiceflow.com" className="text-primary hover:underline">Contact us</a></p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm Upgrade to {selectedPlan === 'premium' ? 'Premium' : 'Pro'} Plan
            </AlertDialogTitle>
            <AlertDialogDescription>
              You're about to upgrade to the {selectedPlan === 'premium' ? 'Premium' : 'Pro'} plan 
              (₹{selectedPlan === 'premium' ? '500' : '100'}/month). 
              Your plan will be active for 30 days from today.
              <br /><br />
              <strong>Note:</strong> This is a demo upgrade. In production, you would be redirected to a payment gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={upgrading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmUpgrade}
              disabled={upgrading}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              {upgrading ? 'Processing...' : 'Confirm Upgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Upgrade;
