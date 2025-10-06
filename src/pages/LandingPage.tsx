import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import invoiceFlowLogo from '@/assets/invoiceflow-logo.png';
import { useAuth } from '@/hooks/useAuth';
import { Mail } from 'lucide-react';

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

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32 lg:py-40 flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-4xl mx-auto space-y-12">
          {/* Grand headline with reflective text */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight tracking-tight text-reflect">
              Get Paid Faster
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto font-light">
              Smart reminders that work. Stop chasing payments and focus on growing your business.
            </p>
          </div>

          {/* Glassy auth card */}
          <div className="max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
              <div className="space-y-4">
                {!user && (
                  <>
                    <Button
                      onClick={() => navigate('/auth')}
                      size="lg"
                      className="w-full h-14 text-lg font-semibold bg-white text-primary hover:bg-white/90 shadow-lg"
                    >
                      <Mail className="mr-2 h-5 w-5 stroke-[1.5]" />
                      Sign In with Email
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/20"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-transparent text-white/80">or</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate('/auth')}
                      size="lg"
                      variant="outline"
                      className="w-full h-14 text-lg font-semibold bg-transparent text-white border-white/30 hover:bg-white/10"
                    >
                      Continue with Google
                    </Button>
                  </>
                )}
                {user && (
                  <Button
                    onClick={() => navigate('/dashboard')}
                    size="lg"
                    className="w-full h-14 text-lg font-semibold bg-white text-primary hover:bg-white/90 shadow-lg"
                  >
                    Go to Dashboard
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
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
