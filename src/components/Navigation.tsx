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
    <div className={cn("flex items-center gap-4", className)}>
      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-2"
          disabled={location.pathname === '/dashboard'}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
      )}
      
      <div className="flex items-center gap-2">
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
                "flex items-center gap-2",
                isActive && "bg-primary text-primary-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};