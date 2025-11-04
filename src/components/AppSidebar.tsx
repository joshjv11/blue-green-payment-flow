import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  ShoppingBag, 
  Package, 
  Download, 
  Settings,
  Receipt,
  BarChart3,
  Wallet,
  Lock,
  Crown,
  Sparkles,
  MessageCircle,
  Brain,
  CreditCard,
  LogOut,
  Shield,
  Target,
  PieChart
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEntitlements } from "@/lib/useEntitlements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, featureKey: "dashboard" },
  { title: "Bills", url: "/bills", icon: FileText, featureKey: "bills" },
  { title: "AI Coach", url: "/ai-coach", icon: Brain, featureKey: "ai-coach", isProminent: true, isNew: true },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle, featureKey: "whatsapp", requiredPlan: "pro" as const, isProminent: true },
  { title: "Savings Goals", url: "/savings-goals", icon: Target, featureKey: "savings-goals", requiredPlan: "pro" as const },
  { title: "EMI Manager", url: "/emi-manager", icon: CreditCard, featureKey: "emi-manager", requiredPlan: "pro" as const },
  { title: "Spending Insights", url: "/spending-insights", icon: PieChart, featureKey: "spending-insights", requiredPlan: "pro" as const },
  { title: "Sales", url: "/sales", icon: ShoppingCart, featureKey: "sales", requiredPlan: "premium" as const },
  { title: "Purchases", url: "/purchases", icon: ShoppingBag, featureKey: "purchases", requiredPlan: "premium" as const },
  { title: "Inventory", url: "/inventory", icon: Package, featureKey: "inventory", requiredPlan: "premium" as const },
  { title: "Expenses", url: "/expenses", icon: Wallet, featureKey: "expenses", requiredPlan: "premium" as const },
];

const secondaryItems = [
  { title: "Tax Reports", url: "/reports/tax", icon: Receipt, featureKey: "reports/tax", requiredPlan: "premium" as const },
  { title: "Financial Reports", url: "/reports/financial", icon: BarChart3, featureKey: "reports/financial", requiredPlan: "premium" as const },
  { title: "Exports", url: "/exports", icon: Download, featureKey: "exports", requiredPlan: "premium" as const },
  { title: "Settings", url: "/settings", icon: Settings, featureKey: "settings" },
];

