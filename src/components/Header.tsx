import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="absolute top-0 w-full z-50 bg-transparent">
      <nav className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-hero-gradient rounded-sm"></div>
            </div>
            <span className="text-lg sm:text-xl font-bold text-white">InvoiceFlow</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
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

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-background">
                <div className="flex flex-col space-y-6 pt-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-hero-gradient rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-sm"></div>
                    </div>
                    <span className="text-xl font-bold text-foreground">InvoiceFlow</span>
                  </div>
                  
                  <nav className="flex flex-col space-y-4">
                    <a 
                      href="#features" 
                      className="text-foreground hover:text-primary transition-colors py-2"
                      onClick={closeMobileMenu}
                    >
                      Features
                    </a>
                    <a 
                      href="#pricing" 
                      className="text-foreground hover:text-primary transition-colors py-2"
                      onClick={closeMobileMenu}
                    >
                      Pricing
                    </a>
                    <a 
                      href="#about" 
                      className="text-foreground hover:text-primary transition-colors py-2"
                      onClick={closeMobileMenu}
                    >
                      About
                    </a>
                  </nav>

                  <div className="flex flex-col space-y-3 pt-4 border-t">
                    {user ? (
                      <Button 
                        onClick={() => {
                          navigate('/dashboard');
                          closeMobileMenu();
                        }}
                        className="w-full"
                      >
                        Dashboard
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => {
                            navigate('/auth');
                            closeMobileMenu();
                          }}
                        >
                          Sign In
                        </Button>
                        <Button 
                          className="w-full"
                          onClick={() => {
                            handleGetStarted();
                            closeMobileMenu();
                          }}
                        >
                          Get Started
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
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