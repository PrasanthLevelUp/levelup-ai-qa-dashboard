import { Page, Locator } from '@playwright/test';

/**
 * Wait helpers — explicit, intention-revealing waits.
 * Prefer these over arbitrary `page.waitForTimeout(...)` sleeps.
 */

/** Wait until there are no network connections for at least 500ms. */
export async function waitForNetworkIdle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/** Wait until the DOM content has loaded. */
export async function waitForDomReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
}

/** Wait for a locator to become visible. */
export async function waitForVisible(locator: Locator, timeout = 10_000): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
}

/** Wait for a locator to be detached / hidden (e.g. a spinner disappearing). */
export async function waitForHidden(locator: Locator, timeout = 10_000): Promise<void> {
  await locator.waitFor({ state: 'hidden', timeout });
}

/** Poll a predicate until it returns true or the timeout elapses. */
export async function waitUntil(
  predicate: () => Promise<boolean> | boolean,
  { timeout = 10_000, interval = 250 } = {},
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitUntil: condition not met within ${timeout}ms`);
}
