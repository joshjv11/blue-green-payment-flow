import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Brain,
  MessageCircle,
  Target,
  CreditCard,
  PieChart,
  ShoppingCart,
  ShoppingBag,
  Package,
  Wallet,
  Shield,
  Receipt,
  Download,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  Sparkles,
  Lock,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/lib/useEntitlements';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion } from 'framer-motion';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  featureKey: string;
  requiredPlan?: 'pro' | 'premium';
  isProminent?: boolean;
  isNew?: boolean;
  children?: NavItem[];
}

// Core Features (Free)
const coreItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, featureKey: 'dashboard' },
  { title: 'Bills', url: '/bills', icon: FileText, featureKey: 'bills' },
  { title: 'Analytics', url: '/analytics', icon: BarChart3, featureKey: 'analytics' },
];

// Pro Features
const proItems: NavItem[] = [
  { title: 'AI Coach', url: '/ai-coach', icon: Brain, featureKey: 'ai-coach', isProminent: true, isNew: true },
  { title: 'WhatsApp', url: '/whatsapp', icon: MessageCircle, featureKey: 'whatsapp', requiredPlan: 'pro', isProminent: true },
  { title: 'Savings Goals', url: '/savings-goals', icon: Target, featureKey: 'savings-goals', requiredPlan: 'pro' },
  { title: 'EMI Manager', url: '/emi-manager', icon: CreditCard, featureKey: 'emi-manager', requiredPlan: 'pro' },
  { title: 'Spending Insights', url: '/spending-insights', icon: PieChart, featureKey: 'spending-insights', requiredPlan: 'pro' },
];

// Premium Features - Business Operations
const premiumBusinessItems: NavItem[] = [
  { title: 'Sales', url: '/sales', icon: ShoppingCart, featureKey: 'sales', requiredPlan: 'premium' },
  { title: 'Purchases', url: '/purchases', icon: ShoppingBag, featureKey: 'purchases', requiredPlan: 'premium' },
  { title: 'Inventory', url: '/inventory', icon: Package, featureKey: 'inventory', requiredPlan: 'premium' },
  { title: 'Expenses', url: '/expenses', icon: Wallet, featureKey: 'expenses', requiredPlan: 'premium' },
];

// Premium Features - GST & Compliance
const premiumGSTItems: NavItem[] = [
  { title: 'GST Dashboard', url: '/gst', icon: Shield, featureKey: 'gst', requiredPlan: 'premium', isProminent: true, isNew: true },
  { title: 'GSTR Filing', url: '/gstr-filing', icon: Receipt, featureKey: 'gstr-filing', requiredPlan: 'premium' },
];

// Premium Features - Reports & Exports
const premiumReportsItems: NavItem[] = [
  { title: 'Tax Reports', url: '/reports/tax', icon: Receipt, featureKey: 'reports/tax', requiredPlan: 'premium' },
  { title: 'Financial Reports', url: '/reports/financial', icon: BarChart3, featureKey: 'reports/financial', requiredPlan: 'premium' },
  { title: 'Exports', url: '/exports', icon: Download, featureKey: 'exports', requiredPlan: 'premium' },
];

// Admin Items
const adminItems: NavItem[] = [
  { title: 'Admin CMS', url: '/admin-cms', icon: Shield, featureKey: 'admin-cms' },
  { title: 'Sales List', url: '/sales-list', icon: ShoppingCart, featureKey: 'sales-list', requiredPlan: 'premium' },
  { title: 'Purchases List', url: '/purchases-list', icon: ShoppingBag, featureKey: 'purchases-list', requiredPlan: 'premium' },
];

