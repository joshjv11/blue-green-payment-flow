import { Button } from "./ui/button";
import { ArrowRight, CheckCircle, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import heroImage from "@/assets/hero-dashboard.jpg";
import invoiceFlowLogo from '@/assets/invoiceflow-logo.png';

const EnhancedHero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const features = [
    "Smart AI-powered invoice management",
    "Automated payment reminders",
    "Real-time payment tracking",
    "Advanced analytics and insights"
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      company: "TechStart Inc.",
      text: "InvoiceFlow cut our payment delays by 60%. It's a game-changer!",
      rating: 5
    },
    {
      name: "Michael Chen",
      company: "Design Studio Pro", 
      text: "The automated reminders are perfect - professional but not pushy.",
      rating: 5
    }
  ];

  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27 width=%2732%27 height=%2732%27 fill=%27none%27%3e%3ccircle fill=%27%23ffffff%27 fill-opacity=%270.05%27 cx=%2716%27 cy=%2716%27 r=%271%27/%3e%3c/svg%3e')] opacity-50" />
      
      <div className="container relative mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                🚀 Trusted by 10,000+ businesses
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Never miss another{' '}
                <span className="block text-transparent bg-gradient-to-r from-white to-accent-foreground bg-clip-text">
                  payment deadline
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-white/90 mb-8 max-w-2xl">
                Streamline your invoice management with smart reminders, automated tracking, 
                and powerful analytics. Get paid faster and keep your cash flow healthy.
              </p>
            </div>

            <div className="space-y-4">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3 text-white/90">
                    <CheckCircle className="h-5 w-5 text-accent-foreground flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 shadow-medium text-lg px-8 h-14 font-semibold"
                onClick={handleGetStarted}
              >
                {user ? 'Go to Dashboard' : 'Start Free Trial'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 text-lg px-8 h-14 font-semibold backdrop-blur-sm"
              >
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center justify-center lg:justify-start space-x-6 text-white/80 text-sm">
              <div className="flex items-center space-x-1">
                <span className="font-semibold">4.9/5</span>
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current text-yellow-400" />
                  ))}
                </div>
              </div>
              <div>•</div>
              <div>500+ reviews</div>
              <div>•</div>
              <div>Free 14-day trial</div>
            </div>
          </div>
          
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-strong">
              <img 
                src={heroImage} 
                alt="InvoiceFlow dashboard - manage invoices and track payments effortlessly" 
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
            
            {/* Floating testimonials */}
            <div className="hidden lg:block absolute -right-4 top-1/4 space-y-4">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="w-80 shadow-medium border-0 backdrop-blur-sm bg-white/95">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-hero-gradient rounded-full flex items-center justify-center text-white font-semibold">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex space-x-1">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-current text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">"{testimonial.text}"</p>
                        <div className="text-xs">
                          <div className="font-semibold text-foreground">{testimonial.name}</div>
                          <div className="text-muted-foreground">{testimonial.company}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnhancedHero;