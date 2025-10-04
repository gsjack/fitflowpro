/**
 * Visual Regression Test Helpers
 *
 * Reusable utilities for visual regression tests including:
 * - Login/logout helpers
 * - Navigation helpers
 * - Screenshot utilities
 * - Wait for stable rendering
 */

import { Page, expect } from '@playwright/test';

const TEST_USER = {
  email: 'visual-test@fitflow.test',
  password: 'VisualTest123!',
};

/**
 * Login helper for visual regression tests
 * Registers user if login fails (idempotent)
 */
export async function loginUser(page: Page): Promise<void> {
  console.log('🔐 Logging in test user...');

  // Navigate to app
  await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for auth screen to render
  await page.waitForSelector('text=FitFlow Pro', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Make sure we're on Login tab
  const loginTab = page.locator('button').filter({ hasText: /^Login$/i }).first();
  await loginTab.click();
  await page.waitForTimeout(500);

  // Fill login form
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(TEST_USER.email);
  await passwordInput.fill(TEST_USER.password);

  // Click submit button
  const submitButton = page.locator('button').filter({ hasText: /^Login$/i }).last();
  await submitButton.click();

  // Wait for navigation
  await page.waitForTimeout(3000);

  // Check if login succeeded
  const bodyText = await page.textContent('body');
  const isLoggedIn =
    bodyText?.includes('Dashboard') ||
    bodyText?.includes('Analytics') ||
    bodyText?.includes('Home');

  if (!isLoggedIn) {
    console.log('⚠️  Login failed, attempting registration...');

    // Go back to auth screen
    await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=FitFlow Pro', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Click Register tab
    const registerTab = page.locator('button').filter({ hasText: /^Register$/i }).first();
    await registerTab.click();
    await page.waitForTimeout(500);

    // Fill registration form
    const regEmailInput = page.locator('input[type="email"]').first();
    const regPasswordInput = page.locator('input[type="password"]').first();

    await regEmailInput.fill(TEST_USER.email);
    await regPasswordInput.fill(TEST_USER.password);

    // Click Create Account button
    const createButton = page.locator('button').filter({ hasText: /^Create Account$/i }).first();
    await createButton.click();

    await page.waitForTimeout(3000);
  }

  console.log('✅ User logged in successfully');
}

/**
 * Navigate to a specific tab/screen
 */
export async function navigateToTab(page: Page, tabName: string): Promise<void> {
  const tab = page
    .locator('[role="tab"]')
    .filter({ hasText: new RegExp(tabName, 'i') })
    .first();

  await tab.click({ timeout: 5000 });
  await waitForStableRender(page);
}

/**
 * Wait for rendering to stabilize before taking screenshots
 * This ensures animations complete and layout is final
 */
export async function waitForStableRender(page: Page): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    console.log('⚠️  Network not fully idle, continuing...');
  });

  // Wait for animations to complete
  await page.waitForTimeout(1500);

  // Wait for any pending state updates
  await page.evaluate(() => {
    return new Promise((resolve) => {
      // Use requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(resolve as IdleRequestCallback);
      } else {
        setTimeout(resolve, 100);
      }
    });
  });
}

/**
 * Take a screenshot with proper name sanitization
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: {
    fullPage?: boolean;
    mask?: string[];
  }
): Promise<void> {
  const sanitizedName = name.toLowerCase().replace(/\s+/g, '-');

  const maskLocators = options?.mask?.map((selector) => page.locator(selector)) || [];

  await expect(page).toHaveScreenshot(`${sanitizedName}.png`, {
    fullPage: options?.fullPage ?? true,
    mask: maskLocators,
  });
}

/**
 * Scroll and wait for stable render
 */
export async function scrollAndWait(page: Page, yOffset: number): Promise<void> {
  await page.evaluate((y) => window.scrollBy(0, y), yOffset);
  await page.waitForTimeout(800);
}

/**
 * Go to home screen (Dashboard)
 */
export async function goToHome(page: Page): Promise<void> {
  const homeTab = page
    .locator('[role="tab"]')
    .filter({ hasText: /dashboard|home/i })
    .first();

  await homeTab.click({ timeout: 5000 });
  await waitForStableRender(page);
}
