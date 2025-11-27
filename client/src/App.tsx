import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import Pipeline from "@/pages/pipeline";
import Automation from "@/pages/automation";
import Settings from "@/pages/settings";
import ProjectsPage from "@/pages/projects";
import CallbackCalendar from "@/pages/callback-calendar";
import NotFound from "@/pages/not-found";

const LazyAdminDashboard = lazy(() => import("@/pages/admin"));
const LazyPricingAdminPage = lazy(() => import("@/admin/PricingAdminPage"));
const LazySalesDashboard = lazy(() => import("@/pages/sales-dashboard"));
const LazyBuilderPage = lazy(() => import("@/configurator/BuilderPage"));

const AdminDashboardWrapper = () => <LazyAdminDashboard />;
const PricingAdminPageWrapper = () => <LazyPricingAdminPage />;
const SalesDashboardWrapper = () => <LazySalesDashboard />;
const BuilderPageWrapper = () => <LazyBuilderPage />;

function Router() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <Switch>
        <Route path="/builder" component={BuilderPageWrapper} />
        <Route path="/" component={Dashboard} />
        <Route path="/admin" component={AdminDashboardWrapper} />
        <Route path="/admin/pricing" component={PricingAdminPageWrapper} />
        <Route path="/sales" component={SalesDashboardWrapper} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/callbacks" component={CallbackCalendar} />
        <Route path="/pipeline" component={Pipeline} />
        <Route path="/automation" component={Automation} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <TooltipProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <header className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b bg-background sticky top-0 z-10 flex-shrink-0">
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
  );
}

export default App;
