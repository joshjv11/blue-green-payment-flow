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
  MessageCircle
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

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, featureKey: "dashboard" },
  { title: "Bills", url: "/bills", icon: FileText, featureKey: "bills" },
  { title: "Sales", url: "/sales", icon: ShoppingCart, featureKey: "sales", requiredPlan: "pro" as const },
  { title: "Purchases", url: "/purchases", icon: ShoppingBag, featureKey: "purchases", requiredPlan: "pro" as const },
  { title: "Inventory", url: "/inventory", icon: Package, featureKey: "inventory", requiredPlan: "premium" as const },
  { title: "Expenses", url: "/expenses", icon: Wallet, featureKey: "expenses" },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle, featureKey: "whatsapp", requiredPlan: "pro" as const },
];

const secondaryItems = [
  { title: "Tax Reports", url: "/reports/tax", icon: Receipt, featureKey: "reports/tax", requiredPlan: "premium" as const },
  { title: "Financial Reports", url: "/reports/financial", icon: BarChart3, featureKey: "reports/financial", requiredPlan: "premium" as const },
  { title: "Exports", url: "/exports", icon: Download, featureKey: "exports", requiredPlan: "premium" as const },
  { title: "Settings", url: "/settings", icon: Settings, featureKey: "settings" },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { plan, isPremium, loading, data } = useEntitlements();
  
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

    const navContent = (
      <NavLink 
        to={isLocked ? "/upgrade" : item.url} 
        end 
        className={(props) => getNavClassName(props, isLocked)}
        onClick={(e) => {
          if (isLocked) {
            e.preventDefault();
            window.location.href = '/upgrade';
          }
        }}
      >
        <div className="flex items-center gap-2 flex-1">
          <item.icon className="h-4 w-4 flex-shrink-0" />
          {open && (
            <span className="flex items-center gap-2 flex-1">
              {item.title}
              {isPremiumFeature && (
                <Sparkles className="h-3 w-3 text-purple-500" />
              )}
            </span>
          )}
        </div>
        {isLocked && <Lock className="h-3 w-3" />}
      </NavLink>
    );

    if (isLocked) {
      const planName = item.requiredPlan === 'premium' ? 'Premium (₹500/mo)' : 'Pro (₹100/mo)';
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

    return navContent;
  };

  const getDaysRemaining = () => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return days > 0 ? days : 0;
  };

  if (loading) return null;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Plan Badge */}
        {open && (
          <div className="px-4 py-3 border-b">
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
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {renderNavItem(item)}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider flex items-center gap-2">
            <span>Premium Features</span>
            {!isPremium && <Sparkles className="h-3 w-3 text-purple-500" />}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {renderNavItem(item)}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
