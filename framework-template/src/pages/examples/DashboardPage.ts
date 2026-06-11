import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * DashboardPage — example Page Object for the post-login landing page.
 * Demonstrates assertions and reading values from the page.
 */
export class DashboardPage extends BasePage {
  private readonly selectors = {
    header: 'h6.oxd-text, h1, [data-testid="dashboard-header"]',
    userMenu: '.oxd-userdropdown, [data-testid="user-menu"]',
    employeeCount: '[data-testid="employee-count"]',
  };

  constructor(page: Page) {
    super(page);
  }

  /** Assert the dashboard has loaded (header is visible). */
  async expectLoaded(): Promise<void> {
    const header = await this.waitForElement(this.selectors.header);
    await expect(header).toBeVisible();
  }

  /** Returns true when the authenticated user menu is present. */
  async isLoggedIn(): Promise<boolean> {
    return this.isVisible(this.selectors.userMenu);
  }

  /** Example of reading a metric off the dashboard. */
  async getEmployeeCount(): Promise<string> {
    return this.getText(this.selectors.employeeCount);
  }
}
