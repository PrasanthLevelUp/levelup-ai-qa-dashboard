import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/examples/LoginPage';
import { DashboardPage } from '../pages/examples/DashboardPage';

/**
 * Custom test fixtures.
 *
 * Extending Playwright's `test` with ready-instantiated page objects keeps
 * specs clean: `test('...', async ({ loginPage }) => { ... })`. Add your own
 * page objects here as your suite grows. LevelUp AI's generated tests will
 * import this `test` so they slot straight into your suite.
 */
type Pages = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from '@playwright/test';
