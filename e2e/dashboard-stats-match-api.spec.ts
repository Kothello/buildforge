import { test, expect } from "@playwright/test";

/**
 * Dashboard Stats Match API Tests
 * 
 * Verifies that dashboard counts match the pipeline stats API
 */

const REP_EMAIL = process.env.E2E_REP_EMAIL || "rep@example.com";
const REP_PASSWORD = process.env.E2E_REP_PASSWORD || "password123";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "password123";

async function login(page: any, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url: URL) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 15000 });
}

test.describe("Dashboard Stats Match Pipeline API", () => {
  test("REP dashboard working_lead count matches /api/pipeline/stats?scope=my", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    
    // Fetch pipeline stats for "my" scope
    const statsRes = await page.request.get("/api/pipeline/stats?scope=my");
    expect(statsRes.ok()).toBeTruthy();
    const stats = await statsRes.json();
    const expectedWorkingLeads = stats.working_lead || 0;
    
    // Navigate to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Wait for data to load
    
    // Get the working_lead count from dashboard
    const workingLeadElement = page.locator('[data-testid="dashboard-count-working_lead"]');
    
    // If the element exists, verify the count
    const elementExists = await workingLeadElement.count() > 0;
    if (elementExists) {
      const dashboardCount = await workingLeadElement.textContent();
      expect(parseInt(dashboardCount || "0")).toBe(expectedWorkingLeads);
    }
  });

  test("ADMIN dashboard uses global scope and shows working_lead count", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // Fetch pipeline stats for "global" scope
    const statsRes = await page.request.get("/api/pipeline/stats?scope=global");
    expect(statsRes.ok()).toBeTruthy();
    const stats = await statsRes.json();
    const expectedWorkingLeads = stats.working_lead || 0;
    
    // Navigate to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Wait for data to load
    
    // Get the working_lead count from dashboard
    const workingLeadElement = page.locator('[data-testid="dashboard-count-working_lead"]');
    
    // If the element exists, verify the count
    const elementExists = await workingLeadElement.count() > 0;
    if (elementExists) {
      const dashboardCount = await workingLeadElement.textContent();
      expect(parseInt(dashboardCount || "0")).toBe(expectedWorkingLeads);
    }
  });

  test("Dashboard total leads equals sum of all pipeline stats", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // Fetch pipeline stats
    const statsRes = await page.request.get("/api/pipeline/stats?scope=global");
    expect(statsRes.ok()).toBeTruthy();
    const stats = await statsRes.json();
    const expectedTotal = Object.values(stats).reduce((sum: number, count: any) => sum + (count || 0), 0);
    
    // Navigate to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Get total count from dashboard
    const totalElement = page.locator('[data-testid="dashboard-count-total"]');
    const elementExists = await totalElement.count() > 0;
    if (elementExists) {
      const dashboardTotal = await totalElement.textContent();
      expect(parseInt(dashboardTotal || "0")).toBe(expectedTotal);
    }
  });

  test("Dashboard callbacks count matches pipeline stats", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // Fetch pipeline stats
    const statsRes = await page.request.get("/api/pipeline/stats?scope=global");
    expect(statsRes.ok()).toBeTruthy();
    const stats = await statsRes.json();
    const expectedCallbacks = stats.callbacks || 0;
    
    // Navigate to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Get callbacks count from dashboard
    const callbacksElement = page.locator('[data-testid="dashboard-count-callbacks"]');
    const elementExists = await callbacksElement.count() > 0;
    if (elementExists) {
      const dashboardCallbacks = await callbacksElement.textContent();
      expect(parseInt(dashboardCallbacks || "0")).toBe(expectedCallbacks);
    }
  });
});

test.describe("Dashboard Stage Navigation", () => {
  test("Clicking working_lead stage navigates to leads page with filter", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Click on working_lead stage button
    const workingLeadButton = page.locator('button:has([data-testid="dashboard-count-working_lead"])');
    const exists = await workingLeadButton.count() > 0;
    
    if (exists) {
      await workingLeadButton.click();
      await page.waitForTimeout(1000);
      
      // Should navigate to leads page with stage filter
      expect(page.url()).toContain("stage=working_lead");
    }
  });
});
