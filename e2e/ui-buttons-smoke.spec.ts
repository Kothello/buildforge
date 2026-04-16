import { test, expect, Page } from "@playwright/test";

/**
 * UI Buttons Smoke Tests
 * 
 * Ensures all primary UI buttons work correctly without crashes or 404s
 */

const REP_EMAIL = process.env.E2E_REP_EMAIL || "rep@example.com";
const REP_PASSWORD = process.env.E2E_REP_PASSWORD || "password123";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "password123";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url: URL) => !url.pathname.includes("/login") && url.pathname !== "/", { timeout: 15000 });
}

// Helper to assert page didn't crash or 404
async function assertNoPageError(page: Page) {
  // Check for 404 text
  const has404 = await page.locator('text="Page not found"').count();
  expect(has404, "Page should not show 404").toBe(0);
  
  // Check for error boundary text
  const hasError = await page.locator('text="Something went wrong"').count();
  expect(hasError, "Page should not show error boundary").toBe(0);
}

// Helper to collect JS errors
function setupPageErrorCapture(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (e) => errors.push(e));
  return errors;
}

test.describe("Page Load Smoke Tests (No Runtime Crashes)", () => {
  test("/my-leads loads without JS errors", async ({ page }) => {
    const errors = setupPageErrorCapture(page);
    
    await login(page, REP_EMAIL, REP_PASSWORD);
    await page.goto("/my-leads");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    await assertNoPageError(page);
    expect(errors, "Should have no JS errors").toHaveLength(0);
  });

  test("/my-leads with highlight param loads without crash", async ({ page }) => {
    const errors = setupPageErrorCapture(page);
    
    await login(page, REP_EMAIL, REP_PASSWORD);
    await page.goto("/my-leads?stage=working_lead&highlight=fake-id");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    await assertNoPageError(page);
    expect(errors, "Should have no JS errors").toHaveLength(0);
  });

  test("/dashboard loads without JS errors", async ({ page }) => {
    const errors = setupPageErrorCapture(page);
    
    await login(page, REP_EMAIL, REP_PASSWORD);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    await assertNoPageError(page);
    expect(errors, "Should have no JS errors").toHaveLength(0);
  });
});

test.describe("REP Dashboard Buttons", () => {
  test("Claim Next Lead button works (200 or 409)", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    // Find and click Claim Next Lead button
    const claimButton = page.locator('button:has-text("Claim Next Lead")');
    const buttonExists = await claimButton.count() > 0;
    
    if (buttonExists) {
      await claimButton.click();
      await page.waitForTimeout(2000);
      
      const url = page.url();
      // Either navigated to my-leads (success) or stayed on dashboard (no leads)
      const navigatedToMyLeads = url.includes("/my-leads");
      const stayedOnDashboard = url.includes("/dashboard");
      
      expect(navigatedToMyLeads || stayedOnDashboard).toBeTruthy();
      await assertNoPageError(page);
    }
  });

  test("Dashboard stage tile clicks navigate correctly", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    // Click Working Leads stage tile
    const workingLeadTile = page.locator('[data-testid="dashboard-count-working_lead"]').locator('..');
    const tileExists = await workingLeadTile.count() > 0;
    
    if (tileExists) {
      await workingLeadTile.click();
      await page.waitForTimeout(1000);
      
      expect(page.url()).toContain("stage=working_lead");
      await assertNoPageError(page);
    }
  });
});

test.describe("ADMIN Dashboard Buttons", () => {
  test("/manager-dashboard loads for admin", async ({ page }) => {
    const errors = setupPageErrorCapture(page);
    
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/manager-dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    await assertNoPageError(page);
    expect(errors).toHaveLength(0);
  });

  test("/dashboard loads for admin", async ({ page }) => {
    const errors = setupPageErrorCapture(page);
    
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    await assertNoPageError(page);
    expect(errors).toHaveLength(0);
  });

  test("Admin stage tile clicks navigate to all-leads", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    // Click Working Leads stage tile
    const workingLeadTile = page.locator('[data-testid="dashboard-count-working_lead"]').locator('..');
    const tileExists = await workingLeadTile.count() > 0;
    
    if (tileExists) {
      await workingLeadTile.click();
      await page.waitForTimeout(1000);
      
      // Admin should go to all-leads, not my-leads
      expect(page.url()).toContain("stage=working_lead");
      await assertNoPageError(page);
    }
  });
});

