import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Home, LayoutGrid, Settings, User, Zap, Shield, Users, Building2, Calendar, FileText, BarChart3, Contact } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const prefetchMap: Record<string, () => void> = {
  "/": () => import("@/pages/dashboard"),
  "/sales/all-leads": () => import("@/pages/leads"),
  "/sales": () => import("@/pages/sales-dashboard"),
  "/my-leads": () => import("@/pages/sales-dashboard"),
  "/admin": () => import("@/pages/admin"),
  "/pipeline": () => import("@/pages/pipeline"),
  "/automation": () => import("@/pages/automation"),
  "/settings": () => import("@/pages/settings"),
  "/projects": () => import("@/pages/projects"),
  "/callbacks": () => import("@/pages/callback-calendar"),
  "/crm/deals": () => import("@/pages/crm-deals"),
  "/crm/contacts": () => import("@/pages/crm-contacts"),
  "/crm/reports": () => import("@/pages/crm-reports"),
  "/crm/admin": () => import("@/pages/crm-admin"),
};

const crmItems = [
  {
    title: "Deals",
    url: "/crm/deals",
    icon: FileText,
  },
  {
    title: "Contacts",
    url: "/crm/contacts",
    icon: Contact,
  },
  {
    title: "Reports",
    url: "/crm/reports",
    icon: BarChart3,
  },
  {
    title: "CRM Settings",
    url: "/crm/admin",
    icon: Settings,
  },
];

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Admin",
    url: "/admin",
    icon: Shield,
  },
  {
    title: "Leads",
    url: "/sales/all-leads",
    icon: Users,
    adminOnly: true,
  },
  {
    title: "My Leads",
    url: "/my-leads",
    icon: Users,
    requiresAuth: true,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: Building2,
  },
  {
    title: "Callbacks",
    url: "/callbacks",
    icon: Calendar,
  },
  {
    title: "Pipeline",
    url: "/pipeline",
    icon: LayoutGrid,
  },
  {
    title: "Automation",
    url: "/automation",
    icon: Zap,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">SF</span>
          </div>
          <div>
            <h2 className="font-bold text-base">SteelFlow One</h2>
            <p className="text-xs text-muted-foreground">Premium CRM</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmItems
                .filter((item) => item.title !== "CRM Settings" || user?.role === "ADMIN")
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      onMouseEnter={() => prefetchMap[item.url]?.()}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter((item) => {
                  if (item.title === "Leads") return user?.role === "ADMIN" || user?.role === "MANAGER";
                  if (item.title === "Admin") return user?.role === "ADMIN";
                  return true;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                      onMouseEnter={() => prefetchMap[item.url]?.()}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "Guest"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || "Not logged in"}</p>
          </div>
          {isAuthenticated && (
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
