import { test, expect } from '@playwright/test';

// ============================================================================
// E2E Tests: F/44 PDF vs Text Record Rendering
// ============================================================================

test.describe('F/44 - PDF and Text Records', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'ibnkhaled16@gmail.com');
    await page.fill('input[type="password"]', 'Batman2026!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should render text-based F/44 record (F/44-001)', async ({ page }) => {
    await page.goto('/records/F/44-001');
    await expect(page.locator('text=F/44-001')).toBeVisible({ timeout: 10000 });
    
    // Should show Word-style form with employee info
    await expect(page.locator('text=Employee Name')).toBeVisible();
    await expect(page.locator('text=Responsibilities')).toBeVisible();
    
    // Should NOT show PDF embed
    await expect(page.locator('object[type="application/pdf"], iframe')).not.toBeVisible();
  });

  test('should render PDF-based F/44 record (e.g., F/44-003)', async ({ page }) => {
    await page.goto('/records/F/44-003');
    await expect(page.locator('text=F/44-003')).toBeVisible({ timeout: 10000 });
    
    // Should show PDF embed
    const pdfEmbed = page.locator('object[type="application/pdf"], iframe').first();
    await expect(pdfEmbed).toBeVisible({ timeout: 10000 });
  });

  test('Quick-Jump dropdown should have Text/PDF optgroup separation', async ({ page }) => {
    await page.goto('/records/F/44-001');
    await expect(page.locator('text=F/44-001')).toBeVisible({ timeout: 10000 });
    
    const dropdown = page.locator('select').first();
    await expect(dropdown).toBeVisible();
    
    // Check optgroup structure
    const optgroups = page.locator('optgroup');
    await expect(optgroups).toHaveCount(2);
    
    // First group: Text Records
    await expect(optgroups.nth(0)).toHaveAttribute('label', /📝/);
    
    // Second group: PDF Records
    await expect(optgroups.nth(1)).toHaveAttribute('label', /📕/);
  });

  test('should navigate between text and PDF records via Quick-Jump', async ({ page }) => {
    await page.goto('/records/F/44-001');
    await expect(page.locator('text=F/44-001')).toBeVisible({ timeout: 10000 });
    
    const dropdown = page.locator('select').first();
    
    // Navigate to a PDF record
    await dropdown.selectOption({ label: /📕.*F\/44-003/ });
    
    await expect(page).toHaveURL(/records\/F\/44-003/);
    await expect(page.locator('object[type="application/pdf"], iframe').first()).toBeVisible({ timeout: 10000 });
  });
});