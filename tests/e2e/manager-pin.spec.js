import { test, expect } from '@playwright/test';
const RUN = !!process.env.E2E_BASE_URL;

test.describe('US4 manager PIN', () => {
  test.skip(!RUN, 'Set E2E_BASE_URL + seed manager catalog');

  test('rejects an invalid PIN with the expected error', async ({ page }) => {
    await page.goto('/pages/admin.html');
    await page.locator('#pinInput').fill('0000');
    await page.locator('#pinSubmit').click();
    await expect(page.locator('#pinError')).toContainText('inválido');
  });
});
