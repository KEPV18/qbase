import { test, expect } from '@playwright/test';

// ============================================================================
// E2E Tests: Authentication & Login Flow
// ============================================================================

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
    await page.goto('/');
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[type="email"]', 'ibnkhaled16@gmail.com');
    await page.fill('input[type="password"]', 'Batman2026!');
    
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
  });

  test('should maintain session after refresh', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'ibnkhaled16@gmail.com');
    await page.fill('input[type="password"]', 'Batman2026!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Refresh page
    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'ibnkhaled16@gmail.com');
    await page.fill('input[type="password"]', 'Batman2026!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Click logout (assuming there's a logout button in the header/menu)
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    if (await logoutButton.isVisible({ timeout: 2000 })) {
      await logoutButton.click();
      await expect(page).toHaveURL(/.*login/);
    }
  });
});