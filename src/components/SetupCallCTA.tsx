import { Button } from "./ui/button";
import { Calendar, CheckCircle, Star, Users } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

const SetupCallCTA = () => {
  const benefits = [
    "Personalized onboarding & setup",
    "Custom workflow configuration", 
    "Priority support for 30 days",
    "Exclusive early-access features"
  ];

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Freelance Designer",
      text: "The setup call was incredibly helpful. Got everything configured in 30 minutes!",
      rating: 5
    },
    {
      name: "Arjun Patel", 
      role: "Small Business Owner",
      text: "Worth every rupee. The personalized guidance saved me hours of figuring things out.",
      rating: 5
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-orange-100 text-orange-800 border-orange-200">
              🔥 Limited Time Offer
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Skip the learning curve with a
              <span className="block text-transparent bg-gradient-to-r from-primary to-accent bg-clip-text">
                1:1 Setup & Strategy Call
              </span>
            </h2>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
              Get your InvoiceFlow account perfectly configured by our experts. 
              Plus receive a custom strategy session for your business needs.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Offer Details */}
            <div className="space-y-8">
              <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-foreground">Priority Setup Package</h3>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground line-through">₹999</div>
                      <div className="text-2xl font-bold text-primary">₹199</div>
                    </div>
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    size="lg" 
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
                    onClick={() => window.open('https://calendly.com/invoiceflow/setup', '_blank')}
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Book Your Setup Call Now
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    💳 Secure payment • 🔒 30-day money-back guarantee
                  </p>
                </CardContent>
              </Card>

              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Early Access Special
                  </span>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  First 50 users get exclusive premium features and help shape InvoiceFlow's roadmap. 
                  Only <strong>12 spots remaining</strong> this month!
                </p>
              </div>
            </div>

            {/* Right Side - Testimonials */}
            <div className="space-y-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-hero-gradient rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex space-x-1">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-current text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3">"{testimonial.text}"</p>
                        <div>
                          <div className="font-semibold text-foreground">{testimonial.name}</div>
                          <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <div className="text-center p-6 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">What you'll get in your call:</p>
                <div className="flex flex-wrap justify-center gap-4 text-xs">
                  <span>⚡ Account setup</span>
                  <span>🎯 Custom workflows</span>
                  <span>📊 Analytics setup</span>
                  <span>🤖 AI configuration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SetupCallCTA;