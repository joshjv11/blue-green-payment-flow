import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, BarChart3, Bell, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import invoiceFlowLogo from '@/assets/invoiceflow-logo.png';
import { useAuth } from '@/hooks/useAuth';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartFree = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleBookCall = () => {
    window.open('https://cal.com/invoiceflow/setup', '_blank');
  };

  const features = [
    {
      icon: <Bell className="h-6 w-6 text-primary" />,
      title: 'Automated Reminders',
      description: 'Smart, timely follow-ups that get results without being pushy',
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-primary" />,
      title: 'Payment Tracking',
      description: 'Real-time visibility into all your receivables in one place',
    },
    {
      icon: <Zap className="h-6 w-6 text-primary" />,
      title: 'Professional Follow-ups',
      description: 'Polished, personalized messages that maintain client relationships',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src={invoiceFlowLogo} alt="InvoiceFlow" className="h-10 w-auto" />
          </div>
          <div className="flex items-center space-x-4">
            {!user && (
              <Button
                onClick={() => navigate('/auth')}
                variant="ghost"
                className="hidden sm:inline-flex"
              >
                Sign In
              </Button>
            )}
            <Button
              onClick={handleStartFree}
              className="font-medium"
            >
              {user ? 'Dashboard' : 'Start Free'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Get paid faster with{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                one-click smart reminders
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stop chasing payments manually. InvoiceFlow automates your follow-ups so you can focus on growing your business.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleStartFree}
              size="lg"
              className="h-12 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              <Zap className="mr-2 h-5 w-5" />
              Start Free
            </Button>
            <Button
              onClick={handleBookCall}
              size="lg"
              variant="outline"
              className="h-12 px-8 text-lg font-semibold border-2"
            >
              <Phone className="mr-2 h-5 w-5" />
              Book Setup Call ₹199
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Early Access Beta</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Priority Support</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything you need to get paid on time
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for Indian SMBs who are tired of manual follow-ups
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="mb-2">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <Card className="border-2 bg-accent/5">
            <CardHeader>
              <CardDescription className="text-base">
                "Built with input from Indian SMB owners who understand the pain of chasing payments. 
                More testimonials coming soon as we grow our early access community."
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Ready to stop chasing payments?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join early access and get priority support from our team
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleStartFree}
              size="lg"
              className="h-12 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              Get Started Free
            </Button>
            <Button
              onClick={handleBookCall}
              size="lg"
              variant="outline"
              className="h-12 px-8 text-lg font-semibold border-2"
            >
              Book Setup Call ₹199
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <img src={invoiceFlowLogo} alt="InvoiceFlow" className="h-8 w-auto" />
              <span className="text-sm text-muted-foreground">© 2025 InvoiceFlow</span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </a>
              <a
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </a>
              <a
                href="mailto:support@invoiceflow.com"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
