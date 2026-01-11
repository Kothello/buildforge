/**
 * Centralized route building - single source of truth for deep links.
 * Prevents route drift by ensuring consistent URL generation.
 */

export type UserRole = "REP" | "MANAGER" | "ADMIN" | "SALES_REP" | "SALES_MANAGER" | string;

/**
 * Check if user has manager or admin privileges
 */
export const isManagerOrAdmin = (role?: string): boolean => {
  if (!role) return false;
  const upperRole = role.toUpperCase();
  return upperRole === "MANAGER" || upperRole === "ADMIN" || upperRole === "SALES_MANAGER";
};

/**
 * Build query string from params, omitting undefined/null/empty values
 */
export const toQuery = (params: Record<string, string | number | boolean | undefined | null>): string => {
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

/**
 * Get the base leads path based on user role
 * - Manager/Admin → /sales/all-leads
 * - REP → /my-leads
 */
export const leadsBaseForRole = (role?: string): string => {
  return isManagerOrAdmin(role) ? "/sales/all-leads" : "/my-leads";
};

/**
 * Build a full leads URL with query params based on user role
 */
export const leadsForRole = (
  role: string | undefined,
  params: { stage?: string; q?: string; [k: string]: string | number | boolean | undefined | null }
): string => {
  return leadsBaseForRole(role) + toQuery(params);
};

/**
 * Exported routes object for consistent access
 */
export const routes = {
  leadsBaseForRole,
  leadsForRole,
  isManagerOrAdmin,
  toQuery,
  
  // Static routes - Dashboards
  dashboard: () => "/dashboard",                    // Canonical: always prefab agent dashboard
  agentDashboard: () => "/agent-dashboard",         // Alias for debugging
  managerDashboard: () => "/manager-dashboard",     // Manager/Admin only: "Today's Priority Deals"
  
  // Static routes - Pipeline
  pipelineFunnel: () => "/pipeline-funnel",
  pipeline: () => "/pipeline",
  
  // Static routes - Leads
  myLeads: () => "/my-leads",
  allLeads: () => "/sales/all-leads",
  
  // Static routes - Other
  callbacks: () => "/callbacks",
  projects: () => "/projects",
  settings: () => "/settings",
  automation: () => "/automation",
  
  // CRM routes
  crmDeals: () => "/crm/deals",
  crmContacts: () => "/crm/contacts",
  crmReports: () => "/crm/reports",
  crmAdmin: () => "/crm/admin",
  
  // Admin routes
  admin: () => "/admin",
  adminUsers: () => "/admin/users",
  adminPricing: () => "/admin/pricing",
};

export default routes;
