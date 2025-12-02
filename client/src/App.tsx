import { Switch, Route, useLocation, Redirect } from "wouter";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";

const LazyDashboard = lazy(() => import("@/pages/dashboard"));
const LazyPipeline = lazy(() => import("@/pages/pipeline"));
const LazyAutomation = lazy(() => import("@/pages/automation"));
const LazySettings = lazy(() => import("@/pages/settings"));
const LazyProjectsPage = lazy(() => import("@/pages/projects"));
const LazyCallbackCalendar = lazy(() => import("@/pages/callback-calendar"));
const LazyAdminDashboard = lazy(() => import("@/pages/admin"));
const LazyAdminUsersPage = lazy(() => import("@/pages/admin-users"));
const LazyPricingAdminPage = lazy(() => import("@/admin/PricingAdminPage"));
const LazySalesDashboard = lazy(() => import("@/pages/sales-dashboard"));
const LazyLeadsPage = lazy(() => import("@/pages/leads"));
const LazyLeadEditPage = lazy(() => import("@/pages/lead-edit"));
const LazyBuilderPage = lazy(() => import("@/configurator/BuilderPage"));
const LazyLoginPage = lazy(() => import("@/pages/login"));
const LazyCrmDealsPage = lazy(() => import("@/pages/crm-deals"));
const LazyCrmDealDetailPage = lazy(() => import("@/pages/crm-deal-detail"));
const LazyCrmContactsPage = lazy(() => import("@/pages/crm-contacts"));
const LazyCrmReportsPage = lazy(() => import("@/pages/crm-reports"));
const LazyCrmAdminPage = lazy(() => import("@/pages/crm-admin"));

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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated && location !== "/" && location !== "/login") {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="text-base font-medium">Access Denied</div>
          <p className="text-muted-foreground text-sm">You need admin privileges to access this page.</p>
          <button
            onClick={() => setLocation("/sales")}
            className="text-primary text-sm underline hover:no-underline"
          >
            Go to My Leads
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ManagerOrAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  if (!isAdminOrManager) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="text-base font-medium">Access Denied</div>
          <p className="text-muted-foreground text-sm">Only managers and admins can view this page.</p>
          <button
            onClick={() => setLocation("/sales")}
            className="text-primary text-sm underline hover:no-underline"
          >
            Go to My Leads
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/builder">{() => <LazyBuilderPage />}</Route>
        <Route path="/">{() => <LazyLoginPage />}</Route>
        <Route path="/dashboard">{() => <LazyDashboard />}</Route>
        <Route path="/admin">{() => <AdminRoute><LazyAdminDashboard /></AdminRoute>}</Route>
        <Route path="/admin/users">{() => <AdminRoute><LazyAdminUsersPage /></AdminRoute>}</Route>
        <Route path="/admin/pricing">{() => <AdminRoute><LazyPricingAdminPage /></AdminRoute>}</Route>
        <Route path="/sales/leads/:id">{() => <LazyLeadEditPage />}</Route>
        <Route path="/sales/all-leads">{() => <ManagerOrAdminRoute><LazyLeadsPage /></ManagerOrAdminRoute>}</Route>
        <Route path="/sales">{() => <LazySalesDashboard />}</Route>
        <Route path="/my-leads">{() => <LazySalesDashboard />}</Route>
        <Route path="/projects">{() => <LazyProjectsPage />}</Route>
        <Route path="/callbacks">{() => <LazyCallbackCalendar />}</Route>
        <Route path="/pipeline">{() => <LazyPipeline />}</Route>
        <Route path="/automation">{() => <LazyAutomation />}</Route>
        <Route path="/settings">{() => <LazySettings />}</Route>
        <Route path="/crm/deals">{() => <LazyCrmDealsPage />}</Route>
        <Route path="/crm/deals/:id">{() => <LazyCrmDealDetailPage />}</Route>
        <Route path="/crm/contacts">{() => <LazyCrmContactsPage />}</Route>
        <Route path="/crm/reports">{() => <LazyCrmReportsPage />}</Route>
        <Route path="/crm/admin">{() => <AdminRoute><LazyCrmAdminPage /></AdminRoute>}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (location === "/" || location === "/login") {
    return (
      <Suspense fallback={<PageLoader />}>
        <LazyLoginPage />
      </Suspense>
    );
  }

  if (location === "/builder") {
    return (
      <Suspense fallback={<PageLoader />}>
        <LazyBuilderPage />
      </Suspense>
    );
  }

  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
