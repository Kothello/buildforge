import { test, expect } from "@playwright/test";

/**
 * Leads Pagination Tests
 * 
 * Verifies cursor-based pagination works correctly on leads pages.
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

test.describe("Leads Pagination API", () => {
  test("GET /api/leads?paged=1 returns paginated response shape", async ({ page }) => {
    // Login via UI to get proper cookies
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // Fetch paginated leads using page context (has auth cookies)
    const res = await page.request.get("/api/leads?paged=1&limit=10");
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    
    // Verify paginated response shape
    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("nextCursor");
    expect(Array.isArray(data.items)).toBeTruthy();
  });

  test("pagination cursor allows fetching next page", async ({ page }) => {
    // Login via UI
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // Fetch first page with small limit
    const page1Res = await page.request.get("/api/leads?paged=1&limit=5");
    expect(page1Res.ok()).toBeTruthy();
    const page1 = await page1Res.json();
    
    // If there's a next page, fetch it
    if (page1.nextCursor) {
      const page2Res = await page.request.get(`/api/leads?paged=1&limit=5&cursor=${page1.nextCursor}`);
      expect(page2Res.ok()).toBeTruthy();
      const page2 = await page2Res.json();
      
      expect(Array.isArray(page2.items)).toBeTruthy();
      
      // Ensure pages have different items (no overlap)
      if (page1.items.length > 0 && page2.items.length > 0) {
        const page1Ids = new Set(page1.items.map((l: any) => l.id));
        const page2Ids = page2.items.map((l: any) => l.id);
        const overlap = page2Ids.filter((id: string) => page1Ids.has(id));
        expect(overlap.length).toBe(0);
      }
    }
  });

  test("stage filter works with pagination", async ({ page }) => {
    // Login via UI
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // Fetch with stage filter
    const res = await page.request.get("/api/leads?paged=1&limit=10&stage=working_lead");
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBeTruthy();
    
    // All returned items should have the filtered stage (if any are returned)
    for (const lead of data.items) {
      const normalizedStage = lead.stage?.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
      expect(normalizedStage).toBe("working_lead");
    }
  });
});

test.describe("My Leads Page Pagination UI", () => {
  test("my-leads page loads with paginated data", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    
    // Navigate to my-leads
    await page.goto("/my-leads");
    await page.waitForLoadState("networkidle");
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Page should not show "Failed to fetch" or API error messages
    const fetchError = await page.locator("text=Failed to fetch").count();
    expect(fetchError).toBe(0);
  });
});

test.describe("All Leads Page Pagination UI", () => {
  test("all-leads page loads with paginated data for admin", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    // Navigate to all-leads
    await page.goto("/sales/all-leads");
    await page.waitForLoadState("networkidle");
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Page should not show "Failed to fetch" or API error messages
    const fetchError = await page.locator("text=Failed to fetch").count();
    expect(fetchError).toBe(0);
  });
});
