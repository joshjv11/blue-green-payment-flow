import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import invoiceFlowLogo from '@/assets/invoiceflow-logo.png';
import heroDashboard from '@/assets/hero-dashboard.jpg';
import { useAuth } from '@/hooks/useAuth';
import { Mail, MessageSquare, BarChart3, Briefcase, Shield, FileText, Bell, CheckCircle, TrendingUp, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(199,89%,48%)] via-[hsl(199,89%,68%)] to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src={invoiceFlowLogo} alt="InvoiceFlow" className="h-10 w-auto" />
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <Button
                onClick={() => navigate('/dashboard')}
                className="font-semibold"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/auth')}
                  variant="ghost"
                  className="hidden sm:inline-flex font-medium"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/auth')}
                  className="font-semibold"
                >
                  Start Free
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Split Layout */}
      <section className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text + CTA */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight text-reflect">
                Get Paid Faster with Automated Invoice Tracking
              </h1>
              <p className="text-lg md:text-xl text-white/90 font-light">
                Spend less time chasing payments — let reminders work for you.
              </p>
            </div>

            {/* Quick Benefits */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: MessageSquare, text: "Auto payment reminders" },
                { icon: BarChart3, text: "Track overdue invoices" },
                { icon: Briefcase, text: "Simple dashboard" },
                { icon: Shield, text: "Secure and reliable" }
              ].map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 text-white/90"
                >
                  <benefit.icon className="h-5 w-5 text-cyan-300 flex-shrink-0" />
                  <span className="text-sm font-medium">{benefit.text}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                size="lg"
                className="h-14 text-lg font-semibold bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all"
              >
                {user ? 'Go to Dashboard' : 'Get Started Free'}
              </Button>
              <Button
                onClick={() => navigate('/auth')}
                size="lg"
                variant="outline"
                className="h-14 text-lg font-semibold bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
              >
                Watch Demo
              </Button>
            </div>

            <p className="text-sm text-white/70">
              ✓ Free to start  •  No credit card  •  Set up in seconds
            </p>
          </motion.div>

          {/* Right: Product Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-float border border-white/20">
              <img 
                src={heroDashboard} 
                alt="InvoiceFlow Dashboard Preview" 
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(199,89%,48%)]/20 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How InvoiceFlow Works
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Simple, automated workflow to help you get paid on time
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              icon: FileText, 
              title: "Create Invoice", 
              description: "Add your bills and set payment terms",
              step: "1"
            },
            { 
              icon: Bell, 
              title: "Auto Reminder", 
              description: "Smart reminders sent before due dates",
              step: "2"
            },
            { 
              icon: CheckCircle, 
              title: "Payment Received", 
              description: "Track payments and update status",
              step: "3"
            },
            { 
              icon: TrendingUp, 
              title: "Insights Dashboard", 
              description: "Analyze cash flow and trends",
              step: "4"
            }
          ].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 h-full hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-indigo-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {step.step}
                </div>
                <step.icon className="h-10 w-10 text-cyan-300 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-white/70">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/20 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Already Trusted by Early Users
            </h2>
            <p className="text-lg text-white/80 mb-8">
              Over 10–15 small businesses have already started using InvoiceFlow to simplify their payments.
            </p>

            {/* Testimonials */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {[
                {
                  name: "Priya Sharma",
                  role: "Interior Designer",
                  quote: "InvoiceFlow saved me hours every week. No more manual follow-ups!"
                },
                {
                  name: "Raj Mehta",
                  role: "Freelance Consultant",
                  quote: "Finally, a simple tool that helps me get paid on time. Love it!"
                },
                {
                  name: "Anita Gupta",
                  role: "Shop Owner",
                  quote: "The automated reminders work perfectly. My cash flow improved instantly."
                }
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center text-white font-semibold">
                      {testimonial.name[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium text-sm">{testimonial.name}</p>
                      <p className="text-white/60 text-xs">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm italic">"{testimonial.quote}"</p>
                </motion.div>
              ))}
            </div>

            {/* Business Type Icons */}
            <div className="flex justify-center gap-8 mt-12 flex-wrap">
              {[
                { icon: Briefcase, label: "Freelancers" },
                { icon: Clock, label: "Service Providers" },
                { icon: TrendingUp, label: "Small Business" }
              ].map((type, i) => (
                <div key={i} className="flex items-center gap-2 text-white/70">
                  <type.icon className="h-5 w-5" />
                  <span className="text-sm">{type.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Final CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Paid Faster?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Runs on desktop and laptop — get started in seconds.
          </p>
          <Button
            onClick={() => navigate(user ? '/dashboard' : '/auth')}
            size="lg"
            className="h-14 px-8 text-lg font-semibold bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            {user ? 'Go to Dashboard' : 'Get Started Free'}
          </Button>
          <p className="text-sm text-white/70 mt-4">
            No credit card required  •  Free forever plan available
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a
                href="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </a>
              <span>|</span>
              <a
                href="/terms"
                className="hover:text-foreground transition-colors"
              >
                Terms
              </a>
              <span>|</span>
              <a
                href="mailto:support@invoiceflow.com"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </a>
            </div>
            <p className="text-xs text-muted-foreground">© 2025 InvoiceFlow</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
