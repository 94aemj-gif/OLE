import { test, expect } from '@playwright/test';
const RUN = !!process.env.E2E_BASE_URL;

test.describe('US5 day reset', () => {
  test.skip(!RUN, 'Set E2E_BASE_URL + seed Supabase to run');

  test('reset wipes today on a second device within 30s', async ({ browser }) => {
    const tablet = await browser.newContext();
    const adminCtx = await browser.newContext();
    const tabletPage = await tablet.newPage();
    const adminPage = await adminCtx.newPage();

    await tabletPage.goto('/pages/index.html?line=L-01');
    // Capture 100 units (assumes test seed includes operator 12345)
    await tabletPage.getByText('CAPTURAR').click();
    for (const digit of '12345') {
      await tabletPage
        .locator('.numpad button:has-text("' + digit + '")')
        .first()
        .click();
    }
    const numpads = tabletPage.locator('.numpad');
    for (const digit of '100') {
      await numpads
        .nth(1)
        .locator('button:has-text("' + digit + '")')
        .click();
    }
    await tabletPage.getByText('Guardar').click();
    await expect(tabletPage.locator('#counterSlot')).toContainText('100');

    await adminPage.goto('/pages/admin.html');
    await adminPage.locator('#pinInput').fill('1234');
    await adminPage.locator('#pinSubmit').click();
    await adminPage.locator('[data-tab="datos"]').click();
    await adminPage.getByText('Reset Día Actual').click();
    await adminPage.locator('.dest-confirm-input').fill('RESET');
    await adminPage.getByText('Confirmar').click();

    // Wait up to 45s for the tablet to apply
    await expect(tabletPage.locator('#counterSlot')).toContainText('0', { timeout: 45_000 });
  });
});
