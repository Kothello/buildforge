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
import { Home, LayoutGrid, Settings, User, Zap, Shield, Users, Building2, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const prefetchMap: Record<string, () => void> = {
  "/": () => import("@/pages/dashboard"),
  "/sales": () => import("@/pages/sales-dashboard"),
  "/admin": () => import("@/pages/admin"),
  "/pipeline": () => import("@/pages/pipeline"),
  "/automation": () => import("@/pages/automation"),
  "/settings": () => import("@/pages/settings"),
  "/projects": () => import("@/pages/projects"),
  "/callbacks": () => import("@/pages/callback-calendar"),
};

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
    title: "My Leads",
    url: "/sales",
    icon: Users,
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
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Sales Rep</p>
            <p className="text-xs text-muted-foreground truncate">rep@steelflow.com</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
