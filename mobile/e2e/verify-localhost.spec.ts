/**
 * Verification Test - Check what actually renders on http://localhost:8081/
 *
 * This test captures screenshots to verify actual rendering behavior
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:8081';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/verification');

test.describe('Localhost:8081 Verification', () => {
  test('should capture homepage screenshot', async ({ page }) => {
    // Navigate to homepage
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Wait for React to load
    await page.waitForTimeout(2000);

    // Capture full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-homepage.png'),
      fullPage: true
    });

    // Get page title
    const title = await page.title();
    console.log('[Verification] Page title:', title);

    // Check for any error messages in the page
    const errorText = await page.locator('body').textContent();
    console.log('[Verification] Page content preview:', errorText?.substring(0, 200));

    // Capture console logs and errors
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Reload to capture console output
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('[Verification] Console messages:', consoleMessages.length);
    console.log('[Verification] Console errors:', consoleErrors.length);

    if (consoleErrors.length > 0) {
      console.log('[Verification] First 5 console errors:');
      consoleErrors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    // Take another screenshot after reload
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-homepage-after-reload.png'),
      fullPage: true
    });
  });

  test('should test login navigation', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Look for login-related elements
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login")').first();
    const loginInput = page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="username" i]').first();

    const hasLoginButton = await loginButton.count() > 0;
    const hasLoginInput = await loginInput.count() > 0;

    console.log('[Verification] Has login button:', hasLoginButton);
    console.log('[Verification] Has login input:', hasLoginInput);

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-login-check.png'),
      fullPage: true
    });

    // Try to navigate to /login directly
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-login-route.png'),
      fullPage: true
    });

    const loginUrl = page.url();
    console.log('[Verification] Login URL:', loginUrl);
  });

  test('should check all routes', async ({ page }) => {
    const routes = ['/', '/login', '/register', '/workout', '/analytics', '/planner', '/settings'];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const url = page.url();
      const title = await page.title();

      console.log(`[Verification] Route ${route} -> ${url} (title: ${title})`);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `route-${route.replace(/\//g, '_') || 'root'}.png`),
        fullPage: true
      });
    }
  });
});
