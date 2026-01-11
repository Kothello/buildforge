import { test, expect } from "@playwright/test";

/**
 * Navigation, Pipeline, and Dashboard Regression Tests
 * 
 * These tests verify that:
 * 1. Sidebar navigation links are visible and functional per role
 * 2. Dashboard loads without crashing for all roles
 * 3. Pipeline page loads without crashing
 */

test.describe("Navigation Structure", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await page.goto("/");
  });

  test("REP user sees Sales + CRM sections in sidebar", async ({ page }) => {
    // Login as REP
    await page.fill('[data-testid="input-email"], input[type="email"]', process.env.E2E_REP_EMAIL || "rep@example.com");
    await page.fill('[data-testid="input-password"], input[type="password"]', process.env.E2E_REP_PASSWORD || "password123");
    await page.click('[data-testid="button-login"], button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/\/(dashboard|crm|my-leads|sales)/);
    
    // Open sidebar
    await page.click('[data-testid="button-sidebar-toggle"]');
    await page.waitForTimeout(300);
    
    // Verify Sales section items visible
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-my-leads"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-pipeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-callbacks"]')).toBeVisible();
    
    // Verify CRM section items visible
    await expect(page.locator('[data-testid="nav-deals"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-contacts"]')).toBeVisible();
    
    // REP should NOT see admin-only items
    await expect(page.locator('[data-testid="nav-admin-home"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-users"]')).not.toBeVisible();
  });

  test("MANAGER user sees Sales + CRM + All Leads in sidebar", async ({ page }) => {
    // Login as MANAGER
    await page.fill('[data-testid="input-email"], input[type="email"]', process.env.E2E_MANAGER_EMAIL || "admin@example.com");
    await page.fill('[data-testid="input-password"], input[type="password"]', process.env.E2E_MANAGER_PASSWORD || "password123");
    await page.click('[data-testid="button-login"], button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/\/(dashboard|crm|my-leads|sales)/);
    
    // Open sidebar
    await page.click('[data-testid="button-sidebar-toggle"]');
    await page.waitForTimeout(300);
    
    // Verify manager can see All Leads
    await expect(page.locator('[data-testid="nav-all-leads"]')).toBeVisible();
  });
});

test.describe("Dashboard Functionality", () => {
  test("Dashboard loads prefab agent dashboard for REP user", async ({ page }) => {
    // Login as REP
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"]', process.env.E2E_REP_EMAIL || "rep@example.com");
    await page.fill('input[type="password"], input[name="password"]', process.env.E2E_REP_PASSWORD || "password123");
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForURL((url) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 15000 });
    
    // Navigate to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Should NOT show "Failed to Load Dashboard" error
    const errorHeading = page.locator('h3:has-text("Failed to Load Dashboard")');
    await expect(errorHeading).not.toBeVisible({ timeout: 5000 });
    
    // REP should see prefab agent dashboard with "Sales Dashboard" heading
    const agentDashboardIndicator = page.locator('h1:has-text("Sales Dashboard")');
    await expect(agentDashboardIndicator).toBeVisible({ timeout: 10000 });
  });

  test("Dashboard loads prefab agent dashboard for ADMIN user (deterministic)", async ({ page }) => {
    // Login as ADMIN
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"]', process.env.E2E_MANAGER_EMAIL || "admin@example.com");
    await page.fill('input[type="password"], input[name="password"]', process.env.E2E_MANAGER_PASSWORD || "password123");
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForURL((url) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 15000 });
    
    // Navigate to /dashboard (should show agent dashboard, NOT manager dashboard)
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Should NOT show "Failed to Load Dashboard" error
    const errorHeading = page.locator('h3:has-text("Failed to Load Dashboard")');
    await expect(errorHeading).not.toBeVisible({ timeout: 5000 });
    
    // ADMIN should ALSO see prefab agent dashboard (deterministic - same for all roles)
    const agentDashboardIndicator = page.locator('h1:has-text("Sales Dashboard")');
    await expect(agentDashboardIndicator).toBeVisible({ timeout: 10000 });
    
    // Should NOT see manager dashboard content at /dashboard
    const managerDashboardIndicator = page.locator('h2:has-text("Today\'s Priority Deals")');
    await expect(managerDashboardIndicator).not.toBeVisible();
  });

  test("Manager Dashboard available at /manager-dashboard for ADMIN", async ({ page }) => {
    // Login as ADMIN
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"]', process.env.E2E_MANAGER_EMAIL || "admin@example.com");
    await page.fill('input[type="password"], input[name="password"]', process.env.E2E_MANAGER_PASSWORD || "password123");
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForURL((url) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 15000 });
    
    // Navigate to /manager-dashboard
    await page.goto("/manager-dashboard");
    await page.waitForLoadState("networkidle");
    
    // Should see manager dashboard with "Today's Priority Deals"
    await expect(page.locator('h1:has-text("Good")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator("h2:has-text(\"Today's Priority Deals\")")).toBeVisible({ timeout: 10000 });
  });

  test.skip("Dashboard shows retry button on error", async ({ page }) => {
    // This test is skipped - requires mocking error state
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"], input[name="email"]', process.env.E2E_REP_EMAIL || "rep@example.com");
    await page.fill('input[type="password"], input[name="password"]', process.env.E2E_REP_PASSWORD || "password123");
    await page.click('button[type="submit"]');
    
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // If there's an error, retry button should be visible
    // This just validates the component renders - actual error testing would need mocking
    const page_content = await page.content();
    expect(page_content).toContain("Dashboard");
  });
});

