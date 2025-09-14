import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface MobileLogoutOptimizerProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: React.ReactNode;
}

export const MobileLogoutOptimizer = ({ 
  className, 
  variant = 'ghost', 
  size = 'sm',
  children 
}: MobileLogoutOptimizerProps) => {
  const { signOut, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    console.log('📱 Mobile logout initiated');
    setIsLoggingOut(true);
    
    try {
      await signOut();
      console.log('✅ Mobile logout completed');
    } catch (error) {
      console.error('❌ Mobile logout failed:', error);
    } finally {
      // Keep loading state for a brief moment to show completion
      setTimeout(() => setIsLoggingOut(false), 300);
    }
  };

  const isProcessing = loading || isLoggingOut;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isProcessing}
      className={cn(
        "transition-all duration-200",
        isProcessing && "opacity-75",
        className
      )}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Signing out...
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4 mr-2" />
          {children || 'Sign Out'}
        </>
      )}
    </Button>
  );
};

export default MobileLogoutOptimizer;
