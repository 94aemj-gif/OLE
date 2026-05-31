import { test, expect } from '@playwright/test';

const RUN = !!process.env.E2E_BASE_URL;

test.describe('US3 Gráficas', () => {
  test.skip(!RUN, 'Set E2E_BASE_URL and seed Neon to run');

  test('renders KPI ribbon + four chart sections', async ({ page }) => {
    await page.goto('/pages/graficas.html');
    await expect(page.locator('#kpiOee')).toBeVisible();
    await expect(page.locator('#hourlyChart')).toBeVisible();
    await expect(page.locator('#cumulativeChart')).toBeVisible();
    await expect(page.locator('#scrapChart')).toBeVisible();
    await expect(page.locator('#heatmap')).toBeVisible();
  });

  test('end-of-shift popup downloads CSV', async ({ page }) => {
    await page.goto('/pages/graficas.html');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#eosBtn').click();
    await page.getByText('Exportar CSV').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^eos_.*\.csv$/);
  });
});
