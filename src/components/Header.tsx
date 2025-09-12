import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <header className="absolute top-0 w-full z-50 bg-transparent">
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-hero-gradient rounded-sm"></div>
            </div>
            <span className="text-xl font-bold text-white">InvoiceFlow</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-white/90 hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-white/90 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-white/90 hover:text-white transition-colors">
              About
            </a>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <Button 
                onClick={() => navigate('/dashboard')}
                className="bg-white text-primary hover:bg-white/90"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
                <Button 
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={handleGetStarted}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;