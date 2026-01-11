import { Switch, Route, useLocation, Redirect } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { routes, isManagerOrAdmin } from "@/lib/routes";
import NotFound from "@/pages/not-found";

/**
 * ======================== ROUTE CATALOG ========================
 * All registered routes in this app (for sidebar/nav reconciliation)
 * 
 * PUBLIC:
 *   /                     → Login page
 *   /login                → Login page (alias)
 *   /builder              → Public 3D building configurator
 * 
 * PROTECTED (any authenticated user):
 *   /dashboard            → Prefab Agent Dashboard (DETERMINISTIC - same for all roles)
 *   /agent-dashboard      → Alias for /dashboard
 *   /my-leads             → SalesDashboard (REP leads table with aging/stage filters)
 *   /sales                → SalesDashboard (alias for /my-leads)
 *   /sales/lead-builder   → CRM Lead Builder (authenticated)
 *   /sales/leads/:id      → Lead detail/edit page
 *   /leads                → Legacy redirect → role-aware leads page (preserves query+hash)
 *   /projects             → Projects page
 *   /callbacks            → Callback calendar
 *   /pipeline             → Pipeline Kanban board
 *   /pipeline-funnel      → Pipeline Funnel view
 *   /automation           → Automation settings
 *   /settings             → User settings
 *   /crm/deals            → CRM Deals list
 *   /crm/deals/:id        → CRM Deal detail
 *   /crm/contacts         → CRM Contacts
 *   /crm/reports          → CRM Reports
 * 
 * MANAGER/ADMIN ONLY:
 *   /manager-dashboard    → Manager Dashboard ("Today's Priority Deals") - REPs redirect to /dashboard
 *   /sales/all-leads      → All leads (manager view)
 *   /crm/admin            → CRM Admin settings
 * 
 * ADMIN ONLY:
 *   /admin                → Admin dashboard/home
 *   /admin/users          → User management
 *   /admin/pricing        → Pricing admin
 *   /users                → Redirect to /admin/users
 * =============================================================
 */

const LazyManagerDashboard = lazy(() => import("@/pages/dashboard"));
const LazySalesDashboard = lazy(() => import("@/pages/sales-dashboard"));
const LazyAgentDashboard = lazy(() => import("@/pages/agent-dashboard"));
const LazyPipeline = lazy(() => import("@/pages/pipeline"));
const LazyPipelineFunnel = lazy(() => import("@/pages/pipeline-funnel"));
const LazyAutomation = lazy(() => import("@/pages/automation"));
const LazySettings = lazy(() => import("@/pages/settings"));
const LazyProjectsPage = lazy(() => import("@/pages/projects"));
const LazyCallbackCalendar = lazy(() => import("@/pages/callback-calendar"));
const LazyAdminDashboard = lazy(() => import("@/pages/admin"));
const LazyAdminUsersPage = lazy(() => import("@/pages/admin-users"));
const LazyPricingAdminPage = lazy(() => import("@/admin/PricingAdminPage"));
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

/**
 * Legacy /leads redirect - preserves query string while redirecting to role-appropriate leads page
 */
function LegacyLeadsRedirect() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    
    // If not logged in, redirect to login with next param
    if (!user) {
      const search = window.location.search || "";
      const hash = window.location.hash || "";
      const targetBase = routes.leadsBaseForRole(undefined); // defaults to /my-leads
      const fullTarget = `${targetBase}${search}${hash}`;
      setLocation(`/login?next=${encodeURIComponent(fullTarget)}`, { replace: true });
      return;
    }
    
    const targetBase = routes.leadsBaseForRole(user?.role);
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const target = `${targetBase}${search}${hash}`;
    
    setLocation(target, { replace: true });
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return <PageLoader />;
  }

  return null;
}

/**
 * Authenticated Dashboard - always renders the prefab agent dashboard
 * This is deterministic: /dashboard ALWAYS shows the agent dashboard regardless of role
 */
function AuthenticatedAgentDashboard() {
  const { isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    setLocation(`/login?next=${encodeURIComponent("/dashboard" + search + hash)}`, { replace: true });
    return <PageLoader />;
  }

  // Always render the prefab agent dashboard
  return <LazyAgentDashboard />;
}

/**
 * Manager Dashboard Route - only for MANAGER/ADMIN roles
 * REPs visiting this route get redirected to /dashboard
 */
function ManagerDashboardRoute() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    setLocation("/login?next=/manager-dashboard", { replace: true });
    return <PageLoader />;
  }

  // REPs get redirected to the main dashboard
  if (!isManagerOrAdmin(user?.role)) {
    setLocation("/dashboard", { replace: true });
    return <PageLoader />;
  }

  // MANAGER/ADMIN get the manager dashboard ("Today's Priority Deals")
  return <LazyManagerDashboard />;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/builder">{() => <LazyBuilderPage />}</Route>
        <Route path="/">{() => <LazyLoginPage />}</Route>
        <Route path="/login">{() => <LazyLoginPage />}</Route>
        <Route path="/dashboard">{() => <AuthenticatedAgentDashboard />}</Route>
        <Route path="/agent-dashboard">{() => <AuthenticatedAgentDashboard />}</Route>
        <Route path="/manager-dashboard">{() => <ManagerDashboardRoute />}</Route>
        <Route path="/admin">{() => <AdminRoute><LazyAdminDashboard /></AdminRoute>}</Route>
        <Route path="/admin/users">{() => <AdminRoute><LazyAdminUsersPage /></AdminRoute>}</Route>
        <Route path="/users">{() => <Redirect to="/admin/users" />}</Route>
        <Route path="/admin/pricing">{() => <AdminRoute><LazyPricingAdminPage /></AdminRoute>}</Route>
        <Route path="/sales/lead-builder">{() => <ProtectedRoute><LazyBuilderPage mode="crm" /></ProtectedRoute>}</Route>
        <Route path="/sales/leads/:id">{() => <LazyLeadEditPage />}</Route>
        <Route path="/sales/all-leads">{() => <ManagerOrAdminRoute><LazyLeadsPage /></ManagerOrAdminRoute>}</Route>
        <Route path="/leads">{() => <LegacyLeadsRedirect />}</Route>
        <Route path="/sales">{() => <LazySalesDashboard />}</Route>
        <Route path="/my-leads">{() => <LazySalesDashboard />}</Route>
        <Route path="/projects">{() => <LazyProjectsPage />}</Route>
        <Route path="/callbacks">{() => <LazyCallbackCalendar />}</Route>
        <Route path="/pipeline">{() => <LazyPipeline />}</Route>
        <Route path="/pipeline-funnel">{() => <ProtectedRoute><LazyPipelineFunnel /></ProtectedRoute>}</Route>
        <Route path="/automation">{() => <LazyAutomation />}</Route>
        <Route path="/settings">{() => <LazySettings />}</Route>
        <Route path="/crm/deals">{() => <LazyCrmDealsPage />}</Route>
        <Route path="/crm/deals/:id">{() => <LazyCrmDealDetailPage />}</Route>
        <Route path="/crm/contacts">{() => <LazyCrmContactsPage />}</Route>
        <Route path="/crm/reports">{() => <LazyCrmReportsPage />}</Route>
        <Route path="/crm/admin">{() => <ManagerOrAdminRoute><LazyCrmAdminPage /></ManagerOrAdminRoute>}</Route>
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
