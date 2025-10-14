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
  Crown
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
import { usePlanGating } from "@/hooks/usePlanGating";
import { Badge } from "@/components/ui/badge";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, featureKey: "dashboard" },
  { title: "Bills", url: "/bills", icon: FileText, featureKey: "bills" },
  { title: "Sales", url: "/sales", icon: ShoppingCart, featureKey: "sales", requiredPlan: "pro" as const },
  { title: "Purchases", url: "/purchases", icon: ShoppingBag, featureKey: "purchases", requiredPlan: "pro" as const },
  { title: "Inventory", url: "/inventory", icon: Package, featureKey: "inventory", requiredPlan: "premium" as const },
  { title: "Expenses", url: "/expenses", icon: Wallet, featureKey: "expenses" },
];

const secondaryItems = [
  { title: "Tax Reports", url: "/reports/tax", icon: Receipt, featureKey: "reports/tax", requiredPlan: "premium" as const },
  { title: "Financial Reports", url: "/reports/financial", icon: BarChart3, featureKey: "reports/financial", requiredPlan: "premium" as const },
  { title: "Exports", url: "/exports", icon: Download, featureKey: "exports", requiredPlan: "premium" as const },
  { title: "Settings", url: "/settings", icon: Settings, featureKey: "settings" },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { hasFeatureAccess, plan } = usePlanGating();

  const getNavClassName = ({ isActive }: { isActive: boolean }, isLocked: boolean) =>
    isActive
      ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
      : isLocked
      ? "opacity-50 cursor-not-allowed hover:bg-muted/30 text-muted-foreground"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  const renderNavItem = (item: typeof mainItems[0]) => {
    const hasAccess = hasFeatureAccess(item.featureKey);
    const isLocked = !hasAccess;

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
        <item.icon className="h-4 w-4" />
        {open && (
          <span className="flex items-center gap-2 flex-1">
            {item.title}
            {isLocked && <Lock className="h-3 w-3" />}
          </span>
        )}
        {!open && isLocked && <Lock className="h-3 w-3 absolute right-1 top-1" />}
      </NavLink>
    );

    if (isLocked) {
      const planName = item.requiredPlan === 'premium' ? 'Premium' : 'Pro';
      return (
        <Tooltip key={item.title}>
          <TooltipTrigger asChild>
            <div className="relative">
              {navContent}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">Requires {planName} plan</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return navContent;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Plan Badge */}
        {open && (
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <div className="flex-1">
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
                  {plan === 'premium' ? 'Premium' : plan === 'pro' ? 'Pro' : 'Free'}
                </Badge>
              </div>
            </div>
            {plan === 'free' && (
              <NavLink 
                to="/upgrade" 
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                Upgrade Now →
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
          <SidebarGroupLabel className="text-xs uppercase tracking-wider">
            More
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
