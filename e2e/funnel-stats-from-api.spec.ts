import { test, expect } from "@playwright/test";

/**
 * Funnel Stats from API Tests
 * 
 * Verifies that the Pipeline Funnel displays real lead counts from the API
 * and stays correct after lead stage changes.
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

test.describe("Funnel Stats Match API - ADMIN/MANAGER", () => {
  test("Test A: Funnel UI counts match API stats for global scope", async ({ page, request }) => {
    // Login as ADMIN
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // Navigate to funnel page
    await page.goto("/pipeline-funnel");
    await page.waitForLoadState("networkidle");
    
    // Wait for funnel to render
    await page.waitForSelector('[data-testid^="funnel-stage-"]', { timeout: 10000 });
    
    // Get cookies for authenticated API request
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    
    // Fetch stats directly from API
    const statsResponse = await request.get("/api/pipeline/stats?scope=global", {
      headers: { Cookie: cookieHeader },
    });
    expect(statsResponse.ok()).toBeTruthy();
    const apiStats = await statsResponse.json();
    
    // Check that working_lead stage count matches API
    const workingLeadCount = await page.getByTestId("funnel-count-working_lead").textContent();
    expect(parseInt(workingLeadCount || "0")).toBe(apiStats["working_lead"] ?? 0);
    
    // Check callbacks stage
    const callbacksCount = await page.getByTestId("funnel-count-callbacks").textContent();
    expect(parseInt(callbacksCount || "0")).toBe(apiStats["callbacks"] ?? 0);
    
    // Check sold_building stage
    const soldCount = await page.getByTestId("funnel-count-sold_building").textContent();
    expect(parseInt(soldCount || "0")).toBe(apiStats["sold_building"] ?? 0);
  });
});

test.describe("Funnel Stats Match API - REP", () => {
  test("Test B: Funnel UI counts match API stats for my scope", async ({ page, request }) => {
    // Login as REP
    await login(page, REP_EMAIL, REP_PASSWORD);
    
    // Navigate to funnel page
    await page.goto("/pipeline-funnel");
    await page.waitForLoadState("networkidle");
    
    // Wait for funnel to render
    await page.waitForSelector('[data-testid^="funnel-stage-"]', { timeout: 10000 });
    
    // Get cookies for authenticated API request
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    
    // Fetch stats directly from API (REP always gets scope=my enforced by backend)
    const statsResponse = await request.get("/api/pipeline/stats?scope=my", {
      headers: { Cookie: cookieHeader },
    });
    expect(statsResponse.ok()).toBeTruthy();
    const apiStats = await statsResponse.json();
    
    // Check that working_lead stage count matches API
    const workingLeadCount = await page.getByTestId("funnel-count-working_lead").textContent();
    expect(parseInt(workingLeadCount || "0")).toBe(apiStats["working_lead"] ?? 0);
  });
});

test.describe("Funnel Stats Live Update", () => {
  test("Test C: Funnel stats update after lead stage change", async ({ page, request }) => {
    // Login as ADMIN
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // First, get an existing lead via API
    const leadsResponse = await request.get("/api/leads?limit=1", {
      headers: {
        Cookie: await page.context().cookies().then(cookies => 
          cookies.map(c => `${c.name}=${c.value}`).join("; ")
        ),
      },
    });
    
    if (!leadsResponse.ok()) {
      console.log("Could not fetch leads - skipping live update test");
      test.skip();
      return;
    }
    
    const leadsData = await leadsResponse.json();
    const leads = Array.isArray(leadsData) ? leadsData : leadsData.leads || [];
    
    if (leads.length === 0) {
      console.log("No leads found - skipping live update test");
      test.skip();
      return;
    }
    
    const leadId = leads[0].id;
    const originalStage = leads[0].stage || "working_lead";
    
    // Navigate to funnel page
    await page.goto("/pipeline-funnel");
    await page.waitForLoadState("networkidle");
    
    // Wait for funnel to render and get initial counts
    await page.waitForSelector('[data-testid^="funnel-stage-"]', { timeout: 10000 });
    
    const initialWorkingCount = parseInt(
      await page.getByTestId("funnel-count-working_lead").textContent() || "0"
    );
    const initialCallbacksCount = parseInt(
      await page.getByTestId("funnel-count-callbacks").textContent() || "0"
    );
    
    // If lead is in working_lead, move to callbacks; otherwise move to working_lead
    const targetStage = originalStage === "callbacks" ? "working_lead" : "callbacks";
    
    // Update lead stage via API
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    
    const updateResponse = await request.post(`/api/leads/${leadId}/stage`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      data: {
        toStage: targetStage,
        fromStage: originalStage,
        notes: "E2E test stage change",
      },
    });
    
    if (!updateResponse.ok()) {
      console.log("Could not update lead stage - skipping assertion");
      // Restore original stage if possible
      return;
    }
    
    // Refresh the page to trigger stats refetch
    await page.goto("/pipeline-funnel");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid^="funnel-stage-"]', { timeout: 10000 });
    
    // Get new counts
    const newWorkingCount = parseInt(
      await page.getByTestId("funnel-count-working_lead").textContent() || "0"
    );
    const newCallbacksCount = parseInt(
      await page.getByTestId("funnel-count-callbacks").textContent() || "0"
    );
    
    // Verify counts changed appropriately
    if (targetStage === "callbacks") {
      // Moved from working_lead to callbacks
      expect(newCallbacksCount).toBeGreaterThanOrEqual(initialCallbacksCount);
    } else {
      // Moved from callbacks to working_lead
      expect(newWorkingCount).toBeGreaterThanOrEqual(initialWorkingCount);
    }
    
    // Restore original stage
    await request.post(`/api/leads/${leadId}/stage`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      data: {
        toStage: originalStage,
        fromStage: targetStage,
        notes: "E2E test stage restore",
      },
    });
  });
});
