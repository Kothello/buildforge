import { test, expect } from "@playwright/test";

/**
 * Sales Reps Endpoint Authorization Tests
 * 
 * Verifies /api/users/sales-reps is manager/admin-only
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

test.describe("Sales Reps Endpoint Security", () => {
  test("REP cannot access /api/users/sales-reps (403)", async ({ page }) => {
    await login(page, REP_EMAIL, REP_PASSWORD);
    
    const res = await page.request.get("/api/users/sales-reps");
    
    // Should be forbidden for REP
    expect(res.status()).toBe(403);
  });

  test("ADMIN can access /api/users/sales-reps (200)", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    const res = await page.request.get("/api/users/sales-reps");
    
    // Should be allowed for ADMIN
    expect(res.ok()).toBeTruthy();
    
    const data = await res.json();
    
    // Verify response shape
    expect(data).toHaveProperty("reps");
    expect(Array.isArray(data.reps)).toBeTruthy();
    
    // Verify no PII (email) is exposed
    if (data.reps.length > 0) {
      const rep = data.reps[0];
      expect(rep).toHaveProperty("id");
      expect(rep).toHaveProperty("name");
      expect(rep).toHaveProperty("leadCount");
      // Should NOT have email
      expect(rep).not.toHaveProperty("email");
    }
  });

  test("Unauthenticated request returns 401", async ({ request }) => {
    const res = await request.get("/api/users/sales-reps");
    
    // Should be unauthorized
    expect(res.status()).toBe(401);
  });
});
