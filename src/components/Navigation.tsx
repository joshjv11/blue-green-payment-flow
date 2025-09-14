import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, FileText, BarChart3, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavigationProps {
  showBackButton?: boolean;
  className?: string;
}

export const Navigation = ({ showBackButton = true, className }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/bills', icon: FileText, label: 'Bills' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const getCurrentPageName = () => {
    const currentItem = navigationItems.find(item => item.path === location.pathname);
    return currentItem?.label || 'Page';
  };

  const canGoBack = () => {
    return window.history.length > 1 && location.pathname !== '/dashboard';
  };

  const handleBack = () => {
    if (canGoBack()) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className={cn("sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b", className)}>
      <div className="container mx-auto px-4 py-3">
        {/* Mobile-optimized navigation */}
        <div className="flex items-center justify-between md:justify-start md:gap-6">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-2 h-10 px-3"
              disabled={location.pathname === '/dashboard'}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          
          {/* Page title for small screens */}
          <div className="md:hidden">
            <h1 className="text-lg font-semibold text-foreground">
              {getCurrentPageName()}
            </h1>
          </div>

          {/* Navigation items - horizontal scroll on mobile, normal on desktop */}
          <div className="hidden md:flex items-center gap-2">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center gap-2 h-10 px-4",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Bottom navigation for mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
          <div className="grid grid-cols-4 gap-1 p-2">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex flex-col items-center gap-1 h-14 p-2",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};