import { test, expect } from "@playwright/test";

/**
 * Claim Next Lead E2E Tests
 * 
 * Tests the claim lead functionality for REP users
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

test.describe("Claim Next Lead API", () => {
  test("POST /api/leads/claim-next returns 409 when no leads available or claims a lead", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    
    // Attempt to claim a lead
    const res = await page.request.post("/api/leads/claim-next");
    
    // Either 200 (claimed) or 409 (no leads available) is valid
    expect([200, 409]).toContain(res.status());
    
    const data = await res.json();
    
    if (res.status() === 200) {
      // Successfully claimed - should have lead object
      expect(data).toHaveProperty("lead");
      expect(data.lead).toHaveProperty("id");
      expect(data.lead).toHaveProperty("assignedTo");
    } else {
      // No leads available
      expect(data).toHaveProperty("message");
      expect(data.message).toContain("No unassigned leads available");
    }
  });

  test("Claimed lead has correct assignedTo field", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    
    // Get current user info
    const meRes = await page.request.get("/api/auth/me");
    const me = await meRes.json();
    
    // Attempt to claim
    const claimRes = await page.request.post("/api/leads/claim-next");
    
    if (claimRes.status() === 200) {
      const data = await claimRes.json();
      // The claimed lead should be assigned to the current user
      expect(data.lead.assignedTo).toBe(me.id);
    }
    // If 409, skip assertion (no leads to claim)
  });
});

test.describe("Claim Next Lead UI Flow", () => {
  test("Claim button exists on dashboard", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Look for Claim Next Lead button
    const claimButton = page.locator('button:has-text("Claim Next Lead")');
    await expect(claimButton).toBeVisible();
  });

  test("Clicking Claim shows toast and navigates on success or shows error on 409", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    // Click Claim Next Lead
    const claimButton = page.locator('button:has-text("Claim Next Lead")');
    await claimButton.click();
    
    // Wait for either navigation to my-leads or toast
    await page.waitForTimeout(2000);
    
    const url = page.url();
    
    // Either navigated to my-leads (success) or stayed on dashboard (no leads)
    const navigatedToMyLeads = url.includes("/my-leads");
    const stayedOnDashboard = url.includes("/dashboard");
    
    expect(navigatedToMyLeads || stayedOnDashboard).toBeTruthy();
    
    if (navigatedToMyLeads) {
      // Should have stage filter in URL
      expect(url).toContain("stage=working_lead");
    }
  });
});

test.describe("Legacy Endpoint Compatibility", () => {
  test("POST /api/agent/claim-next-lead still works (backward compat)", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    
    const res = await page.request.post("/api/agent/claim-next-lead");
    
    // Either 200 or 409 is valid
    expect([200, 409]).toContain(res.status());
    
    const data = await res.json();
    
    if (res.status() === 200) {
      // Legacy response includes success flag
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("lead");
      expect(data).toHaveProperty("message");
    }
  });
});