export function HorizontalNavbar() {
  const { user, signOut } = useAuth();
  const { plan, isPremium, isPro, loading } = useEntitlements();
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const hasFeatureAccess = (featureKey: string, requiredPlan?: 'pro' | 'premium') => {
    if (!requiredPlan) return true;
    if (requiredPlan === 'premium') return plan === 'premium';
    if (requiredPlan === 'pro') return plan === 'pro' || plan === 'premium';
    return true;
  };

  const handleNavClick = (item: NavItem, e?: React.MouseEvent) => {
    if (!hasFeatureAccess(item.featureKey, item.requiredPlan)) {
      e?.preventDefault();
      navigate('/upgrade');
    }
  };

  const renderNavItem = (item: NavItem, isDropdown = false) => {
    if (!item || !item.icon) {
      console.warn('NavItem missing or missing icon:', item);
      return null;
    }
    
    const hasAccess = hasFeatureAccess(item.featureKey, item.requiredPlan);
    const isLocked = !hasAccess;
    const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + '/');
    const Icon = item.icon;

    if (isDropdown) {
      return (
        <DropdownMenuItem
          key={item.title}
          asChild
          disabled={isLocked}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 cursor-pointer',
            isActive && 'bg-primary/10 text-primary font-semibold',
            isLocked && 'opacity-60 cursor-not-allowed'
          )}
        >
          <NavLink to={isLocked ? '/upgrade' : item.url} onClick={(e) => handleNavClick(item, e)}>
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{item.title}</span>
            {item.isNew && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50">
                New
              </Badge>
            )}
            {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
          </NavLink>
        </DropdownMenuItem>
      );
    }

    return (
      <NavLink
        key={item.title}
        to={isLocked ? '/upgrade' : item.url}
        onClick={(e) => handleNavClick(item, e)}
        onMouseEnter={() => setHoveredItem(item.featureKey)}
        onMouseLeave={() => setHoveredItem(null)}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300 relative group',
          isActive
            ? 'bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 text-primary font-semibold shadow-md'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          isLocked && 'opacity-60 cursor-not-allowed',
          item.isProminent && hasAccess && 'bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-transparent border border-green-500/20'
        )}
      >
        <motion.div
          animate={{ scale: hoveredItem === item.featureKey ? 1.1 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
        </motion.div>
        <span className="font-medium text-sm">{item.title}</span>
        {item.isNew && hasAccess && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50">
            New
          </Badge>
        )}
        {item.requiredPlan === 'premium' && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50">
            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
            Premium
          </Badge>
        )}
        {item.requiredPlan === 'pro' && !isPremium && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50">
            Pro
          </Badge>
        )}
        {isLocked && <Lock className="h-3 w-3 text-muted-foreground ml-auto" />}
      </NavLink>
    );
  };


  if (loading) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b-2 border-border/60 bg-gradient-to-r from-background via-background/98 to-background backdrop-blur-xl shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <NavLink to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Crown className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                InvoiceFlow
              </span>
            </NavLink>
          </div>

          {/* Main Navigation */}
          <div className="flex items-center gap-1 flex-1 justify-center overflow-x-auto scrollbar-hide px-2">
            {/* Core Items - Always Visible */}
            {coreItems.filter(item => item && item.icon).map(item => renderNavItem(item))}

            {/* Pro Features Dropdown */}
            {(isPro || isPremium) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 h-auto font-medium text-sm',
                      (location.pathname.startsWith('/ai-coach') ||
                       location.pathname.startsWith('/whatsapp') ||
                       location.pathname.startsWith('/savings-goals') ||
                       location.pathname.startsWith('/emi-manager') ||
                       location.pathname.startsWith('/spending-insights')) && 'bg-primary/10 text-primary'
                    )}
                  >
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span>Pro</span>
                    <ChevronRight className="h-3 w-3 ml-1 rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    Pro Features
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {proItems.filter(item => item && item.icon).map(item => renderNavItem(item, true))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Premium Features - Business Dropdown with nested Reports */}
            {isPremium && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 h-auto font-medium text-sm',
                      (location.pathname.startsWith('/sales') ||
                       location.pathname.startsWith('/purchases') ||
                       location.pathname.startsWith('/inventory') ||
                       location.pathname.startsWith('/expenses') ||
                       location.pathname.startsWith('/reports') ||
                       location.pathname.startsWith('/exports')) && 'bg-primary/10 text-primary'
                    )}
                  >
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span>Business</span>
                    <ChevronRight className="h-3 w-3 ml-1 rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Business Operations
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {premiumBusinessItems.filter(item => item && item.icon).map(item => renderNavItem(item, true))}
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center gap-3">
                      <BarChart3 className="h-4 w-4" />
                      <span>Reports & Exports</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                      {premiumReportsItems.filter(item => item && item.icon).map(item => renderNavItem(item, true))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Premium Features - GST Dropdown */}
            {(isPremium) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 h-auto font-medium text-sm',
                      (location.pathname.startsWith('/gst') || location.pathname.startsWith('/gstr-filing')) && 'bg-primary/10 text-primary'
                    )}
                  >
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span>GST</span>
                    <ChevronRight className="h-3 w-3 ml-1 rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    GST & Compliance
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {premiumGSTItems.filter(item => item && item.icon).map(item => renderNavItem(item, true))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Reports Dropdown (if not premium, show as locked) */}
            {!isPremium && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-4 py-2.5 h-auto font-medium text-sm opacity-60"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Reports</span>
                    <Lock className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Reports & Exports</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Requires Premium Plan</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/upgrade" className="flex items-center gap-2 text-primary">
                      <Crown className="h-4 w-4" />
                      <span>Upgrade to Premium</span>
                    </NavLink>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Settings */}
            {renderNavItem({ title: 'Settings', url: '/settings', icon: Settings, featureKey: 'settings' })}

            {/* Admin Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 h-auto font-medium text-sm',
                    location.pathname.startsWith('/admin') && 'bg-primary/10 text-primary'
                  )}
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                  <ChevronRight className="h-3 w-3 ml-1 rotate-90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Admin</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {adminItems.filter(item => item && item.icon).map(item => renderNavItem(item, true))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Plan Badge */}
            <Badge
              variant={plan === 'premium' ? 'default' : plan === 'pro' ? 'secondary' : 'outline'}
              className={cn(
                'hidden md:flex items-center gap-1.5 px-3 py-1.5 font-semibold',
                plan === 'premium' &&
                  'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white border-0 shadow-lg shadow-purple-500/40',
                plan === 'pro' &&
                  'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white border-0 shadow-lg shadow-blue-500/40',
                plan === 'free' && 'bg-muted/60 border-border/60'
              )}
            >
              {plan === 'premium' ? (
                <>
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  Premium
                </>
              ) : plan === 'pro' ? (
                <>
                  <Zap className="h-3 w-3" />
                  Pro
                </>
              ) : (
                'Free'
              )}
            </Badge>

            <ThemeToggle />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold text-xs">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-semibold">{user?.email}</span>
                    <span className="text-xs text-muted-foreground">{plan === 'premium' ? 'Premium Plan' : plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/upgrade" className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    <span>Upgrade Plan</span>
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}

