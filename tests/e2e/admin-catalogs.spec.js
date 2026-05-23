import { test, expect } from '@playwright/test';
const RUN = !!process.env.E2E_BASE_URL;

test.describe('US4 Admin catalogs', () => {
  test.skip(!RUN, 'Set E2E_BASE_URL + seed Supabase + seed catalog');

  test('PIN gate then tab switch', async ({ page }) => {
    await page.goto('/pages/admin.html');
    await page.locator('#pinInput').fill('1234');
    await page.locator('#pinSubmit').click();
    await expect(page.locator('#adminRoot')).toBeVisible();
    await page.locator('[data-tab="catalogos"]').click();
    await expect(page.locator('#tabContent')).toContainText('Líneas');
  });
});
