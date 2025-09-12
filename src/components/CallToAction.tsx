import { Button } from "./ui/button";
import { ArrowRight, Check } from "lucide-react";

const CallToAction = () => {
  const benefits = [
    "14-day free trial",
    "No credit card required",
    "Set up in under 5 minutes",
    "Cancel anytime"
  ];

  return (
    <section className="py-20 lg:py-32 bg-hero-gradient relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20" />
      <div className="container relative mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to transform your
            <span className="block text-transparent bg-gradient-to-r from-white to-accent-foreground bg-clip-text">
              invoice management?
            </span>
          </h2>
          <p className="text-lg lg:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses that have streamlined their payment process 
            and improved their cash flow with our platform.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center text-white/90">
                <Check className="h-5 w-5 text-accent-foreground mr-2" />
                <span className="text-sm lg:text-base">{benefit}</span>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 shadow-medium text-lg px-8"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 text-lg px-8"
            >
              Schedule Demo
            </Button>
          </div>
          
          <p className="text-white/70 text-sm mt-6">
            Already have an account? 
            <a href="#" className="text-white hover:text-accent-foreground transition-colors ml-1">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;