const adminItems = [
  { title: "Admin CMS", url: "/admin-cms", icon: Shield, featureKey: "admin-cms" },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { plan, isPremium, loading, data } = useEntitlements();
  const { signOut } = useAuth();
  
  const hasFeatureAccess = (featureKey: string) => {
    const item = [...mainItems, ...secondaryItems].find(i => i.featureKey === featureKey);
    if (!item?.requiredPlan) return true;
    if (item.requiredPlan === 'premium') return plan === 'premium';
    if (item.requiredPlan === 'pro') return plan === 'pro' || plan === 'premium';
    return true;
  };
  
  const expiresAt = data?.current_period_end;
  const isExpiringSoon = expiresAt 
    ? new Date(expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 
    : false;

  const getNavClassName = ({ isActive }: { isActive: boolean }, isLocked: boolean) =>
    isActive
      ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
      : isLocked
      ? "opacity-50 cursor-not-allowed hover:bg-muted/30 text-muted-foreground"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  const renderNavItem = (item: typeof mainItems[0]) => {
    const hasAccess = hasFeatureAccess(item.featureKey);
    const isLocked = !hasAccess;
    const isPremiumFeature = item.requiredPlan === 'premium';
    const isProminent = (item as any).isProminent && hasAccess;
    const isNew = (item as any).isNew && hasAccess;
    const isAICoach = item.featureKey === 'ai-coach';

    const navContent = (
      <NavLink 
        to={isLocked ? "/upgrade" : item.url} 
        end 
        className={(props) => {
          const baseClass = getNavClassName(props, isLocked);
          if (isAICoach && !isLocked) {
            // AI Coach gets purple gradient styling
            return props.isActive 
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold border-l-2 border-purple-700"
              : "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 dark:text-purple-400 hover:from-purple-500/20 hover:to-pink-500/20 font-medium border-l-2 border-purple-500/30";
          }
          if (isProminent && !isLocked) {
            return props.isActive 
              ? "bg-green-600 text-white font-semibold border-l-2 border-green-700"
              : "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 font-medium border-l-2 border-green-500/30";
          }
          return baseClass;
        }}
        onClick={(e) => {
          if (isLocked) {
            e.preventDefault();
            window.location.href = '/upgrade';
          }
        }}
      >
        <div className="flex items-center gap-2 flex-1">
          <item.icon className={cn(
            "h-4 w-4 flex-shrink-0", 
            isAICoach && !isLocked && "text-purple-600 dark:text-purple-400",
            isProminent && !isLocked && !isAICoach && "text-green-600 dark:text-green-400"
          )} />
          {open && (
            <span className="flex items-center gap-2 flex-1">
              {item.title}
              {isPremiumFeature && (
                <Sparkles className="h-3 w-3 text-purple-500" />
              )}
              {isNew && !isLocked && (
                <Badge variant="outline" className={cn(
                  "ml-auto text-xs px-1.5 py-0",
                  isAICoach 
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 animate-pulse"
                    : "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50"
                )}>
                  New
                </Badge>
              )}
              {isProminent && !isLocked && !isNew && (
                <Badge variant="outline" className="ml-auto bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50 text-xs px-1.5 py-0">
                  New
                </Badge>
              )}
            </span>
          )}
        </div>
        {isLocked && <Lock className="h-3 w-3" />}
      </NavLink>
    );

    if (isLocked) {
      const planName = item.requiredPlan === 'premium' ? 'Premium (₹999/mo)' : 'Pro (₹100/mo)';
      return (
        <Tooltip key={item.title}>
          <TooltipTrigger asChild>
            <div className="relative">
              {navContent}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">Requires {planName}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    // Add tooltip for AI Coach to entice users
    if (isAICoach) {
      return (
        <Tooltip key={item.title}>
          <TooltipTrigger asChild>
            <div className="relative">
              {navContent}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs">Make your business smarter using AI</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return navContent;
  };

  const getDaysRemaining = () => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return days > 0 ? days : 0;
  };

  if (loading) return null;

  return (
    <Sidebar collapsible="offcanvas" className="md:collapsible-icon">
      <SidebarContent className="overflow-y-auto">
        {/* Plan Badge */}
        {open && (
          <div className="px-3 md:px-4 py-2 md:py-3 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Current Plan
                </p>
                <Badge 
                  variant={plan === 'premium' ? 'default' : plan === 'pro' ? 'secondary' : 'outline'}
                  className={
                    plan === 'premium' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600' 
                      : plan === 'pro'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                      : ''
                  }
                >
                  {plan === 'premium' ? 'Premium ⭐' : plan === 'pro' ? 'Pro' : 'Free'}
                </Badge>
              </div>
            </div>
            
            {/* Expiry warning */}
            {isExpiringSoon && expiresAt && (
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
                <p className="font-medium">Expires in {getDaysRemaining()} days</p>
                <NavLink to="/upgrade" className="text-primary hover:underline text-xs mt-1 inline-block">
                  Renew Now →
                </NavLink>
              </div>
            )}
            
            {plan === 'free' && (
              <NavLink 
                to="/upgrade" 
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                Upgrade to Premium →
              </NavLink>
            )}
            
            {/* View Plans Button - Always visible */}
            <NavLink to="/upgrade" className="block mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2 text-xs"
              >
                <CreditCard className="h-3 w-3" />
                {open ? 'View & Manage Plans' : 'Plans'}
              </Button>
            </NavLink>
          </div>
        )}
        
        {/* View Plans Button - When sidebar is collapsed */}
        {!open && (
          <div className="px-2 py-2 border-b">
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink to="/upgrade">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4" />
                  </Button>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>View Plans</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider px-3 md:px-4 py-2">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="min-h-[44px] md:min-h-[36px]">
                    {renderNavItem(item)}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider flex items-center gap-2 px-3 md:px-4 py-2">
            <span>Premium Features</span>
            {!isPremium && <Sparkles className="h-3 w-3 text-purple-500" />}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-1">
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="min-h-[44px] md:min-h-[36px]">
                    {renderNavItem(item)}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin CMS Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider flex items-center gap-2 px-3 md:px-4 py-2">
            <Shield className="h-3 w-3" />
            <span>Admin</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-1">
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="min-h-[44px] md:min-h-[36px]">
                    <NavLink 
                      to={item.url} 
                      end 
                      className={(props) => 
                        props.isActive 
                          ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {open && <span>{item.title}</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="mt-auto border-t pt-2 px-3 md:px-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className={cn(
              "w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive",
              !open && "justify-center px-2"
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {open && <span>Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
