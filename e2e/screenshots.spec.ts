import { test, expect } from "@playwright/test";

/**
 * Proof Screenshots
 * 
 * Captures screenshots of key pages for documentation.
 * Saves to artifacts/screens/
 */

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

test.describe("Proof Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("screenshot: /dashboard (prefab agent dashboard)", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Wait for stable text to appear
    await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ 
      path: "artifacts/screens/dashboard-agent.png",
      fullPage: true 
    });
    
    // Assert the page rendered correctly
    const heading = page.locator('h1:has-text("Sales Dashboard")');
    await expect(heading).toBeVisible();
  });

  test("screenshot: /pipeline-funnel (funnel with counts)", async ({ page }) => {
    await page.goto("/pipeline-funnel");
    await page.waitForLoadState("networkidle");
    
    // Wait for funnel heading and a count element
    await page.waitForSelector('h1:has-text("Sales Pipeline Funnel")', { timeout: 10000 });
    await page.waitForSelector('[data-testid="funnel-count-working_lead"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ 
      path: "artifacts/screens/pipeline-funnel.png",
      fullPage: true 
    });
    
    // Assert the page rendered correctly
    const heading = page.locator('h1:has-text("Sales Pipeline Funnel")');
    await expect(heading).toBeVisible();
    
    const workingLeadCount = page.getByTestId("funnel-count-working_lead");
    await expect(workingLeadCount).toBeVisible();
  });

  test("screenshot: /manager-dashboard (Today's Priority Deals)", async ({ page }) => {
    await page.goto("/manager-dashboard");
    await page.waitForLoadState("networkidle");
    
    // Wait for stable text
    await page.waitForSelector('h2:has-text("Today\'s Priority Deals")', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ 
      path: "artifacts/screens/manager-dashboard.png",
      fullPage: true 
    });
    
    // Assert the page rendered correctly
    const heading = page.locator('h2:has-text("Today\'s Priority Deals")');
    await expect(heading).toBeVisible();
  });

  test("screenshot: sidebar navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Ensure sidebar is visible
    await page.waitForSelector('[data-sidebar="menu-button"]', { timeout: 10000 });
    
    // Take screenshot focused on sidebar area
    await page.screenshot({ 
      path: "artifacts/screens/sidebar-navigation.png",
      fullPage: false 
    });
  });
});
