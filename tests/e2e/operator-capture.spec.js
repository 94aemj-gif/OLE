import { test, expect } from '@playwright/test';

// Smoke e2e for US1. Requires a running dev server + seeded Supabase.
// Skipped automatically when E2E_BASE_URL is unset.
const RUN = !!process.env.E2E_BASE_URL;

test.describe('US1 operator capture', () => {
  test.skip(!RUN, 'Set E2E_BASE_URL and seed Supabase to run');

  test('happy path: enter employee + units → counter increases', async ({ page }) => {
    await page.goto('/pages/index.html?line=L-01');
    await page.getByText('CAPTURAR').click();
    // Numpad employee
    for (const digit of '12345') {
      await page.locator(`.numpad button:has-text("${digit}")`).first().click();
    }
    // Numpad units (second numpad on page)
    const numpads = page.locator('.numpad');
    for (const digit of '240') {
      await numpads.nth(1).locator(`button:has-text("${digit}")`).click();
    }
    await page.getByText('Guardar').click();
    await expect(page.locator('#counterSlot')).toContainText('240');
    await expect(page.locator('#undoChip')).toBeVisible();
  });

  test('invalid employee number shows inline error and blocks save', async ({ page }) => {
    await page.goto('/pages/index.html?line=L-01');
    await page.getByText('CAPTURAR').click();
    for (const digit of '1234') {
      await page
        .locator('.numpad button:has-text("' + digit + '")')
        .first()
        .click();
    }
    await page.getByText('Guardar').click();
    await expect(page.locator('.error-banner')).toBeVisible();
  });
});
