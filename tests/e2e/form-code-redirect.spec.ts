import { test, expect } from '@playwright/test';

// ============================================================================
// E2E Tests: FormCodeRedirect (/records/F/40 → /records/F/40-001)
// ============================================================================

test.describe('FormCodeRedirect', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'ibnkhaled16@gmail.com');
    await page.fill('input[type="password"]', 'Batman2026!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect /records/F/40 to first F/40 record', async ({ page }) => {
    await page.goto('/records/F/40');
    
    // Should redirect to first F/40 record
    await expect(page).toHaveURL(/records\/F\/40-001/);
    await expect(page.locator('text=F/40-001')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect /records/F/30 to first F/30 record', async ({ page }) => {
    await page.goto('/records/F/30');
    
    await expect(page).toHaveURL(/records\/F\/30-001/);
    await expect(page.locator('text=F/30-001')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect /records/F/44 to first F/44 record', async ({ page }) => {
    await page.goto('/records/F/44');
    
    await expect(page).toHaveURL(/records\/F\/44-001/);
    await expect(page.locator('text=F/44-001')).toBeVisible({ timeout: 10000 });
  });

  test('should not redirect when navigating to specific serial', async ({ page }) => {
    await page.goto('/records/F/40-002');
    
    // Should stay on F/40-002
    await expect(page).toHaveURL(/records\/F\/40-002/);
    await expect(page.locator('text=F/40-002')).toBeVisible({ timeout: 10000 });
  });

  test('unauthenticated user should be redirected to login', async ({ page }) => {
    // Clear cookies to simulate unauthenticated user
    await page.context().clearCookies();
    
    await page.goto('/records/F/40');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});