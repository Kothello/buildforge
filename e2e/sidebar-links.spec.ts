import { test, expect, Page } from "@playwright/test";

/**
 * Sidebar Links Regression Test
 * 
 * Verifies that all sidebar links navigate to valid pages (no 404s).
 * Data-driven: collects all visible sidebar hrefs and iterates.
 */

const REP_EMAIL = process.env.E2E_REP_EMAIL || "rep@example.com";
const REP_PASSWORD = process.env.E2E_REP_PASSWORD || "password123";
const MANAGER_EMAIL = process.env.E2E_MANAGER_EMAIL || "admin@example.com";
const MANAGER_PASSWORD = process.env.E2E_MANAGER_PASSWORD || "password123";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  
  // Fill login form
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 10000 });
}

async function collectSidebarLinks(page: Page): Promise<string[]> {
  // Wait for sidebar to be present
  await page.waitForSelector('[data-sidebar="menu-button"], aside a[href^="/"]', { timeout: 10000 });
  
  // Collect all sidebar links using data-sidebar attribute or aside element
  const links = await page.locator('[data-sidebar="menu-button"][href^="/"], aside a[href^="/"]').all();
  const hrefs: string[] = [];
  
  for (const link of links) {
    const href = await link.getAttribute("href");
    if (href && !href.includes("logout")) {
      hrefs.push(href);
    }
  }
  
  return [...new Set(hrefs)]; // Remove duplicates
}

async function verifyLinkNotA404(page: Page, href: string) {
  await page.goto(href);
  await page.waitForLoadState("domcontentloaded");
  
  // Check for 404 indicators
  const pageContent = await page.textContent("body");
  const is404 = 
    pageContent?.toLowerCase().includes("404") &&
    pageContent?.toLowerCase().includes("not found");
  
  // Also check for the NotFound component specifically
  const notFoundHeading = page.locator('h1:has-text("404"), h1:has-text("Not Found"), h2:has-text("Page Not Found")');
  const hasNotFoundHeading = await notFoundHeading.count() > 0;
  
  expect(is404 || hasNotFoundHeading, `Expected ${href} to not be a 404 page`).toBe(false);
  
  // Verify app shell is present (sidebar or main content area exists)
  const hasAppShell = await page.locator('aside, main, [data-testid="button-sidebar-toggle"]').count() > 0;
  expect(hasAppShell, `Expected ${href} to render within app shell`).toBe(true);
}

test.describe("Sidebar Links - REP User", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
  });

  test("all visible sidebar links navigate without 404", async ({ page }) => {
    // Navigate to dashboard first to ensure sidebar is available
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    const hrefs = await collectSidebarLinks(page);
    expect(hrefs.length).toBeGreaterThan(0);
    
    console.log(`REP user sidebar links found: ${hrefs.join(", ")}`);
    
    for (const href of hrefs) {
      await test.step(`Verify ${href} is not 404`, async () => {
        await verifyLinkNotA404(page, href);
      });
    }
  });

  test("dashboard renders prefab-era agent dashboard for REP", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // REP should see agent dashboard with "Sales Dashboard" heading
    const heading = page.locator('h1:has-text("Sales Dashboard")');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("funnel view link exists and navigates correctly", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Open sidebar
    const sidebarTrigger = page.locator('[data-testid="button-sidebar-toggle"]');
    if (await sidebarTrigger.isVisible()) {
      await sidebarTrigger.click();
      await page.waitForTimeout(300);
    }
    
    // Find and click Funnel View link
    const funnelLink = page.locator('[data-testid="nav-funnel-view"]');
    await expect(funnelLink).toBeVisible();
    await funnelLink.click();
    
    // Verify navigation to funnel page
    await page.waitForURL("**/pipeline-funnel**");
    
    // Verify funnel page content
    const funnelHeading = page.locator('h1:has-text("Pipeline Funnel"), h1:has-text("Sales Pipeline Funnel")');
    await expect(funnelHeading).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Sidebar Links - MANAGER User", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MANAGER_EMAIL, MANAGER_PASSWORD);
  });

  test("all visible sidebar links navigate without 404", async ({ page }) => {
    // Navigate to dashboard first
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    const hrefs = await collectSidebarLinks(page);
    expect(hrefs.length).toBeGreaterThan(0);
    
    console.log(`MANAGER user sidebar links found: ${hrefs.join(", ")}`);
    
    for (const href of hrefs) {
      await test.step(`Verify ${href} is not 404`, async () => {
        await verifyLinkNotA404(page, href);
      });
    }
  });

  test("manager sees All Leads link in sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Open sidebar
    const sidebarTrigger = page.locator('[data-testid="button-sidebar-toggle"]');
    if (await sidebarTrigger.isVisible()) {
      await sidebarTrigger.click();
      await page.waitForTimeout(300);
    }
    
    // Manager should see All Leads link
    const allLeadsLink = page.locator('[data-testid="nav-all-leads"]');
    await expect(allLeadsLink).toBeVisible();
  });

  test("funnel stage click navigates to correct leads list", async ({ page }) => {
    await page.goto("/pipeline-funnel");
    await page.waitForLoadState("networkidle");
    
    // Click on a funnel stage (first clickable stage)
    const stageBlock = page.locator('[class*="cursor-pointer"]').first();
    if (await stageBlock.isVisible()) {
      await stageBlock.click();
      
      // Should navigate to leads page with stage filter
      await page.waitForURL((url) => 
        url.pathname.includes("/leads") || url.pathname.includes("/my-leads") || url.pathname.includes("/all-leads")
      );
      
      // Verify not a 404
      const notFoundHeading = page.locator('h1:has-text("404"), h1:has-text("Not Found")');
      await expect(notFoundHeading).not.toBeVisible();
    }
  });
});

test.describe("Pipeline Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
  });

  test("pipeline page has funnel toggle button", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");
    
    // Pipeline page should have a Funnel button in the page header (not sidebar)
    // Use main content area to avoid matching sidebar link
    const funnelButton = page.locator('main a[href="/pipeline-funnel"], main button:has-text("Funnel")').first();
    await expect(funnelButton).toBeVisible({ timeout: 10000 });
  });

  test("funnel page has kanban toggle button", async ({ page }) => {
    await page.goto("/pipeline-funnel");
    await page.waitForLoadState("networkidle");
    
    // Funnel page should have a Kanban button in the page content
    const kanbanButton = page.locator('main a[href="/pipeline"], main button:has-text("Kanban")').first();
    await expect(kanbanButton).toBeVisible({ timeout: 10000 });
  });
});
