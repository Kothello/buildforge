import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";

const LazyDashboard = lazy(() => import("@/pages/dashboard"));
const LazyPipeline = lazy(() => import("@/pages/pipeline"));
const LazyAutomation = lazy(() => import("@/pages/automation"));
const LazySettings = lazy(() => import("@/pages/settings"));
const LazyProjectsPage = lazy(() => import("@/pages/projects"));
const LazyCallbackCalendar = lazy(() => import("@/pages/callback-calendar"));
const LazyAdminDashboard = lazy(() => import("@/pages/admin"));
const LazyPricingAdminPage = lazy(() => import("@/admin/PricingAdminPage"));
const LazySalesDashboard = lazy(() => import("@/pages/sales-dashboard"));
const LazyLeadEditPage = lazy(() => import("@/pages/lead-edit"));
const LazyBuilderPage = lazy(() => import("@/configurator/BuilderPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/builder">{() => <LazyBuilderPage />}</Route>
        <Route path="/">{() => <LazyDashboard />}</Route>
        <Route path="/admin">{() => <LazyAdminDashboard />}</Route>
        <Route path="/admin/pricing">{() => <LazyPricingAdminPage />}</Route>
        <Route path="/sales/leads/:id">{() => <LazyLeadEditPage />}</Route>
        <Route path="/sales">{() => <LazySalesDashboard />}</Route>
        <Route path="/projects">{() => <LazyProjectsPage />}</Route>
        <Route path="/callbacks">{() => <LazyCallbackCalendar />}</Route>
        <Route path="/pipeline">{() => <LazyPipeline />}</Route>
        <Route path="/automation">{() => <LazyAutomation />}</Route>
        <Route path="/settings">{() => <LazySettings />}</Route>
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
      <SidebarProvider defaultOpen={false} style={style as React.CSSProperties}>
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
