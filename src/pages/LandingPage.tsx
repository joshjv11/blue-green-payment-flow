import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import invoiceFlowLogo from '@/assets/invoiceflow-logo.png';
import heroDashboard from '@/assets/hero-dashboard.jpg';
import { useAuth } from '@/hooks/useAuth';
import { 
  Mail, MessageSquare, BarChart3, Briefcase, Shield, FileText, 
  Bell, CheckCircle, TrendingUp, Clock, Zap, Sparkles, 
  Receipt, CreditCard, Globe, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedGradient } from '@/components/landing/AnimatedGradient';
import { FeatureCard } from '@/components/landing/FeatureCard';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Animated Gradient Background */}
      <AnimatedGradient />
      
      {/* Additional gradient overlay for depth */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-r from-blue-950/20 via-transparent to-purple-950/20 pointer-events-none" />

      {/* Header - Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-landing border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-2"
          >
            <motion.div
              animate={{ 
                y: [0, -4, 0],
                scale: [1, 1.02, 1]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative"
            >
              {/* Animated glow rings */}
              <motion.div
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.3, 0, 0.3]
                }}
                transition={{ 
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className="absolute inset-0 -m-3 rounded-2xl bg-gradient-to-r from-blue-500/30 via-cyan-500/30 to-blue-500/30 blur-xl"
              />
              
              {/* Logo container with gradient border */}
              <div className="relative bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-purple-500/10 p-3 rounded-2xl border border-white/20 backdrop-blur-sm shadow-lg">
                <img src={invoiceFlowLogo} alt="InvoiceFlow" className="h-10 w-auto relative z-10" />
                
                {/* Corner accent */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full shadow-lg shadow-cyan-500/50" />
              </div>
            </motion.div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-4"
          >
            {user ? (
              <Button
                onClick={() => navigate('/dashboard')}
                className="font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/auth')}
                  variant="ghost"
                  className="hidden sm:inline-flex font-medium text-white/80 hover:text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/auth')}
                  className="font-semibold glow-button bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600"
                >
                  Start Free
                </Button>
              </>
            )}
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text + CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-8 relative z-10"
            >
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-landing border border-white/10 text-sm text-white/80"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>AI-Powered Invoice Management</span>
                </motion.div>
                
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
                  <span className="gradient-text-blue">Get Paid Faster</span>
                  <br />
                  <span className="text-white">with Smart Automation</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-white/70 font-light leading-relaxed max-w-2xl">
                  Stop chasing payments. Let AI-powered reminders and analytics work for you while you focus on growing your business.
                </p>
              </div>

              {/* Quick Benefits */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="grid grid-cols-2 gap-4"
              >
                {[
                  { icon: Zap, text: "Auto reminders" },
                  { icon: BarChart3, text: "Real-time analytics" },
                  { icon: Shield, text: "Bank-level security" },
                  { icon: Globe, text: "GST compliance" }
                ].map((benefit, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-white/80 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors">
                      <benefit.icon className="h-4 w-4 text-cyan-400" />
                    </div>
                    <span className="text-sm font-medium">{benefit.text}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button
                  onClick={() => navigate(user ? '/dashboard' : '/auth')}
                  size="lg"
                  className="h-14 px-8 text-lg font-semibold glow-button bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 group"
                >
                  {user ? 'Go to Dashboard' : 'Get Started Free'}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  onClick={() => navigate('/auth')}
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg font-semibold glass-landing text-white border-white/20 hover:bg-white/10 hover:border-white/30 backdrop-blur-sm"
                >
                  Watch Demo
                </Button>
              </motion.div>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="text-sm text-white/60 flex items-center gap-4"
              >
                <span>✓ Free to start</span>
                <span>•</span>
                <span>No credit card</span>
                <span>•</span>
                <span>Set up in 60 seconds</span>
              </motion.p>
            </motion.div>

            {/* Right: Product Preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="relative z-10"
            >
              <div className="relative rounded-3xl overflow-hidden glass-landing-strong border border-white/10 shadow-2xl group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 pointer-events-none" />
                <img 
                  src={heroDashboard} 
                  alt="InvoiceFlow Dashboard Preview" 
                  className="w-full h-auto relative z-10 group-hover:scale-[1.02] transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/80 via-transparent to-transparent pointer-events-none z-20" />
              </div>
              
              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="absolute -bottom-4 -left-4 glass-landing rounded-2xl p-4 border border-white/10 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">99.9% Uptime</p>
                    <p className="text-white/60 text-xs">Always available</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              <span className="gradient-text-blue">Everything You Need</span>
              <br />
              <span className="text-white">to Manage Invoices</span>
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Powerful features designed for modern businesses
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={FileText}
              title="Smart Invoice Tracking"
              description="Automatically track all your invoices, bills, and payments in one place with intelligent categorization."
              delay={0}
              gradient="blue"
            />
            <FeatureCard
              icon={Bell}
              title="Auto Payment Reminders"
              description="Never miss a payment again. AI-powered reminders sent via email and WhatsApp before due dates."
              delay={0.1}
              gradient="cyan"
            />
            <FeatureCard
              icon={BarChart3}
              title="Advanced Analytics"
              description="Real-time insights into your cash flow, revenue trends, and payment patterns with beautiful visualizations."
              delay={0.2}
              gradient="purple"
            />
            <FeatureCard
              icon={Receipt}
              title="GST Compliance"
              description="One-click GSTR filing, ITC reconciliation, and e-invoice generation. Stay compliant effortlessly."
              delay={0.3}
              gradient="amber"
            />
            <FeatureCard
              icon={CreditCard}
              title="Payment Links"
              description="Generate instant payment links with UPI, Razorpay, and more. Get paid faster with multiple gateways."
              delay={0.4}
              gradient="blue"
            />
            <FeatureCard
              icon={Shield}
              title="Enterprise Security"
              description="Bank-level encryption, secure data storage, and regular backups. Your data is always safe."
              delay={0.5}
              gradient="purple"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              <span className="text-white">Simple.</span>
              <span className="gradient-text-blue"> Fast.</span>
              <span className="text-white"> Effective.</span>
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Get started in minutes, not hours
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: FileText, 
                title: "Add Your Bills", 
                description: "Import or create invoices in seconds",
                step: "1"
              },
              { 
                icon: Bell, 
                title: "Set Reminders", 
                description: "Automated alerts before due dates",
                step: "2"
              },
              { 
                icon: CheckCircle, 
                title: "Track Payments", 
                description: "Real-time status updates",
                step: "3"
              },
              { 
                icon: TrendingUp, 
                title: "Grow Your Business", 
                description: "Insights to optimize cash flow",
                step: "4"
              }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative group"
              >
                <div className="glass-landing-strong rounded-2xl p-6 h-full border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="absolute -top-4 -left-4 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform">
                    {step.step}
                  </div>
                  <step.icon className="h-12 w-12 text-cyan-400 mb-4 mt-2 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="relative py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto"
          >
            <div className="glass-landing-strong rounded-3xl p-8 md:p-12 border border-white/10">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  Trusted by <span className="gradient-text-blue">Growing Businesses</span>
                </h2>
                <p className="text-lg text-white/70">
                  Join hundreds of businesses already using InvoiceFlow
                </p>
              </div>

              {/* Testimonials */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
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
                    className="glass-landing rounded-xl p-6 border border-white/10"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg">
                        {testimonial.name[0]}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{testimonial.name}</p>
                        <p className="text-white/60 text-xs">{testimonial.role}</p>
                      </div>
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed italic">"{testimonial.quote}"</p>
                  </motion.div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
                {[
                  { label: "Active Users", value: "500+" },
                  { label: "Invoices Tracked", value: "10K+" },
                  { label: "Uptime", value: "99.9%" }
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-3xl font-black gradient-text-blue mb-1">{stat.value}</p>
                    <p className="text-sm text-white/60">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="glass-landing-strong rounded-3xl p-12 md:p-16 border border-white/10">
              <h2 className="text-4xl md:text-5xl font-black mb-6">
                <span className="gradient-text-blue">Ready to Get Started?</span>
              </h2>
              <p className="text-xl text-white/70 mb-8 leading-relaxed">
                Join thousands of businesses already using InvoiceFlow to streamline their payments and grow faster.
              </p>
              <Button
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                size="lg"
                className="h-16 px-12 text-xl font-semibold glow-button bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 group mb-6"
              >
                {user ? 'Go to Dashboard' : 'Get Started Free'}
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Button>
              <p className="text-sm text-white/60">
                No credit card required • Free forever plan • Set up in 60 seconds
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 glass-landing">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-4 text-sm text-white/60">
              <a
                href="/privacy"
                className="hover:text-white transition-colors"
              >
                Privacy
              </a>
              <span>|</span>
              <a
                href="/terms"
                className="hover:text-white transition-colors"
              >
                Terms
              </a>
              <span>|</span>
              <a
                href="mailto:support@invoiceflow.com"
                className="hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>
            <p className="text-xs text-white/40">© 2025 InvoiceFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
