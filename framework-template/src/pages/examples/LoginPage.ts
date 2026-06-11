import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * LoginPage — example Page Object.
 *
 * Selectors are grouped in one object so they are easy to maintain and so
 * LevelUp AI can map real DOM locators (from App Profile crawls) onto a clear,
 * named structure. Replace the selector values with the ones for your app.
 */
export class LoginPage extends BasePage {
  private readonly selectors = {
    username: '#username',
    password: '#password',
    loginButton: 'button[type="submit"]',
    errorMessage: '.oxd-alert-content-text, .error-message',
  };

  constructor(page: Page) {
    super(page);
  }

  /** Open the login page (relative to baseURL). */
  async open(path = '/'): Promise<void> {
    await this.navigate(path);
  }

  /** Perform a login with the given credentials. */
  async login(username: string, password: string): Promise<void> {
    await this.fill(this.selectors.username, username);
    await this.fill(this.selectors.password, password);
    await this.click(this.selectors.loginButton);
  }

  /** Read the inline error message (empty string if none shown). */
  async getErrorMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.errorMessage)) {
      return this.getText(this.selectors.errorMessage);
    }
    return '';
  }
}