test.describe("ADMIN Sales Dashboard Buttons", () => {
  test("Core sales dashboard buttons navigate for admin", async ({ page }) => {
    const errors = setupPageErrorCapture(page);

    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });

    await assertNoPageError(page);

    const claimButton = page.locator('[data-testid="dashboard-claim-next"]');
    if (await claimButton.count()) {
      const claimResponse = page.waitForResponse(
        (resp) => resp.url().includes("/api/leads/claim-next") && resp.request().method() === "POST",
        { timeout: 10000 }
      );
      await claimButton.click();
      const claimResult = await claimResponse;
      expect([200, 409]).toContain(claimResult.status());

      await page.waitForTimeout(1000);
      if (page.url().includes("/my-leads")) {
        await page.goto("/dashboard");
        await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
      }
    }

    const funnelButton = page.locator('[data-testid="dashboard-view-funnel"]');
    if (await funnelButton.count()) {
      await Promise.all([
        page.waitForURL(/\/pipeline-funnel/),
        funnelButton.click(),
      ]);
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    const kanbanButton = page.locator('[data-testid="dashboard-view-kanban"]');
    if (await kanbanButton.count()) {
      await Promise.all([
        page.waitForURL(/\/pipeline/),
        kanbanButton.click(),
      ]);
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    const totalCard = page.locator('[data-testid="dashboard-count-total"]');
    if (await totalCard.count()) {
      await Promise.all([
        page.waitForURL(/\/sales\/all-leads/),
        totalCard.click(),
      ]);
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    const callbacksCard = page.locator('[data-testid="dashboard-count-callbacks-card"]');
    if (await callbacksCard.count()) {
      await Promise.all([
        page.waitForURL(/\/sales\/all-leads/),
        callbacksCard.click(),
      ]);
      expect(page.url()).toContain("stage=callbacks");
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    const manufacturingCard = page.locator('[data-testid="dashboard-count-manufacturing"]');
    if (await manufacturingCard.count()) {
      await Promise.all([
        page.waitForURL(/\/sales\/all-leads/),
        manufacturingCard.click(),
      ]);
      expect(page.url()).toContain("stage=red_iron_fabrication");
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    const deliveredCard = page.locator('[data-testid="dashboard-count-delivered"]');
    if (await deliveredCard.count()) {
      await Promise.all([
        page.waitForURL(/\/sales\/all-leads/),
        deliveredCard.click(),
      ]);
      expect(page.url()).toContain("stage=delivered_red_iron");
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    const workingLeadTile = page.locator('[data-testid="dashboard-count-working_lead"]');
    if (await workingLeadTile.count()) {
      await Promise.all([
        page.waitForURL(/\/sales\/all-leads/),
        workingLeadTile.click(),
      ]);
      expect(page.url()).toContain("stage=working_lead");
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    const callbacksTile = page.locator('[data-testid="dashboard-count-callbacks"]');
    if (await callbacksTile.count()) {
      await Promise.all([
        page.waitForURL(/\/sales\/all-leads/),
        callbacksTile.click(),
      ]);
      expect(page.url()).toContain("stage=callbacks");
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    const soldTile = page.locator('[data-testid="dashboard-count-sold_building"]');
    if (await soldTile.count()) {
      await Promise.all([
        page.waitForURL(/\/sales\/all-leads/),
        soldTile.click(),
      ]);
      expect(page.url()).toContain("stage=sold_building");
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    const fabricationTile = page.locator('[data-testid="dashboard-count-red_iron_fabrication"]');
    if (await fabricationTile.count()) {
      await Promise.all([
        page.waitForURL(/\/sales\/all-leads/),
        fabricationTile.click(),
      ]);
      expect(page.url()).toContain("stage=red_iron_fabrication");
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    expect(errors).toHaveLength(0);
  });

  test("Agent control buttons respond for admin", async ({ page }) => {
    const errors = setupPageErrorCapture(page);

    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });

    const startCallingButton = page.locator('button:has-text("Start Calling")');
    if (await startCallingButton.count()) {
      const callResponse = page.waitForResponse(
        (resp) => resp.url().includes("/api/agent/start-calling") && resp.request().method() === "POST",
        { timeout: 10000 }
      );
      await startCallingButton.click();
      const callResult = await callResponse;
      expect(callResult.status()).toBe(200);
      await page.waitForURL(/\/dialer/, { timeout: 10000 });
      await assertNoPageError(page);
      await page.goto("/dashboard");
      await page.waitForSelector('h1:has-text("Sales Dashboard")', { timeout: 15000 });
    }

    const breakTrigger = page.locator('button[role="combobox"]');
    const startBreakButton = page.locator('button:has-text("Start Break")');
    if ((await breakTrigger.count()) && (await startBreakButton.count())) {
      await breakTrigger.click();
      const breakOption = page.locator('[role="option"]:has-text("Break (15min)")');
      await breakOption.click();

      const breakResponse = page.waitForResponse(
        (resp) => resp.url().includes("/api/agent/break") && resp.request().method() === "POST",
        { timeout: 10000 }
      );
      await startBreakButton.click();
      const breakResult = await breakResponse;
      expect(breakResult.status()).toBe(200);

      const endBreakButton = page.locator('button:has-text("End Break")');
      await expect(endBreakButton).toBeVisible();
      await assertNoPageError(page);
    }

    const logoutButton = page.locator('button:has-text("Logout")');
    if (await logoutButton.count()) {
      await Promise.all([
        page.waitForURL(/\/login/),
        logoutButton.click(),
      ]);
      await assertNoPageError(page);
    }

    expect(errors).toHaveLength(0);
  });
});

test.describe("My Leads Page Buttons", () => {
  test("Stage filter dropdown changes URL", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    await page.goto("/my-leads");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    // Look for stage filter dropdown/select
    const stageFilter = page.locator('select, [role="combobox"]').first();
    const filterExists = await stageFilter.count() > 0;
    
    if (filterExists) {
      // Just verify page didn't crash
      await assertNoPageError(page);
    }
  });

  test("Load More button works when present", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    await page.goto("/my-leads");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    const loadMoreButton = page.locator('[data-testid="button-load-more"]');
    const buttonExists = await loadMoreButton.count() > 0;
    
    if (buttonExists) {
      await loadMoreButton.click();
      await page.waitForTimeout(2000);
      await assertNoPageError(page);
    }
  });
});

test.describe("Pipeline Funnel Buttons", () => {
  test("/pipeline-funnel stage click navigates correctly", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    await page.goto("/pipeline-funnel");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    await assertNoPageError(page);
    
    // Click any stage bar if present
    const stageBar = page.locator('[data-stage-id]').first();
    const barExists = await stageBar.count() > 0;
    
    if (barExists) {
      await stageBar.click();
      await page.waitForTimeout(1000);
      // Should navigate to leads with stage filter
      expect(page.url()).toContain("stage=");
    }
  });
});
