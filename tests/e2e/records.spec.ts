import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './credentials';
import { QUICK_JUMP, selectOptionByText } from './quickJump';

// ============================================================================
// E2E Tests: Record CRUD Operations
// ============================================================================

test.describe('Records - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should create a new F/40 record', async ({ page }) => {
    // Navigate to create form page
    await page.goto('/form/F/40');
    await expect(page.locator('text=Training Needs Analysis')).toBeVisible({ timeout: 10000 });
    
    // Fill required fields
    await page.fill('input[name="serial"]', 'F/40-TEST-001');
    await page.fill('input[name="date"]', '01/01/2026');
    await page.fill('input[name="project_scope"]', 'Test Project Scope');
    await page.fill('input[name="coverage_period"]', 'January 2026');
    await page.fill('input[name="record_month"]', '01/2026');
    await page.fill('input[name="prepared_by"]', 'Test User');
    await page.fill('input[name="reviewed_by"]', 'Review User');
    await page.fill('input[name="reviewed_on"]', '01/01/2026');
    await page.fill('input[name="authorised_by"]', 'Auth User');
    
    // Add an item row
    await page.click('button:has-text("Add Row")');
    await page.fill('input[name="items.0.designation"]', 'Engineer');
    await page.fill('input[name="items.0.qualReq"]', 'Bachelor');
    await page.fill('input[name="items.0.qualAvail"]', 'Bachelor');
    await page.fill('input[name="items.0.expReq"]', '2 years');
    await page.fill('input[name="items.0.expAvail"]', '3 years');
    await page.fill('input[name="items.0.expNote"]', 'Note');
    await page.fill('input[name="items.0.skillReq"]', 'Skill');
    await page.fill('input[name="items.0.skillAvail"]', 'Skill');
    await page.fill('input[name="items.0.skillNote"]', 'Note');
    
    // Save
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    // Should redirect to record view
    await expect(page).toHaveURL(/records\/F\/40-TEST-001/);
    await expect(page.locator('text=F/40-TEST-001')).toBeVisible({ timeout: 5000 });
  });

  test('should view an existing F/40 record', async ({ page }) => {
    // Navigate to existing record
    await page.goto('/records/F/40-001');
    await expect(page.locator('text=F/40-001')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Training Needs Analysis')).toBeVisible();
  });

  test('should edit an existing record', async ({ page }) => {
    await page.goto('/records/F/40-001');
    await expect(page.locator('text=F/40-001')).toBeVisible({ timeout: 10000 });
    
    // Click edit button
    await page.click('button:has-text("Edit")');
    
    // Modify a field
    await page.fill('input[name="project_scope"]', 'Updated Project Scope');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify update
    await expect(page.locator('text=Updated Project Scope')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate via Quick-Jump dropdown', async ({ page }) => {
    await page.goto('/records/F/40-001');
    await expect(page.locator('text=F/40-001')).toBeVisible({ timeout: 10000 });
    
    // Find and click the Quick-Jump dropdown
    const dropdown = page.locator(QUICK_JUMP);
    await expect(dropdown).toBeVisible();
    
    // Select another record
    await selectOptionByText(dropdown, 'F/40-002');
    
    // Should navigate to F/40-002
    await expect(page).toHaveURL(/records\/F\/40-002/);
    await expect(page.locator('text=F/40-002')).toBeVisible({ timeout: 5000 });
  });
});