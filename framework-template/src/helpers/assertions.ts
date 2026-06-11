import { Page, expect } from '@playwright/test';

/**
 * Assertion helpers — thin, reusable wrappers around Playwright's
 * web-first assertions. They keep tests readable and consistent.
 */

/** Assert an element is visible. */
export async function assertElementVisible(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
}

/** Assert an element is hidden / not present. */
export async function assertElementHidden(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeHidden();
}

/** Assert an element contains the expected text. */
export async function assertTextContains(page: Page, selector: string, text: string): Promise<void> {
  await expect(page.locator(selector)).toContainText(text);
}

/** Assert the current URL contains the expected fragment. */
export async function assertUrlContains(page: Page, fragment: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(fragment));
}

/** Assert an input has the expected value. */
export async function assertInputValue(page: Page, selector: string, value: string): Promise<void> {
  await expect(page.locator(selector)).toHaveValue(value);
}
