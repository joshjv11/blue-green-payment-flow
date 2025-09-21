import { Bell, TrendingUp, CreditCard, Zap, Shield, Calendar } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

const EnhancedFeatures = () => {
  const features = [
    {
      icon: Bell,
      title: "Smart Reminders",
      description: "AI-powered reminder system that sends notifications at optimal times to maximize payment success rates.",
      badge: "Most Popular"
    },
    {
      icon: CreditCard,
      title: "Payment Tracking", 
      description: "Real-time visibility into all invoices with automated status updates, payment confirmations, and overdue alerts.",
      badge: null
    },
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description: "Deep insights into cash flow patterns, client payment behavior, and business performance metrics.",
      badge: "Pro Feature"
    },
    {
      icon: Zap,
      title: "Automation Engine",
      description: "Set up workflows that automatically handle recurring invoices, follow-ups, and payment processing.",
      badge: null
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption, SOC 2 compliance, and advanced access controls to protect your financial data.",
      badge: "Enterprise"
    },
    {
      icon: Calendar,
      title: "Calendar Integration",
      description: "Seamlessly sync with Google Calendar, Outlook, and other tools to never miss important payment dates.",
      badge: null
    }
  ];

  const stats = [
    { value: "97%", label: "Faster Payment Collection" },
    { value: "50%", label: "Reduction in Late Payments" }, 
    { value: "10k+", label: "Happy Customers" },
    { value: "$2M+", label: "Payments Processed" }
  ];

  return (
    <section className="py-20 lg:py-32 bg-feature-gradient">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            ⚡ Powerful Features
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Everything you need to
            <span className="block text-transparent bg-gradient-to-r from-primary to-accent bg-clip-text">
              get paid on time
            </span>
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            Our comprehensive platform combines intelligent automation with powerful insights 
            to transform how you manage invoices and payments.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group border-0 shadow-soft hover:shadow-medium transition-all duration-500 hover:-translate-y-2 bg-card-gradient"
            >
              <CardContent className="p-8">
                <div className="relative">
                  {feature.badge && (
                    <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs">
                      {feature.badge}
                    </Badge>
                  )}
                  
                  <div className="mb-6 inline-flex items-center justify-center w-16 h-16 bg-hero-gradient rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-glow">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-hero-gradient rounded-2xl p-8 md:p-12 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to transform your payment collection?
            </h3>
            <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Join thousands of businesses already using InvoiceFlow to get paid faster and manage cash flow better.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-primary hover:bg-white/90 px-8 py-3 rounded-lg font-semibold transition-all duration-300 shadow-medium">
                Start Free Trial
              </button>
              <button className="border border-white/30 text-white hover:bg-white/10 px-8 py-3 rounded-lg font-semibold transition-all duration-300 backdrop-blur-sm">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnhancedFeatures;