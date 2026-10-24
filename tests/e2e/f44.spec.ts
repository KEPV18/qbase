import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './credentials';
import { QUICK_JUMP, selectOptionByText } from './quickJump';

// ============================================================================
// E2E Tests: F/44 PDF vs Text Record Rendering
// ============================================================================

test.describe('F/44 - PDF and Text Records', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', E2E_PASSWORD);
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
    
    const dropdown = page.locator(QUICK_JUMP);
    await expect(dropdown).toBeVisible();
    
    // Check optgroup structure
    const optgroups = page.locator('optgroup');
    await expect(optgroups).toHaveCount(2);
    
    // First group: the text records.
    //
    // The labels used to carry a 📝 / 📕 badge; the control now says what
    // the two groups ARE — "Standard QMS Records (Digital Tables)" and
    // "Digitized Assets (Uploaded PDFs)" — so the assertion follows the
    // control rather than a decoration that is no longer there.
    await expect(optgroups.nth(0)).toHaveAttribute('label', /Standard QMS Records/);
    
    // Second group: the PDF records
    await expect(optgroups.nth(1)).toHaveAttribute('label', /Digitized Assets/);
  });

  test('should navigate between text and PDF records via Quick-Jump', async ({ page }) => {
    await page.goto('/records/F/44-001');
    await expect(page.locator('text=F/44-001')).toBeVisible({ timeout: 10000 });
    
    const dropdown = page.locator(QUICK_JUMP);
    
    // Navigate to a PDF record
    await selectOptionByText(dropdown, 'F/44-003');
    
    await expect(page).toHaveURL(/records\/F\/44-003/);
    await expect(page.locator('object[type="application/pdf"], iframe').first()).toBeVisible({ timeout: 10000 });
  });
});