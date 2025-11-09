import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, Shield, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';
import { PageTransition } from '@/components/PageTransition';

const pricingTiers = [
  {
    id: 'autopilot',
    name: 'GST Autopilot',
    price: 299,
    period: 'month',
    description: 'Perfect for small shopkeepers',
    target: 'Turnover ₹20L - ₹5Cr',
    features: [
      'One-Click GSTR-1 & 3B Filing',
      'Smart HSN Code Suggester (AI)',
      'WhatsApp Filing Reminders',
      'Hindi Language Interface',
      'Voice Input for Invoices',
      'Direct GSTN Portal Upload',
    ],
    savings: 'Save ₹5,000-10,000/year in CA fees',
    icon: Zap,
    gradient: 'from-blue-500 to-cyan-500',
    popular: false,
  },
  {
    id: 'itc-genius',
    name: 'ITC Genius',
    price: 699,
    period: 'month',
    description: 'For retailers needing reconciliation',
    target: 'Turnover ₹5Cr - ₹50Cr',
    features: [
      'Real-Time GSTR-2B Auto-Sync',
      'AI-Powered Fuzzy Matching',
      'Visual Mismatch Dashboard',
      'One-Click Dispute Filing',
      'Auto-Follow-up with Suppliers',
      'ITC Claim Maximizer',
      'CA-Level Audit Trail',
      'Export PDF for Auditor',
    ],
    savings: 'Save 10-15 hours/month (worth ₹15,000-20,000)',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-pink-500',
    popular: true,
  },
  {
    id: 'einvoice-pro',
    name: 'E-Invoice Pro',
    price: 1499,
    period: 'month',
    description: 'For businesses with mandatory e-invoicing',
    target: 'Turnover >₹5Cr (Mandatory)',
    features: [
      'Bulk IRN Generation (100+ invoices/day)',
      'Auto-IRN on Invoice Create',
      'Real-Time IRN Status Tracker',
      'E-Way Bill Integration',
      '30-Day Upload Compliance Monitor',
      'GSTN API Error Resolver (AI)',
      'Auto-Retry Failed IRNs',
      'WhatsApp Alerts for IRN Status',
    ],
    savings: 'Zero manual work, no IRN penalties',
    icon: Shield,
    gradient: 'from-amber-500 to-orange-500',
    popular: false,
  },
];

export default function PricingGST() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan } = usePlan();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tierId: string) => {
    if (!user) {
      navigate('/auth?redirect=/pricing/gst');
      return;
    }

    setLoading(tierId);
    try {
      // Navigate to payment page with GST plan
      navigate(`/payment?plan=gst_${tierId}`);
    } catch (error) {
      console.error('Error subscribing:', error);
    } finally {
      setLoading(null);
    }
  };

  const getCurrentPlanBadge = (tierId: string) => {
    const planMap: Record<string, string> = {
      'autopilot': 'gst_autopilot',
      'itc-genius': 'gst_itc_genius',
      'einvoice-pro': 'gst_einvoice_pro',
    };
    
    if (plan === planMap[tierId]) {
      return (
        <Badge className="mb-4 bg-green-500">
          <Check className="w-3 h-3 mr-1" />
          Current Plan
        </Badge>
      );
    }
    return null;
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              GST Compliance Solutions
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
              Choose Your <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">GST Plan</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Save hours every month, avoid penalties, and maximize ITC claims with our AI-powered GST solutions
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
            {pricingTiers.map((tier) => {
              const Icon = tier.icon;
              const isCurrentPlan = getCurrentPlanBadge(tier.id);

              return (
                <Card
                  key={tier.id}
                  className={`relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                    tier.popular ? 'border-2 border-primary shadow-lg' : ''
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 text-xs font-semibold rounded-bl-lg">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      Most Popular
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    {isCurrentPlan}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
                    <CardDescription className="text-base">{tier.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-black">₹{tier.price}</span>
                      <span className="text-muted-foreground">/{tier.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{tier.target}</p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {tier.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm font-semibold text-green-600 mb-4">
                        💰 {tier.savings}
                      </p>
                      <Button
                        onClick={() => handleSubscribe(tier.id)}
                        disabled={loading === tier.id}
                        className={`w-full bg-gradient-to-r ${tier.gradient} text-white hover:opacity-90`}
                        size="lg"
                      >
                        {loading === tier.id ? (
                          'Processing...'
                        ) : isCurrentPlan ? (
                          'Current Plan'
                        ) : (
                          <>
                            Subscribe Now
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Comparison Table */}
          <Card className="mt-12 md:mt-16">
            <CardHeader>
              <CardTitle>Feature Comparison</CardTitle>
              <CardDescription>Compare all GST plans side by side</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Feature</th>
                      <th className="text-center p-4">Autopilot</th>
                      <th className="text-center p-4">ITC Genius</th>
                      <th className="text-center p-4">E-Invoice Pro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: 'GSTR-1 & 3B Filing', autopilot: '✓', itc: '✓', einvoice: '✓' },
                      { feature: 'Direct GSTN Upload', autopilot: '✓', itc: '✓', einvoice: '✓' },
                      { feature: 'ITC Reconciliation', autopilot: '✗', itc: '✓', einvoice: '✓' },
                      { feature: 'AI Fuzzy Matching', autopilot: '✗', itc: '✓', einvoice: '✓' },
                      { feature: 'Bulk IRN Generation', autopilot: '✗', itc: '✗', einvoice: '✓' },
                      { feature: 'Auto-IRN on Create', autopilot: '✗', itc: '✗', einvoice: '✓' },
                      { feature: '30-Day Compliance', autopilot: '✗', itc: '✗', einvoice: '✓' },
                      { feature: 'E-Way Bill Integration', autopilot: '✗', itc: '✗', einvoice: '✓' },
                    ].map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-4 font-medium">{row.feature}</td>
                        <td className="p-4 text-center">{row.autopilot}</td>
                        <td className="p-4 text-center">{row.itc}</td>
                        <td className="p-4 text-center">{row.einvoice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <div className="mt-12 md:mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                {
                  q: 'Can I switch plans later?',
                  a: 'Yes, you can upgrade or downgrade your plan anytime. Changes take effect immediately.',
                },
                {
                  q: 'Do I need all three plans?',
                  a: 'No, choose the plan that matches your business needs. Most businesses only need one plan.',
                },
                {
                  q: 'Is there a free trial?',
                  a: 'Yes! All plans come with a 7-day free trial. No credit card required.',
                },
                {
                  q: 'What happens if I cancel?',
                  a: 'You can cancel anytime. Your access continues until the end of your billing period.',
                },
              ].map((faq, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.q}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-12 md:mt-16 text-center">
            <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-primary/20">
              <CardContent className="pt-8 pb-8">
                <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
                <p className="text-muted-foreground mb-6">
                  Contact our support team for personalized recommendations
                </p>
                <Button size="lg" onClick={() => navigate('/auth')}>
                  Get Started Free
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

