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
  PieChart,
  ChevronRight,
  Zap
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";

// Core Features (Free)
const coreItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, featureKey: "dashboard" },
  { title: "Bills", url: "/bills", icon: FileText, featureKey: "bills" },
  { title: "Analytics", url: "/analytics", icon: BarChart3, featureKey: "analytics" },
];

// Pro Features
const proItems = [
  { title: "AI Coach", url: "/ai-coach", icon: Brain, featureKey: "ai-coach", isProminent: true, isNew: true },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle, featureKey: "whatsapp", requiredPlan: "pro" as const, isProminent: true },
  { title: "Savings Goals", url: "/savings-goals", icon: Target, featureKey: "savings-goals", requiredPlan: "pro" as const },
  { title: "EMI Manager", url: "/emi-manager", icon: CreditCard, featureKey: "emi-manager", requiredPlan: "pro" as const },
  { title: "Spending Insights", url: "/spending-insights", icon: PieChart, featureKey: "spending-insights", requiredPlan: "pro" as const },
];

// Premium Features - Business Operations
const premiumBusinessItems = [
  { title: "Sales", url: "/sales", icon: ShoppingCart, featureKey: "sales", requiredPlan: "premium" as const },
  { title: "Purchases", url: "/purchases", icon: ShoppingBag, featureKey: "purchases", requiredPlan: "premium" as const },
  { title: "Inventory", url: "/inventory", icon: Package, featureKey: "inventory", requiredPlan: "premium" as const },
  { title: "Expenses", url: "/expenses", icon: Wallet, featureKey: "expenses", requiredPlan: "premium" as const },
];

// Premium Features - GST & Compliance
const premiumGSTItems = [
  { title: "GST Dashboard", url: "/gst", icon: Shield, featureKey: "gst", requiredPlan: "premium" as const, isProminent: true, isNew: true },
];

// Premium Features - Reports & Exports
const premiumReportsItems = [
  { title: "Tax Reports", url: "/reports/tax", icon: Receipt, featureKey: "reports/tax", requiredPlan: "premium" as const },
  { title: "Financial Reports", url: "/reports/financial", icon: BarChart3, featureKey: "reports/financial", requiredPlan: "premium" as const },
  { title: "Exports", url: "/exports", icon: Download, featureKey: "exports", requiredPlan: "premium" as const },
];

