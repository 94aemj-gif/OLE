import { test, expect } from '@playwright/test';

const RUN = !!process.env.E2E_BASE_URL;

test.describe('US2 Tablero', () => {
  test.skip(!RUN, 'Set E2E_BASE_URL and seed Neon to run');

  test('renders one card per line and a summary strip', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    await expect(page.locator('.line-card')).toHaveCount(2);
    await expect(page.locator('#summaryProduction')).toBeVisible();
  });

  test('refreshes when ⟳ pressed without full page reload', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    await page.locator('#refreshBtn').click();
    await expect(page.locator('.line-card')).toHaveCount(2);
  });
});
