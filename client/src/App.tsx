import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import Pipeline from "@/pages/pipeline";
import Automation from "@/pages/automation";
import Settings from "@/pages/settings";
import AdminDashboard from "@/pages/admin";
import SalesDashboard from "@/pages/sales-dashboard";
import ProjectsPage from "@/pages/projects";
import CallbackCalendar from "@/pages/callback-calendar";
import BuilderPage from "@/configurator/BuilderPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/builder" component={BuilderPage} />
      <Route path="/" component={Dashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/sales" component={SalesDashboard} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/callbacks" component={CallbackCalendar} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/automation" component={Automation} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full overflow-hidden">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex-shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
              </header>
              <main className="flex-1 overflow-hidden">
                <div className="h-full w-full overflow-auto">
                  <Router />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