const adminItems = [
  { title: "Admin CMS", url: "/admin-cms", icon: Shield, featureKey: "admin-cms" },
  { title: "Sales List", url: "/sales-list", icon: ShoppingCart, featureKey: "sales-list", requiredPlan: "premium" as const },
  { title: "Purchases List", url: "/purchases-list", icon: ShoppingBag, featureKey: "purchases-list", requiredPlan: "premium" as const },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { plan, isPremium, isPro, loading, data } = useEntitlements();
  const { signOut } = useAuth();
  const location = useLocation();
  const [proOpen, setProOpen] = useState(true);
  const [premiumBusinessOpen, setPremiumBusinessOpen] = useState(false);
  const [premiumGSTOpen, setPremiumGSTOpen] = useState(false);
  const [premiumReportsOpen, setPremiumReportsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const hasFeatureAccess = (featureKey: string, requiredPlan?: "pro" | "premium") => {
    if (!requiredPlan) return true;
    if (requiredPlan === 'premium') return plan === 'premium';
    if (requiredPlan === 'pro') return plan === 'pro' || plan === 'premium';
    return true;
  };
  
  const expiresAt = data?.current_period_end;
  const isExpiringSoon = expiresAt 
    ? new Date(expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 
    : false;

  const getNavClassName = ({ isActive }: { isActive: boolean }, isLocked: boolean) =>
    isActive
      ? "bg-gradient-to-r from-primary/20 via-primary/15 to-primary/5 text-primary font-semibold border-l-[4px] border-primary shadow-md shadow-primary/20"
      : isLocked
      ? "opacity-60 cursor-not-allowed hover:bg-muted/30 text-muted-foreground"
      : "hover:bg-gradient-to-r hover:from-muted/70 hover:via-muted/50 hover:to-transparent text-muted-foreground hover:text-foreground transition-all duration-300 hover:shadow-sm";

  const renderNavItem = (item: typeof coreItems[0] & { requiredPlan?: "pro" | "premium"; isProminent?: boolean; isNew?: boolean }, index: number = 0) => {
    const hasAccess = hasFeatureAccess(item.featureKey, item.requiredPlan);
    const isLocked = !hasAccess;
    const isPremiumFeature = item.requiredPlan === 'premium';
    const isProFeature = item.requiredPlan === 'pro';
    const isProminent = (item as any).isProminent && hasAccess;
    const isNew = (item as any).isNew && hasAccess;
    const isAICoach = item.featureKey === 'ai-coach';
    const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + '/');
    const isHovered = hoveredItem === item.featureKey;

    const navContent = (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        onHoverStart={() => setHoveredItem(item.featureKey)}
        onHoverEnd={() => setHoveredItem(null)}
        className="relative"
      >
        <NavLink 
          to={isLocked ? "/upgrade" : item.url} 
          end 
          className={(props) => {
            const baseClass = getNavClassName(props, isLocked);
            if (isAICoach && !isLocked) {
              return props.isActive 
                ? "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white font-semibold border-l-[3px] border-purple-400 shadow-lg shadow-purple-500/30"
                : "bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-transparent text-purple-700 dark:text-purple-400 hover:from-purple-500/20 hover:via-pink-500/20 hover:to-transparent font-medium border-l-[3px] border-purple-500/30 hover:shadow-md hover:shadow-purple-500/10";
            }
            if (isProminent && !isLocked) {
              return props.isActive 
                ? "bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 text-white font-semibold border-l-[3px] border-green-400 shadow-lg shadow-green-500/30"
                : "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-transparent text-green-700 dark:text-green-400 hover:from-green-500/20 hover:via-emerald-500/20 hover:to-transparent font-medium border-l-[3px] border-green-500/30 hover:shadow-md hover:shadow-green-500/10";
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
          <div className="flex items-center gap-3 flex-1 min-w-0 px-3 py-3 rounded-lg transition-all duration-300 group/item hover:scale-[1.02]">
            <motion.div
              animate={{
                scale: isHovered ? 1.1 : 1,
                rotate: isHovered ? (isAICoach ? 5 : 0) : 0,
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <item.icon className={cn(
                "h-4.5 w-4.5 flex-shrink-0 transition-all duration-300", 
                isAICoach && !isLocked && "text-purple-600 dark:text-purple-400 group-hover/item:text-purple-700",
                isProminent && !isLocked && !isAICoach && "text-green-600 dark:text-green-400 group-hover/item:text-green-700",
                isActive && !isAICoach && !isProminent && "text-primary",
                !isActive && !isAICoach && !isProminent && "text-muted-foreground group-hover/item:text-foreground"
              )} />
            </motion.div>
            <AnimatePresence mode="wait">
              {open && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
                >
                  <span className="truncate font-medium text-sm">{item.title}</span>
                  {isPremiumFeature && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Badge 
                        variant="outline" 
                        className="ml-auto shrink-0 h-5 px-2 text-[10px] font-semibold bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50 backdrop-blur-sm"
                      >
                        <Sparkles className="h-2.5 w-2.5 mr-1 animate-pulse" />
                        Premium
                      </Badge>
                    </motion.div>
                  )}
                  {isProFeature && !isPremiumFeature && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Badge 
                        variant="outline" 
                        className="ml-auto shrink-0 h-5 px-2 text-[10px] font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50 backdrop-blur-sm"
                      >
                        Pro
                      </Badge>
                    </motion.div>
                  )}
                  {isNew && !isLocked && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                    >
                      <Badge variant="outline" className={cn(
                        "shrink-0 h-5 px-2 text-[10px] font-semibold backdrop-blur-sm",
                        isAICoach 
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-lg shadow-purple-500/30"
                          : "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50"
                      )}>
                        New
                      </Badge>
                    </motion.div>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
            {isLocked && (
              <motion.div
                animate={{ rotate: isHovered ? [0, -10, 10, -10, 0] : 0 }}
                transition={{ duration: 0.5 }}
              >
                <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </motion.div>
            )}
          </div>
        </NavLink>
      </motion.div>
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

  // Always render sidebar, show loading state instead of hiding
  // This prevents sidebar from disappearing on deployments

  return (
    <Sidebar 
      collapsible="offcanvas" 
      className="md:collapsible-icon border-r-2 border-border/60 backdrop-blur-xl bg-sidebar/98 shadow-2xl z-50"
      style={{ 
        position: 'relative',
        minWidth: open ? '256px' : '64px',
        width: open ? '256px' : '64px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      <SidebarContent className="overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95">
        {/* Plan Badge */}
        <AnimatePresence>
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-4 border-b border-border/50"
            >
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </motion.div>
          ) : open && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="px-4 py-4 border-b border-border/50 bg-gradient-to-b from-sidebar/50 to-transparent"
            >
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Crown className="h-5 w-5 text-primary flex-shrink-0" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Current Plan
                  </p>
                  <Badge 
                    variant={plan === 'premium' ? 'default' : plan === 'pro' ? 'secondary' : 'outline'}
                    className={cn(
                      "text-xs font-semibold px-3 py-1 shadow-md backdrop-blur-sm",
                      plan === 'premium' 
                        ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white border-0 shadow-purple-500/30' 
                        : plan === 'pro'
                        ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white border-0 shadow-blue-500/30'
                        : 'bg-muted/50 border-border/50'
                    )}
                  >
                    {plan === 'premium' ? (
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        Premium
                      </span>
                    ) : plan === 'pro' ? (
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3" />
                        Pro
                      </span>
                    ) : (
                      'Free'
                    )}
                  </Badge>
                </div>
              </div>
              
              {isExpiringSoon && expiresAt && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs text-orange-600 dark:text-orange-400 mt-2 p-2.5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg border border-orange-200 dark:border-orange-800/50 backdrop-blur-sm"
                >
                  <p className="font-semibold">Expires in {getDaysRemaining()} days</p>
                  <NavLink to="/upgrade" className="text-primary hover:underline text-xs mt-1 inline-block font-medium">
                    Renew Now →
                  </NavLink>
                </motion.div>
              )}
              
              {plan === 'free' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <NavLink 
                    to="/upgrade" 
                    className="text-xs text-primary hover:text-primary/80 font-medium mt-2 inline-block transition-colors"
                  >
                    Upgrade to Premium →
                  </NavLink>
                </motion.div>
              )}
              
              <NavLink to="/upgrade" className="block mt-3">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start gap-2.5 text-xs font-medium h-9 border-border/50 bg-sidebar/50 hover:bg-sidebar/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    View & Manage Plans
                  </Button>
                </motion.div>
              </NavLink>
            </motion.div>
          ) : !open && !loading && (
            <div className="px-2 py-2 border-b">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 rounded-lg bg-muted/50 animate-pulse"></div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Loading plan...</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </AnimatePresence>
        
        {!open && !loading && (
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

        {/* Core Features */}
        <SidebarGroup>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <SidebarGroupLabel className="text-xs uppercase tracking-wider px-4 py-2.5 font-semibold text-muted-foreground/80">
                  Core
                </SidebarGroupLabel>
              </motion.div>
            )}
          </AnimatePresence>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {coreItems.map((item, index) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="min-h-[48px] p-0 bg-transparent hover:bg-transparent border-0">
                    {renderNavItem(item, index)}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pro Features - Collapsible */}
        <SidebarGroup>
          <Collapsible open={proOpen} onOpenChange={setProOpen} className="group/collapsible">
            <CollapsibleTrigger asChild>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <SidebarGroupLabel className="text-xs uppercase tracking-wider flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 cursor-pointer group rounded-lg transition-all duration-300 font-semibold text-muted-foreground/80">
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      animate={{ rotate: proOpen ? 0 : [0, 5, -5, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      <Zap className="h-3.5 w-3.5 text-blue-500" />
                    </motion.div>
                    {open && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <span>Pro Features</span>
                        {!isPro && !isPremium && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50 backdrop-blur-sm">
                            Pro
                          </Badge>
                        )}
                      </motion.span>
                    )}
                  </div>
                  <motion.div
                    animate={{ rotate: proOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </motion.div>
                </SidebarGroupLabel>
              </motion.div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <AnimatePresence>
                {proOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SidebarGroupContent>
                      <SidebarMenu className="px-2 space-y-1">
                        {proItems.map((item, index) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild className="min-h-[48px] p-0 bg-transparent hover:bg-transparent border-0">
                              {renderNavItem(item, index + coreItems.length)}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Premium Features - Business Operations - Collapsible */}
        <SidebarGroup>
          <Collapsible open={premiumBusinessOpen} onOpenChange={setPremiumBusinessOpen} className="group/collapsible">
            <CollapsibleTrigger asChild>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <SidebarGroupLabel className="text-xs uppercase tracking-wider flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 cursor-pointer group rounded-lg transition-all duration-300 font-semibold text-muted-foreground/80">
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      animate={{ 
                        rotate: premiumBusinessOpen ? 0 : [0, 5, -5, 0],
                        scale: premiumBusinessOpen ? 1 : [1, 1.1, 1]
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    </motion.div>
                    {open && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <span>Business</span>
                        {!isPremium && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[10px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50 backdrop-blur-sm">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            Premium
                          </Badge>
                        )}
                      </motion.span>
                    )}
                  </div>
                  <motion.div
                    animate={{ rotate: premiumBusinessOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </motion.div>
                </SidebarGroupLabel>
              </motion.div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <AnimatePresence>
                {premiumBusinessOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SidebarGroupContent>
                      <SidebarMenu className="px-2 space-y-1">
                        {premiumBusinessItems.map((item, index) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild className="min-h-[48px] p-0 bg-transparent hover:bg-transparent border-0">
                              {renderNavItem(item, index + coreItems.length + proItems.length)}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Premium Features - GST & Compliance - Collapsible */}
        <SidebarGroup>
          <Collapsible open={premiumGSTOpen} onOpenChange={setPremiumGSTOpen} className="group/collapsible">
            <CollapsibleTrigger asChild>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <SidebarGroupLabel className="text-xs uppercase tracking-wider flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 cursor-pointer group rounded-lg transition-all duration-300 font-semibold text-muted-foreground/80">
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      animate={{ 
                        rotate: premiumGSTOpen ? 0 : [0, 5, -5, 0],
                        scale: premiumGSTOpen ? 1 : [1, 1.1, 1]
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <Shield className="h-3.5 w-3.5 text-purple-500" />
                    </motion.div>
                    {open && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <span>GST & Compliance</span>
                        {!isPremium && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[10px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50 backdrop-blur-sm">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            Premium
                          </Badge>
                        )}
                      </motion.span>
                    )}
                  </div>
                  <motion.div
                    animate={{ rotate: premiumGSTOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </motion.div>
                </SidebarGroupLabel>
              </motion.div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <AnimatePresence>
                {premiumGSTOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SidebarGroupContent>
                      <SidebarMenu className="px-2 space-y-1">
                        {premiumGSTItems.map((item, index) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild className="min-h-[48px] p-0 bg-transparent hover:bg-transparent border-0">
                              {renderNavItem(item, index + coreItems.length + proItems.length + premiumBusinessItems.length)}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Premium Features - Reports & Exports - Collapsible */}
        <SidebarGroup>
          <Collapsible open={premiumReportsOpen} onOpenChange={setPremiumReportsOpen} className="group/collapsible">
            <CollapsibleTrigger asChild>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <SidebarGroupLabel className="text-xs uppercase tracking-wider flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 cursor-pointer group rounded-lg transition-all duration-300 font-semibold text-muted-foreground/80">
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      animate={{ 
                        rotate: premiumReportsOpen ? 0 : [0, 5, -5, 0],
                        scale: premiumReportsOpen ? 1 : [1, 1.1, 1]
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
                    </motion.div>
                    {open && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <span>Reports</span>
                        {!isPremium && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[10px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50 backdrop-blur-sm">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            Premium
                          </Badge>
                        )}
                      </motion.span>
                    )}
                  </div>
                  <motion.div
                    animate={{ rotate: premiumReportsOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </motion.div>
                </SidebarGroupLabel>
              </motion.div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <AnimatePresence>
                {premiumReportsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SidebarGroupContent>
                      <SidebarMenu className="px-2 space-y-1">
                        {premiumReportsItems.map((item, index) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild className="min-h-[48px] p-0 bg-transparent hover:bg-transparent border-0">
                              {renderNavItem(item, index + coreItems.length + proItems.length + premiumBusinessItems.length + premiumGSTItems.length)}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <SidebarGroupLabel className="text-xs uppercase tracking-wider px-4 py-2.5 font-semibold text-muted-foreground/80">
                  System
                </SidebarGroupLabel>
              </motion.div>
            )}
          </AnimatePresence>
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="min-h-[48px] p-0 bg-transparent hover:bg-transparent border-0">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <NavLink 
                      to="/settings" 
                      end 
                      className={(props) => 
                        cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300",
                          props.isActive 
                            ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary font-semibold border-l-[3px] border-primary shadow-sm"
                            : "hover:bg-gradient-to-r hover:from-muted/60 hover:via-muted/40 hover:to-transparent text-muted-foreground hover:text-foreground"
                        )
                      }
                    >
                      <Settings className="h-4.5 w-4.5 flex-shrink-0" />
                      <AnimatePresence>
                        {open && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="font-medium text-sm"
                          >
                            Settings
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  </motion.div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin CMS Section */}
        <SidebarGroup>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <SidebarGroupLabel className="text-xs uppercase tracking-wider flex items-center gap-2.5 px-4 py-2.5 font-semibold text-muted-foreground/80">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Admin</span>
                </SidebarGroupLabel>
              </motion.div>
            )}
          </AnimatePresence>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {adminItems.map((item, index) => {
                const hasAccess = hasFeatureAccess(item.featureKey, item.requiredPlan);
                const isLocked = !hasAccess;
                const isPremiumFeature = item.requiredPlan === 'premium';
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="min-h-[48px] p-0 bg-transparent hover:bg-transparent border-0">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: (index + 1) * 0.05 }}
                      >
                        <NavLink 
                          to={isLocked ? "/upgrade" : item.url} 
                          end 
                          className={(props) => 
                            cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300",
                              props.isActive 
                                ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary font-semibold border-l-[3px] border-primary shadow-sm"
                                : isLocked
                                ? "opacity-50 cursor-not-allowed hover:bg-muted/20 text-muted-foreground"
                                : "hover:bg-gradient-to-r hover:from-muted/60 hover:via-muted/40 hover:to-transparent text-muted-foreground hover:text-foreground"
                            )
                          }
                          onClick={(e) => {
                            if (isLocked) {
                              e.preventDefault();
                              window.location.href = '/upgrade';
                            }
                          }}
                        >
                          <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                          <AnimatePresence>
                            {open && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
                              >
                                <span className="truncate font-medium text-sm">{item.title}</span>
                                {isPremiumFeature && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                  >
                                    <Badge 
                                      variant="outline" 
                                      className="ml-auto shrink-0 h-5 px-2 text-[10px] font-semibold bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50 backdrop-blur-sm"
                                    >
                                      <Sparkles className="h-2.5 w-2.5 mr-1 animate-pulse" />
                                      Premium
                                    </Badge>
                                  </motion.div>
                                )}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          {isLocked && (
                            <motion.div
                              animate={{ rotate: hoveredItem === item.featureKey ? [0, -10, 10, -10, 0] : 0 }}
                              transition={{ duration: 0.5 }}
                            >
                              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            </motion.div>
                          )}
                        </NavLink>
                      </motion.div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-auto border-t border-border/50 pt-3 px-4 pb-4 bg-gradient-to-t from-sidebar/50 to-transparent"
        >
          <motion.div
            whileHover={{ scale: 1.02, x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className={cn(
                "w-full justify-start gap-3 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 rounded-lg transition-all duration-300",
                !open && "justify-center px-2"
              )}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    Sign Out
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </motion.div>
      </SidebarContent>
    </Sidebar>
  );
}
