import { Button } from '@/components/ui/button';
import { Home, FileText, BarChart3, Settings, Shield, DollarSign, ShoppingCart, Package, FileSpreadsheet } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NavigationProps {
  className?: string;
}

export const Navigation = ({ className }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    
    try {
      const { data } = await supabase.rpc('is_system_admin');
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const navigationItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/bills', icon: FileText, label: 'Bills' },
    { path: '/sales', icon: DollarSign, label: 'Sales' },
    { path: '/purchases', icon: ShoppingCart, label: 'Purchases' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/gst-summary', icon: FileSpreadsheet, label: 'GST' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    ...(isAdmin ? [{ path: '/admin/users', icon: Shield, label: 'Admin' }] : []),
  ];

  return (
    <>
      {/* Desktop Navigation - Fixed Top */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          "hidden md:block fixed top-0 left-0 right-0 z-50",
          "bg-background/80 backdrop-blur-xl",
          "border-b border-border/40",
          "shadow-lg shadow-black/5",
          className
        )}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-center gap-2">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <motion.div
                  key={item.path}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "relative flex items-center gap-3 h-11 px-6",
                      "transition-all duration-300 ease-out",
                      "hover:bg-primary/10",
                      isActive && "text-primary font-semibold"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isActive && "scale-110"
                    )} />
                    <span>{item.label}</span>
                    
                    {/* Active indicator with slide animation */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    
                    {/* Glow effect on active */}
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-primary/5 rounded-md -z-10"
                      />
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.nav>

      {/* Mobile Navigation - Fixed Bottom */}
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-50",
          "bg-background/98 backdrop-blur-2xl",
          "border-t border-border/50",
          "shadow-[0_-8px_24px_rgba(0,0,0,0.12)]",
          "safe-area-inset-bottom"
        )}
      >
        <div className={cn(
          "grid gap-0.5 px-2 py-2.5",
          navigationItems.length === 5 ? "grid-cols-5" : "grid-cols-4"
        )}>
          {navigationItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.05,
                  duration: 0.3,
                  ease: [0.25, 0.4, 0.25, 1]
                }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1",
                    "h-16 w-full rounded-xl",
                    "transition-all duration-300 ease-out",
                    "min-h-[64px]", // Touch target
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {/* Icon with enhanced animation */}
                  <motion.div
                    animate={{ 
                      scale: isActive ? 1.15 : 1,
                      y: isActive ? -3 : 0
                    }}
                    transition={{ 
                      type: "spring",
                      stiffness: 400,
                      damping: 25
                    }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  </motion.div>
                  
                  <span className={cn(
                    "text-[10px] font-medium transition-all duration-300",
                    isActive && "font-bold"
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Active indicator - Glowing dot */}
                  {isActive && (
                    <>
                      <motion.div
                        layoutId="activeMobileTab"
                        className="absolute top-2 w-1.5 h-1.5 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                      
                      {/* Glow effect */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-2 w-3 h-3 bg-primary/30 rounded-full blur-sm"
                      />
                    </>
                  )}
                  
                  {/* Background glow on active */}
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 bg-primary/5 rounded-xl -z-10"
                    />
                  )}
                  
                  {/* Ripple effect on tap */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: isActive ? 1.5 : 0, opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-primary/10 rounded-xl -z-10"
                  />
                </Button>
              </motion.div>
            );
          })}
        </div>
      </motion.nav>

      {/* Spacer to prevent content from going under fixed nav */}
      <div className="hidden md:block h-[73px]" />
      <div className="md:hidden h-[88px]" />
    </>
  );
};