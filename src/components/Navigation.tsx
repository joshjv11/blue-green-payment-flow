import { Button } from '@/components/ui/button';
import { Home, FileText, BarChart3, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface NavigationProps {
  className?: string;
}

export const Navigation = ({ className }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/bills', icon: FileText, label: 'Bills' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
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
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-50",
          "bg-background/95 backdrop-blur-xl",
          "border-t border-border/40",
          "shadow-[0_-4px_16px_rgba(0,0,0,0.08)]",
          "safe-area-inset-bottom"
        )}
      >
        <div className="grid grid-cols-4 gap-1 px-2 py-3">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <motion.div
                key={item.path}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1.5 h-16 w-full",
                    "transition-all duration-300 ease-out",
                    "hover:bg-primary/10",
                    isActive && "text-primary"
                  )}
                >
                  {/* Icon with scale animation */}
                  <motion.div
                    animate={{ 
                      scale: isActive ? 1.1 : 1,
                      y: isActive ? -2 : 0
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.div>
                  
                  <span className={cn(
                    "text-xs font-medium transition-all duration-300",
                    isActive && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div
                      layoutId="activeMobileTab"
                      className="absolute top-1 w-1 h-1 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  {/* Background glow on active */}
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 bg-primary/5 rounded-lg -z-10"
                    />
                  )}
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