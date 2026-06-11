import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage — the foundation every Page Object extends.
 *
 * It wraps the most common Playwright interactions with sensible, explicit
 * waits so your page objects stay small and readable. LevelUp AI recognises
 * this pattern: when Repository Intelligence analyses your repo, generated
 * scripts will extend BasePage and reuse these helpers automatically.
 */
export class BasePage {
  constructor(public readonly page: Page) {}

  /** Navigate to a URL (absolute, or relative to `baseURL` in playwright.config). */
  async navigate(url = '/'): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  /** Wait until an element is attached and visible, then return its Locator. */
  async waitForElement(selector: string, timeout = 10_000): Promise<Locator> {
    const locator = this.page.locator(selector);
    await locator.waitFor({ state: 'visible', timeout });
    return locator;
  }

  /** Type into a field after ensuring it is visible. */
  async fill(selector: string, value: string): Promise<void> {
    const field = await this.waitForElement(selector);
    await field.fill(value);
  }

  /** Click an element after ensuring it is visible. */
  async click(selector: string): Promise<void> {
    const el = await this.waitForElement(selector);
    await el.click();
  }

  /** Get trimmed text content of an element. */
  async getText(selector: string): Promise<string> {
    const el = await this.waitForElement(selector);
    return (await el.textContent())?.trim() ?? '';
  }

  /** True if an element is visible within the timeout (never throws). */
  async isVisible(selector: string, timeout = 5_000): Promise<boolean> {
    try {
      await this.page.locator(selector).waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /** Assert the page title contains the expected substring. */
  async expectTitleContains(text: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(text, 'i'));
  }

  /** Wait for the network to go idle (useful after navigation / SPA loads). */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
}
