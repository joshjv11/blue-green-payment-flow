import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  ShoppingBag, 
  Package, 
  Download, 
  Settings,
  Receipt,
  BarChart3
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

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Bills", url: "/bills", icon: FileText },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Purchases", url: "/purchases", icon: ShoppingBag },
  { title: "Inventory", url: "/inventory", icon: Package },
];

const secondaryItems = [
  { title: "Reports", url: "/reports/tax", icon: BarChart3 },
  { title: "Exports", url: "/exports", icon: Download },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClassName}>
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
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
                    <NavLink to={item.url} end className={getNavClassName}>
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
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
