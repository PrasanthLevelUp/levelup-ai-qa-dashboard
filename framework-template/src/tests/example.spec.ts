import { test, expect } from '../fixtures/basePage.fixture';
import { assertUrlContains } from '../helpers/assertions';

/**
 * Example spec — demonstrates the framework patterns LevelUp AI follows:
 *   • page objects via fixtures
 *   • helper assertions
 *   • web-first expectations
 *
 * The two "pattern demo" tests run against playwright.dev (no setup needed) so
 * `npm test` passes out of the box. The login flow is skipped by default —
 * point `baseURL` at your app and remove `.skip` to enable it.
 */

test.describe('Framework smoke (runs out of the box)', () => {
  test('navigates and asserts the page title', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    await expect(page).toHaveTitle(/Playwright/);
  });

  test('clicks through navigation using helpers', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    await page.getByRole('link', { name: 'Get started' }).click();
    await assertUrlContains(page, 'intro');
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  });
});

test.describe('Login flow (enable for your app)', () => {
  // Remove `.skip` and set baseURL in playwright.config.ts (or BASE_URL env)
  // to run these against your application.
  test.skip('logs in with valid credentials', async ({ loginPage, dashboardPage }) => {
    await loginPage.open('/');
    await loginPage.login('Admin', 'admin123');
    await dashboardPage.expectLoaded();
    expect(await dashboardPage.isLoggedIn()).toBeTruthy();
  });

  test.skip('shows an error with invalid credentials', async ({ loginPage }) => {
    await loginPage.open('/');
    await loginPage.login('Admin', 'wrong-password');
    expect(await loginPage.getErrorMessage()).not.toEqual('');
  });
});
