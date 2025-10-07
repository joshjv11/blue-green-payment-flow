import { Bell, TrendingUp, CreditCard } from "lucide-react";
import { Card, CardContent } from "./ui/card";

const Features = () => {
  const features = [
    {
      icon: Bell,
      title: "Smart Reminders",
      description: "Automated payment reminders sent at the perfect time to maximize collection rates without annoying your clients."
    },
    {
      icon: CreditCard,
      title: "Payment Tracking",
      description: "Real-time visibility into all your invoices, payments, and outstanding balances with intuitive status updates."
    },
    {
      icon: TrendingUp,
      title: "Analytics",
      description: "Powerful insights into your payment patterns, client behavior, and cash flow trends to optimize your business."
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-feature-gradient animate-fade-in">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
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
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group border-0 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-8 text-center">
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 bg-hero-gradient rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;