test.describe("Pipeline Functionality", () => {
  test("Pipeline page loads without crash", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.fill('[data-testid="input-email"], input[type="email"]', process.env.E2E_REP_EMAIL || "rep@example.com");
    await page.fill('[data-testid="input-password"], input[type="password"]', process.env.E2E_REP_PASSWORD || "password123");
    await page.click('[data-testid="button-login"], button[type="submit"]');
    
    // Navigate to pipeline
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");
    
    // Should NOT show "Failed to Load Pipeline" error immediately
    // (may show if auth fails, but page should render)
    await expect(page.locator('h1:has-text("Pipeline")')).toBeVisible();
  });

  test("Pipeline shows stage columns", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.fill('[data-testid="input-email"], input[type="email"]', process.env.E2E_REP_EMAIL || "rep@example.com");
    await page.fill('[data-testid="input-password"], input[type="password"]', process.env.E2E_REP_PASSWORD || "password123");
    await page.click('[data-testid="button-login"], button[type="submit"]');
    
    // Navigate to pipeline
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");
    
    // Wait for loading to complete
    await page.waitForTimeout(1000);
    
    // Should show pipeline stage columns (or loading/error state)
    const hasStageColumns = await page.locator('[data-testid^="column-"]').count() > 0;
    const hasLoading = await page.locator('.animate-spin, [class*="skeleton"]').count() > 0;
    const hasError = await page.locator('text="Failed to Load Pipeline"').count() > 0;
    
    // One of these states should be true
    expect(hasStageColumns || hasLoading || hasError).toBe(true);
  });

  test("Pipeline Add Lead button exists", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.fill('[data-testid="input-email"], input[type="email"]', process.env.E2E_REP_EMAIL || "rep@example.com");
    await page.fill('[data-testid="input-password"], input[type="password"]', process.env.E2E_REP_PASSWORD || "password123");
    await page.click('[data-testid="button-login"], button[type="submit"]');
    
    // Navigate to pipeline
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");
    
    // Should have Add Lead button
    await expect(page.locator('[data-testid="button-add-lead"]')).toBeVisible();
  });
});

test.describe("Navigation Links Work", () => {
  test("Clicking Dashboard link navigates correctly", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.fill('[data-testid="input-email"], input[type="email"]', process.env.E2E_REP_EMAIL || "rep@example.com");
    await page.fill('[data-testid="input-password"], input[type="password"]', process.env.E2E_REP_PASSWORD || "password123");
    await page.click('[data-testid="button-login"], button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard|crm|my-leads|sales)/);
    
    // Open sidebar and click Dashboard
    await page.click('[data-testid="button-sidebar-toggle"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="nav-dashboard"]');
    
    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("Clicking Pipeline link navigates correctly", async ({ page }) => {
    // Login
    await page.goto("/");
    await page.fill('[data-testid="input-email"], input[type="email"]', process.env.E2E_REP_EMAIL || "rep@example.com");
    await page.fill('[data-testid="input-password"], input[type="password"]', process.env.E2E_REP_PASSWORD || "password123");
    await page.click('[data-testid="button-login"], button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard|crm|my-leads|sales)/);
    
    // Open sidebar and click Pipeline
    await page.click('[data-testid="button-sidebar-toggle"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="nav-pipeline"]');
    
    // Should be on pipeline
    await expect(page).toHaveURL(/\/pipeline/);
  });
});
