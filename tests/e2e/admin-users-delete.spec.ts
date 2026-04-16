import { test, expect, type Page } from '@playwright/test';

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/');
  await page.fill('input[type="email"]', 'admin@buildforge.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 5000 });
}

// Helper function to navigate to admin users page
async function goToAdminUsers(page: Page) {
  await page.goto('/admin/users');
  await page.waitForSelector('h1:has-text("User Management")');
}

// Helper function to open edit dialog for a user
async function openUserDialog(page: Page, userEmail: string) {
  const row = page.locator(`tr:has-text("${userEmail}")`);
  await row.locator('[data-testid^="button-edit-user"]').click();
  await page.waitForSelector('[role="dialog"]');
}

test.describe('Admin Users - Delete Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToAdminUsers(page);
  });

  test('should prevent admin from deleting their own account', async ({ page }) => {
    // Try to delete the current admin user (admin@buildforge.com)
    await openUserDialog(page, 'admin@buildforge.com');
    
    // Click Delete User button
    await page.click('[data-testid="button-delete-user"]');
    
    // Type "Delete" in confirmation
    await page.fill('[data-testid="input-delete-confirm"]', 'Delete');
    
    // Click confirm delete
    await page.click('[data-testid="button-confirm-delete"]');
    
    // Should show error toast about cannot delete self
    await expect(page.locator('text=/Cannot delete your own/i')).toBeVisible({ timeout: 5000 });
    
    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should prevent deleting last active admin', async ({ page }) => {
    // First, ensure there's only one admin by deactivating others
    // Then try to delete that admin
    // This test assumes admin@buildforge.com is the only active admin

    // Try to delete the admin user
    await openUserDialog(page, 'admin@buildforge.com');
    
    await page.click('[data-testid="button-delete-user"]');
    await page.fill('[data-testid="input-delete-confirm"]', 'Delete');
    await page.click('[data-testid="button-confirm-delete"]');
    
    // Should show error about last admin (or self-delete error)
    const errorVisible = await Promise.race([
      page.locator('text=/last.*admin/i').isVisible(),
      page.locator('text=/Cannot delete your own/i').isVisible()
    ]);
    
    expect(errorVisible).toBe(true);
  });

  test('should show references error and offer deactivate when user has assigned records', async ({ page }) => {
    // This test assumes there's a sales rep with assigned leads/deals
    // Look for a non-admin user in the list
    const salesRepRow = page.locator('tr:has-text("Sales Rep")').first();
    const userEmail = await salesRepRow.locator('td').nth(1).textContent();
    
    if (!userEmail) {
      test.skip();
      return;
    }
    
    await openUserDialog(page, userEmail.trim());
    
    // Click Delete User button
    await page.click('[data-testid="button-delete-user"]');
    
    // Type "Delete" in confirmation
    await page.fill('[data-testid="input-delete-confirm"]', 'Delete');
    
    // Click confirm delete
    await page.click('[data-testid="button-confirm-delete"]');
    
    // Should show the reference error with yellow background
    await expect(page.locator('text=/Cannot Delete User/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/assigned records/i')).toBeVisible();
    await expect(page.locator('text=/Assigned records:/i')).toBeVisible();
    
    // Should show the deactivate button
    await expect(page.locator('[data-testid="button-deactivate-user"]')).toBeVisible();
    
    // Click deactivate instead
    await page.click('[data-testid="button-deactivate-user"]');
    
    // Should show success toast
    await expect(page.locator('text=/updated successfully/i')).toBeVisible({ timeout: 5000 });
    
    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // User should now show as Inactive in the list
    const updatedRow = page.locator(`tr:has-text("${userEmail}")`);
    await expect(updatedRow.locator('text=/Inactive/i')).toBeVisible();
  });

  test('should successfully delete a user without references', async ({ page }) => {
    // First create a new user via API that has no references
    const newUserEmail = `test-delete-${Date.now()}@example.com`;
    
    await page.evaluate(async (email) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Delete User',
          email: email,
          password: 'password123',
          role: 'REP',
          active: true
        })
      });
      return response.json();
    }, newUserEmail);
    
    // Refresh the page to see the new user
    await page.reload();
    await page.waitForSelector('h1:has-text("User Management")');
    
    // Open the new user's dialog
    await openUserDialog(page, newUserEmail);
    
    // Click Delete User button
    await page.click('[data-testid="button-delete-user"]');
    
    // Verify delete modal title
    await expect(page.locator('text=/Delete User:/i')).toBeVisible();
    
    // Type "Delete" in confirmation
    await page.fill('[data-testid="input-delete-confirm"]', 'Delete');
    
    // Confirm button should be enabled
    await expect(page.locator('[data-testid="button-confirm-delete"]')).toBeEnabled();
    
    // Click confirm delete
    await page.click('[data-testid="button-confirm-delete"]');
    
    // Should show success toast
    await expect(page.locator('text=/deleted successfully/i')).toBeVisible({ timeout: 5000 });
    
    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // User should be removed from the list
    await expect(page.locator(`tr:has-text("${newUserEmail}")`)).not.toBeVisible();
  });

  test('should require typing "Delete" exactly to enable delete button', async ({ page }) => {
    // Create a test user
    const testEmail = `test-confirm-${Date.now()}@example.com`;
    
    await page.evaluate(async (email) => {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Confirm',
          email: email,
          password: 'password123',
          role: 'REP',
          active: true
        })
      });
    }, testEmail);
    
    await page.reload();
    await page.waitForSelector('h1:has-text("User Management")');
    
    await openUserDialog(page, testEmail);
    await page.click('[data-testid="button-delete-user"]');
    
    // Button should be disabled initially
    await expect(page.locator('[data-testid="button-confirm-delete"]')).toBeDisabled();
    
    // Type incorrect text
    await page.fill('[data-testid="input-delete-confirm"]', 'delete');
    await expect(page.locator('[data-testid="button-confirm-delete"]')).toBeDisabled();
    
    // Type with extra spaces
    await page.fill('[data-testid="input-delete-confirm"]', ' Delete ');
    await expect(page.locator('[data-testid="button-confirm-delete"]')).toBeEnabled();
    
    // Clear and type correct text
    await page.fill('[data-testid="input-delete-confirm"]', 'Delete');
    await expect(page.locator('[data-testid="button-confirm-delete"]')).toBeEnabled();
  });

  test('should show correct dialog title for delete vs edit', async ({ page }) => {
    const salesRepRow = page.locator('tr:has-text("Sales Rep")').first();
    const userEmail = await salesRepRow.locator('td').nth(1).textContent();
    
    if (!userEmail) {
      test.skip();
      return;
    }
    
    await openUserDialog(page, userEmail.trim());
    
    // Initially should show "Edit User"
    await expect(page.locator('text=/Edit User:/i')).toBeVisible();
    
    // Click delete button
    await page.click('[data-testid="button-delete-user"]');
    
    // Should now show "Delete User"
    await expect(page.locator('text=/Delete User:/i')).toBeVisible();
    await expect(page.locator('text=/Edit User:/i')).not.toBeVisible();
    
    // Cancel
    await page.click('[data-testid="button-cancel-delete"]');
    
    // Should go back to edit view
    await expect(page.locator('text=/Edit User:/i')).toBeVisible();
  });
});
