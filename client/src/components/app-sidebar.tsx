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
import { Home, LayoutGrid, Settings, User, Zap, Shield, Users, Building2, Calendar, FileText, BarChart3, Contact, Hammer, TrendingDown, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { routes, isManagerOrAdmin } from "@/lib/routes";

const prefetchMap: Record<string, () => void> = {
  "/dashboard": () => import("@/pages/agent-dashboard"),
  "/agent-dashboard": () => import("@/pages/agent-dashboard"),
  "/manager-dashboard": () => import("@/pages/dashboard"),
  "/sales/all-leads": () => import("@/pages/leads"),
  "/sales": () => import("@/pages/sales-dashboard"),
  "/my-leads": () => import("@/pages/sales-dashboard"),
  "/builder": () => import("@/configurator/BuilderPage"),
  "/sales/lead-builder": () => import("@/configurator/BuilderPage"),
  "/admin": () => import("@/pages/admin"),
  "/admin/users": () => import("@/pages/admin-users"),
  "/admin/pricing": () => import("@/admin/PricingAdminPage"),
  "/pipeline": () => import("@/pages/pipeline"),
  "/pipeline-funnel": () => import("@/pages/pipeline-funnel"),
  "/automation": () => import("@/pages/automation"),
  "/settings": () => import("@/pages/settings"),
  "/projects": () => import("@/pages/projects"),
  "/callbacks": () => import("@/pages/callback-calendar"),
  "/crm/deals": () => import("@/pages/crm-deals"),
  "/crm/contacts": () => import("@/pages/crm-contacts"),
  "/crm/reports": () => import("@/pages/crm-reports"),
  "/crm/admin": () => import("@/pages/crm-admin"),
};

// Sales section items - visible to all authenticated users
const salesItems = [
  {
    title: "Dashboard",
    url: routes.dashboard(),
    icon: Home,
  },
  {
    title: "My Leads",
    url: routes.myLeads(),
    icon: Users,
  },
  {
    title: "Lead Builder",
    url: "/sales/lead-builder",
    icon: Hammer,
  },
  {
    title: "Pipeline",
    url: routes.pipeline(),
    icon: LayoutGrid,
  },
  {
    title: "Funnel View",
    url: routes.pipelineFunnel(),
    icon: TrendingDown,
  },
  {
    title: "Callbacks",
    url: "/callbacks",
    icon: Calendar,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: Building2,
  },
];

// Manager items - visible to MANAGER and ADMIN only
const managerItems = [
  {
    title: "All Leads",
    url: routes.allLeads(),
    icon: Users,
  },
  {
    title: "Manager Dashboard",
    url: routes.managerDashboard(),
    icon: BarChart3,
  },
];

// CRM section items
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
    managerOnly: true,
  },
  {
    title: "CRM Settings",
    url: "/crm/admin",
    icon: Settings,
    managerOnly: true,
  },
];

// Admin & Ops section items
const adminItems = [
  {
    title: "Admin Home",
    url: "/admin",
    icon: Shield,
    adminOnly: true,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    managerOnly: true,
  },
  {
    title: "Pricing",
    url: "/admin/pricing",
    icon: Settings,
    adminOnly: true,
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
  const userIsManagerOrAdmin = isManagerOrAdmin(user?.role);

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
        {/* Sales section */}
        <SidebarGroup>
          <SidebarGroupLabel>Sales</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {salesItems.map((item) => (
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
              {/* Manager-only items */}
              {userIsManagerOrAdmin && managerItems.map((item) => (
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

        {/* CRM section */}
        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmItems
                .filter((item: any) => {
                  if (item.managerOnly) return userIsManagerOrAdmin;
                  return true;
                })
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

        {/* Admin & Ops section - filtered by role */}
        <SidebarGroup>
          <SidebarGroupLabel>Admin & Ops</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems
                .filter((item: any) => {
                  if (item.adminOnly) return user?.role === "ADMIN";
                  if (item.managerOnly) return userIsManagerOrAdmin;
                  return true;
                })
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
