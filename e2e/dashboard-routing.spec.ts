import { test, expect } from "@playwright/test";

/**
 * Dashboard Routing Regression Tests
 * 
 * Ensures:
 * 1. /dashboard ALWAYS renders the prefab agent dashboard (regardless of role)
 * 2. /manager-dashboard renders manager dashboard for MANAGER/ADMIN only
 * 3. REP visiting /manager-dashboard gets redirected to /dashboard
 */

const REP_EMAIL = process.env.E2E_REP_EMAIL || "rep@example.com";
const REP_PASSWORD = process.env.E2E_REP_PASSWORD || "password123";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "password123";

test.describe("Dashboard Routing - Deterministic Behavior", () => {
  
  test("Test A: /dashboard renders prefab agent dashboard even as ADMIN", async ({ page }) => {
    // Login as ADMIN
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 10000 });
    
    // Navigate to /dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Should see prefab agent dashboard content (NOT "Today's Priority Deals")
    // Look for agent dashboard specific elements: "Sales Dashboard" header
    const agentDashboardIndicator = page.locator('h1:has-text("Sales Dashboard")');
    await expect(agentDashboardIndicator).toBeVisible({ timeout: 10000 });
    
    // Should NOT see manager dashboard content
    const managerDashboardIndicator = page.locator("text=Today's Priority Deals");
    await expect(managerDashboardIndicator).not.toBeVisible();
  });

  test("Test B: /manager-dashboard renders manager dashboard for ADMIN", async ({ page }) => {
    // Login as ADMIN
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 10000 });
    
    // Navigate to /manager-dashboard
    await page.goto("/manager-dashboard");
    await page.waitForLoadState("networkidle");
    
    // Should see "Today's Priority Deals" (manager dashboard content)
    const managerDashboardIndicator = page.locator("text=Today's Priority Deals");
    await expect(managerDashboardIndicator).toBeVisible({ timeout: 10000 });
  });

  test("Test C: REP visiting /manager-dashboard redirects to /dashboard", async ({ page }) => {
    // Login as REP
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"]', REP_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', REP_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 10000 });
    
    // Try to navigate to /manager-dashboard
    await page.goto("/manager-dashboard");
    await page.waitForLoadState("networkidle");
    
    // Should be redirected to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Should see prefab agent dashboard content
    const agentDashboardIndicator = page.locator('h1:has-text("Sales Dashboard")');
    await expect(agentDashboardIndicator).toBeVisible({ timeout: 10000 });
    
    // Should NOT see manager dashboard content
    const managerDashboardIndicator = page.locator('h2:has-text("Today\'s Priority Deals")');
    await expect(managerDashboardIndicator).not.toBeVisible();
  });

  test("Test D: /dashboard for REP shows prefab agent dashboard", async ({ page }) => {
    // Login as REP
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"]', REP_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', REP_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 10000 });
    
    // Navigate to /dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Should see prefab agent dashboard content
    const agentDashboardIndicator = page.locator('h1:has-text("Sales Dashboard")');
    await expect(agentDashboardIndicator).toBeVisible({ timeout: 10000 });
  });

  test("Test E: Unauthenticated user visiting /dashboard redirects to login", async ({ page }) => {
    // Try to visit /dashboard without logging in
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Should be redirected to login with next param
    await expect(page).toHaveURL(/\/login/);
    
    // URL should contain next param pointing to dashboard
    const url = page.url();
    expect(url).toContain("next=");
  });
});

test.describe("Manager Dashboard Link in Sidebar", () => {
  
  test("ADMIN sees Manager Dashboard link in sidebar", async ({ page }) => {
    // Login as ADMIN
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL((url) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 10000 });
    
    // Open sidebar
    const sidebarTrigger = page.locator('[data-testid="button-sidebar-toggle"]');
    if (await sidebarTrigger.isVisible()) {
      await sidebarTrigger.click();
      await page.waitForTimeout(300);
    }
    
    // Should see Manager Dashboard link
    const managerDashboardLink = page.locator('[data-testid="nav-manager-dashboard"]');
    await expect(managerDashboardLink).toBeVisible();
    
    // Click it and verify navigation
    await managerDashboardLink.click();
    await page.waitForURL(/\/manager-dashboard/);
  });

  test("REP does NOT see Manager Dashboard link in sidebar", async ({ page }) => {
    // Login as REP
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"]', REP_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', REP_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL((url) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 10000 });
    
    // Open sidebar
    const sidebarTrigger = page.locator('[data-testid="button-sidebar-toggle"]');
    if (await sidebarTrigger.isVisible()) {
      await sidebarTrigger.click();
      await page.waitForTimeout(300);
    }
    
    // Should NOT see Manager Dashboard link
    const managerDashboardLink = page.locator('[data-testid="nav-manager-dashboard"]');
    await expect(managerDashboardLink).not.toBeVisible();
  });
});
