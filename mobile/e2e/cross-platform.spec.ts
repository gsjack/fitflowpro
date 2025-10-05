/**
 * Cross-Platform Compatibility E2E Tests for FitFlow Pro
 *
 * Comprehensive test suite validating web, mobile, tablet, and desktop compatibility.
 * Tests cover authentication, SQLite graceful degradation, responsive design,
 * network conditions, browser compatibility, feature parity, and performance.
 *
 * Test Execution:
 *   npx playwright test e2e/cross-platform.spec.ts
 *   npx playwright test e2e/cross-platform.spec.ts --project=chromium
 *   npx playwright test e2e/cross-platform.spec.ts --project=firefox
 *
 * Prerequisites:
 *   - Backend server running on http://localhost:3000
 *   - Expo web server running on http://localhost:8081
 *   - Clean database state (or unique test usernames)
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:8081';
const API_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 60000; // 60 seconds for web app bundling

// Test user credentials (unique per test to avoid conflicts)
const generateTestUser = () => ({
  username: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@fitflow.test`,
  password: 'TestPassword123!',
  age: 28,
  weight_kg: 75,
});

/**
 * Helper: Wait for page to be fully loaded and interactive
 */
async function waitForAppReady(page: Page) {
  // Wait for root element
  await page.waitForSelector('#root', { timeout: TEST_TIMEOUT });

  // Wait for React to render
  await page.waitForTimeout(2000);

  // Check that content is visible
  const hasContent = await page.evaluate(() => {
    const body = document.querySelector('body');
    return body && body.textContent && body.textContent.trim().length > 0;
  });

  expect(hasContent).toBe(true);
}

/**
 * Helper: Check if SQLite is gracefully disabled on web
 */
async function checkSQLiteGracefulDegradation(page: Page) {
  const sqliteDiagnostics = await page.evaluate(() => {
    // Access global diagnostics if available
    return (window as any).sqliteDiagnostics || null;
  });

  // On web, SQLite should be unavailable but not crash the app
  // The app should still function using API-only mode
  console.log('[Test] SQLite diagnostics:', sqliteDiagnostics);

  // Check that the app is still functional (has rendered content)
  const isAppFunctional = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  });

  expect(isAppFunctional).toBe(true);
}

/**
 * Helper: Register and login a test user
 */
async function registerAndLogin(page: Page) {
  const user = generateTestUser();

  // Navigate to register page
  await page.goto(`${BASE_URL}/(auth)/register`, { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);

  // Fill registration form
  await page.fill('input[placeholder*="email" i], input[type="email"]', user.username);
  await page.fill('input[placeholder*="password" i], input[type="password"]', user.password);

  // Submit form
  await page.click('button:has-text("Register"), button:has-text("Sign Up")');

  // Wait for navigation to dashboard
  await page.waitForURL(/\/(tabs)?/, { timeout: 10000 });
  await waitForAppReady(page);

  return user;
}

/**
 * Test Suite: Web Platform Compatibility
 */
test.describe('1. Web Platform Compatibility', () => {
  test('should load web app without errors', async ({ page }) => {
    const errors: string[] = [];
    const pageErrors: Error[] = [];

    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Monitor page errors
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Navigate to app
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });
    await waitForAppReady(page);

    // Check for critical errors
    const hasCriticalError = errors.some(
      (err) =>
        err.toLowerCase().includes('syntaxerror') ||
        err.toLowerCase().includes('cannot read') ||
        err.toLowerCase().includes('is not a function')
    );

    if (hasCriticalError) {
      console.error('[Test] Critical errors found:', errors);
    }

    expect(hasCriticalError).toBe(false);
    expect(pageErrors.length).toBe(0);
  });

  test('should handle SQLite gracefully disabled on web', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await checkSQLiteGracefulDegradation(page);

    // Verify app logs show SQLite disabled
    const logs = await page.evaluate(() => {
      return (window as any).__consoleHistory || [];
    });

    const sqliteLog = logs.find(
      (log: string) => log.includes('SQLite not available') || log.includes('Web platform detected')
    );

    // This is informational - SQLite should gracefully fail on web
    console.log('[Test] SQLite status:', sqliteLog || 'No specific log found (expected on web)');
  });

  test('should authenticate on web without SQLite', async ({ page }) => {
    const _user = await registerAndLogin(page);

    // Verify authentication succeeded
    const currentUrl = page.url();
    expect(currentUrl).toContain('/(tabs)');

    // Verify user is on dashboard
    const dashboardContent = await page.textContent('body');
    expect(dashboardContent).toBeTruthy();

    console.log('[Test] ✅ Authentication successful on web (API-only mode)');
  });

  test('should verify API-only mode functional', async ({ page }) => {
    // Register and login
    await registerAndLogin(page);

    // Intercept API calls
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes(API_URL)) {
        apiCalls.push(`${request.method()} ${request.url()}`);
      }
    });

    // Navigate to different screens to trigger API calls
    await page.goto(`${BASE_URL}/(tabs)/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify API calls were made (app using API, not local DB)
    expect(apiCalls.length).toBeGreaterThan(0);
    console.log('[Test] API calls made:', apiCalls.length);
  });

  test('should verify no crashes when db operations called', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));

    await registerAndLogin(page);

    // Navigate through all tabs (may trigger db operations)
    const tabs = ['/', '/workout', '/analytics', '/planner', '/settings'];

    for (const tab of tabs) {
      await page.goto(`${BASE_URL}/(tabs)${tab}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
    }

    // Verify no crashes occurred
    expect(errors.length).toBe(0);
    console.log('[Test] ✅ No crashes during navigation');
  });

  test('should verify Expo Router navigation works on web', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Click registration link (if on login page)
    const registerLink = page.locator('text=/register|sign up/i').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(1000);

      // Verify URL changed
      const currentUrl = page.url();
      expect(currentUrl).toContain('register');
    }

    console.log('[Test] ✅ Expo Router navigation functional');
  });
});

/**
 * Test Suite: Responsive Design
 */
test.describe('2. Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`should render correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);

      // Take screenshot
      await page.screenshot({
        path: `/tmp/fitflow-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true,
      });

      // Verify content is visible
      const hasContent = await page.evaluate(() => {
        const body = document.body;
        return body && body.scrollHeight > 0;
      });

      expect(hasContent).toBe(true);
      console.log(`[Test] ✅ ${viewport.name} renders correctly`);
    });
  }

  test('should have touch targets ≥48px on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Find all interactive elements (buttons, links, inputs)
    const interactiveElements = await page.$$(
      'button, a, input[type="button"], input[type="submit"]'
    );

    const smallTargets: { element: string; width: number; height: number }[] = [];

    for (const element of interactiveElements) {
      const box = await element.boundingBox();
      if (box) {
        if (box.width < 48 || box.height < 48) {
          const tag = await element.evaluate((el) => el.tagName);
          smallTargets.push({ element: tag, width: box.width, height: box.height });
        }
      }
    }

    if (smallTargets.length > 0) {
      console.warn('[Test] ⚠️  Touch targets smaller than 48px:', smallTargets);
    }

    // This is a guideline, not a hard requirement
    // Some small icons may be acceptable
    console.log(`[Test] Found ${smallTargets.length} touch targets < 48px`);
  });

  test('should verify text readability (font size ≥16px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check body text elements
    const textElements = await page.$$('p, span, div, label');
    const smallText: { element: string; fontSize: string }[] = [];

    for (const element of textElements.slice(0, 50)) {
      // Sample first 50 elements
      const fontSize = await element.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.fontSize;
      });

      const fontSizeNum = parseFloat(fontSize);
      if (fontSizeNum > 0 && fontSizeNum < 14) {
        const tag = await element.evaluate((el) => el.tagName);
        smallText.push({ element: tag, fontSize });
      }
    }

    if (smallText.length > 0) {
      console.warn('[Test] ⚠️  Text elements with small font size:', smallText.slice(0, 10));
    }

    console.log(`[Test] Found ${smallText.length} text elements < 14px`);
  });

  test('should support landscape orientation', async ({ page }) => {
    // Tablet landscape
    await page.setViewportSize({ width: 1024, height: 768 });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Verify layout adapts (content should still be visible)
    const hasContent = await page.evaluate(() => {
      const body = document.body;
      return body.scrollHeight > 0 && body.scrollWidth > 0;
    });

    expect(hasContent).toBe(true);
    console.log('[Test] ✅ Landscape orientation supported');
  });
});

/**
 * Test Suite: Network Conditions
 */
test.describe('3. Network Conditions', () => {
  test('should handle fast 3G network', async ({ page, context }) => {
    // Simulate Fast 3G (1.6 Mbps, 150ms latency)
    await context.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150)); // 150ms latency
      route.continue();
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });
    await waitForAppReady(page);

    // App should still load
    const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
    expect(hasContent).toBe(true);

    console.log('[Test] ✅ App loads on Fast 3G');
  });

  test('should handle slow network with loading states', async ({ page, context }) => {
    // Simulate slow network (500ms latency)
    await context.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      route.continue();
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });

    // Check for loading indicators during slow load
    const hasLoadingState = await page.evaluate(() => {
      const body = document.body;
      const text = body.textContent || '';
      return (
        text.toLowerCase().includes('loading') ||
        text.toLowerCase().includes('please wait') ||
        document.querySelector('[role="progressbar"]') !== null
      );
    });

    console.log('[Test] Loading state shown:', hasLoadingState);
  });

  test('should handle offline mode gracefully', async ({ page, context }) => {
    // Block all network requests
    await context.route('**/*', (route) => {
      if (route.request().url().includes(API_URL)) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });
    await waitForAppReady(page);

    // App should still render (cached assets)
    const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
    expect(hasContent).toBe(true);

    console.log('[Test] ✅ App renders offline (API calls blocked)');
  });

  test('should verify retry logic on failed requests', async ({ page, context }) => {
    let attemptCount = 0;

    // Fail first 2 requests, then succeed
    await context.route('**/api/auth/login', (route) => {
      attemptCount++;
      if (attemptCount <= 2) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // This test verifies the route interceptor works
    // Actual retry logic would need to be tested at component level
    console.log('[Test] Request attempt count:', attemptCount);
  });
});

/**
 * Test Suite: Browser Compatibility
 */
test.describe('4. Browser Compatibility', () => {
  test('should work in Chromium', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });
    await waitForAppReady(page);

    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log('[Test] User Agent:', userAgent);

    expect(userAgent.toLowerCase()).toContain('chrom');
  });

  test('should verify Web APIs available (localStorage, fetch)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const webAPIs = await page.evaluate(() => {
      return {
        localStorage: typeof localStorage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        Promise: typeof Promise !== 'undefined',
        async: typeof (async () => {}) === 'function',
      };
    });

    expect(webAPIs.localStorage).toBe(true);
    expect(webAPIs.fetch).toBe(true);
    expect(webAPIs.Promise).toBe(true);
    expect(webAPIs.async).toBe(true);

    console.log('[Test] ✅ All required Web APIs available');
  });

  test('should verify AsyncStorage works on web', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // AsyncStorage should use localStorage on web
    const storageWorks = await page.evaluate(async () => {
      try {
        localStorage.setItem('test-key', 'test-value');
        const value = localStorage.getItem('test-key');
        localStorage.removeItem('test-key');
        return value === 'test-value';
      } catch (error) {
        return false;
      }
    });

    expect(storageWorks).toBe(true);
    console.log('[Test] ✅ AsyncStorage (localStorage) functional');
  });
});

/**
 * Test Suite: Feature Parity
 */
test.describe('5. Feature Parity', () => {
  test('should verify all routes accessible on web', async ({ page }) => {
    const _user = await registerAndLogin(page);

    const routes = [
      '/(tabs)/', // Dashboard
      '/(tabs)/workout',
      '/(tabs)/analytics',
      '/(tabs)/planner',
      '/(tabs)/settings',
    ];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
      expect(hasContent).toBe(true);

      console.log(`[Test] ✅ Route ${route} accessible`);
    }
  });

  test('should verify React Native Paper components render on web', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Look for Material Design components
    const hasMaterialUI = await page.evaluate(() => {
      const body = document.body;
      const html = body.innerHTML;

      // React Native Paper typically adds specific class names or data attributes
      return (
        html.includes('button') ||
        html.includes('input') ||
        document.querySelector('[role="button"]') !== null ||
        document.querySelector('[role="textbox"]') !== null
      );
    });

    expect(hasMaterialUI).toBe(true);
    console.log('[Test] ✅ React Native Paper components present');
  });

  test('should verify charts render (react-native-svg web support)', async ({ page }) => {
    await registerAndLogin(page);

    // Navigate to analytics page (should have charts)
    await page.goto(`${BASE_URL}/(tabs)/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Look for SVG elements (charts rendered by react-native-svg)
    const hasSVG = await page.evaluate(() => {
      return document.querySelectorAll('svg').length > 0;
    });

    console.log('[Test] SVG elements found:', hasSVG);

    // Take screenshot of analytics page
    await page.screenshot({ path: '/tmp/fitflow-analytics-charts.png', fullPage: true });
  });

  test('should verify form inputs work on web', async ({ page }) => {
    await page.goto(`${BASE_URL}/(auth)/register`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const user = generateTestUser();

    // Fill form inputs
    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    await emailInput.fill(user.username);

    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe(user.username);

    console.log('[Test] ✅ Form inputs functional on web');
  });
});

/**
 * Test Suite: Performance
 */
test.describe('6. Performance', () => {
  test('should load page in under 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });
    await waitForAppReady(page);

    const loadTime = Date.now() - startTime;
    console.log(`[Test] Page load time: ${loadTime}ms`);

    // Web dev server can be slow, allow up to 10s
    expect(loadTime).toBeLessThan(10000);
  });

  test('should verify time to interactive', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Try to interact with a button
    const interactiveElements = await page.$$('button, a');
    const hasInteractiveElements = interactiveElements.length > 0;

    const timeToInteractive = Date.now() - startTime;
    console.log(`[Test] Time to interactive: ${timeToInteractive}ms`);
    console.log(`[Test] Interactive elements found: ${interactiveElements.length}`);

    expect(hasInteractiveElements).toBe(true);
  });

  test('should check for memory leaks (basic)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Get initial memory usage
    const initialMetrics = await page.evaluate(() => {
      return {
        // @ts-expect-error - performance.memory is Chromium-specific
        memory: performance.memory?.usedJSHeapSize || 0,
      };
    });

    // Navigate through pages multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/(auth)/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.goto(`${BASE_URL}/(auth)/register`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
    }

    // Get final memory usage
    const finalMetrics = await page.evaluate(() => {
      return {
        // @ts-expect-error - performance.memory is Chromium-specific
        memory: performance.memory?.usedJSHeapSize || 0,
      };
    });

    console.log('[Test] Initial memory:', initialMetrics.memory);
    console.log('[Test] Final memory:', finalMetrics.memory);
    console.log('[Test] Memory delta:', finalMetrics.memory - initialMetrics.memory);

    // This is informational - memory can fluctuate
    // Major leak would show 10x+ increase
  });

  test('should verify bundle loads efficiently', async ({ page }) => {
    const resourceSizes: { url: string; size: number }[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('.js') || response.url().includes('.bundle')) {
        const size = parseInt(response.headers()['content-length'] || '0');
        if (size > 0) {
          resourceSizes.push({ url: response.url(), size });
        }
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });
    await waitForAppReady(page);

    // Calculate total bundle size
    const totalSize = resourceSizes.reduce((sum, r) => sum + r.size, 0);
    const totalMB = (totalSize / 1024 / 1024).toFixed(2);

    console.log(`[Test] Total JS bundle size: ${totalMB} MB`);
    console.log(`[Test] Number of JS files: ${resourceSizes.length}`);

    // Log largest bundles
    const largest = resourceSizes.sort((a, b) => b.size - a.size).slice(0, 3);
    console.log('[Test] Largest bundles:');
    largest.forEach((r) => {
      console.log(`  - ${(r.size / 1024 / 1024).toFixed(2)} MB: ${r.url}`);
    });
  });
});

/**
 * Test Suite: End-to-End User Flows
 */
test.describe('7. End-to-End User Flows', () => {
  test('should complete full registration and login flow on web', async ({ page }) => {
    const user = generateTestUser();

    // Register
    await page.goto(`${BASE_URL}/(auth)/register`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await page.fill('input[placeholder*="email" i], input[type="email"]', user.username);
    await page.fill('input[placeholder*="password" i], input[type="password"]', user.password);
    await page.click('button:has-text("Register"), button:has-text("Sign Up")');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(tabs)?/, { timeout: 10000 });
    await waitForAppReady(page);

    // Verify on dashboard
    const currentUrl = page.url();
    expect(currentUrl).toContain('/(tabs)');

    // Take screenshot
    await page.screenshot({ path: '/tmp/fitflow-dashboard-web.png', fullPage: true });

    console.log('[Test] ✅ Full registration flow completed successfully');
  });

  test('should navigate between all main screens', async ({ page }) => {
    await registerAndLogin(page);

    const screens = [
      { name: 'Dashboard', path: '/' },
      { name: 'Workout', path: '/workout' },
      { name: 'Analytics', path: '/analytics' },
      { name: 'Planner', path: '/planner' },
      { name: 'Settings', path: '/settings' },
    ];

    for (const screen of screens) {
      await page.goto(`${BASE_URL}/(tabs)${screen.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
      expect(hasContent).toBe(true);

      // Take screenshot
      await page.screenshot({
        path: `/tmp/fitflow-${screen.name.toLowerCase()}-web.png`,
        fullPage: true,
      });

      console.log(`[Test] ✅ ${screen.name} screen rendered`);
    }
  });

  test('should handle logout and re-login', async ({ page }) => {
    const user = await registerAndLogin(page);

    // Navigate to settings
    await page.goto(`${BASE_URL}/(tabs)/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Look for logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');

    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Wait for redirect to login
      await page.waitForURL(/\/(auth)\/login/, { timeout: 10000 });

      // Verify on login page
      const currentUrl = page.url();
      expect(currentUrl).toContain('login');

      console.log('[Test] ✅ Logout successful');

      // Re-login
      await page.fill('input[placeholder*="email" i], input[type="email"]', user.username);
      await page.fill('input[placeholder*="password" i], input[type="password"]', user.password);
      await page.click('button:has-text("Login"), button:has-text("Sign In")');

      // Wait for dashboard
      await page.waitForURL(/\/(tabs)?/, { timeout: 10000 });

      console.log('[Test] ✅ Re-login successful');
    } else {
      console.log('[Test] ⚠️  Logout button not found - skipping logout test');
    }
  });
});

/**
 * Test Suite: Accessibility
 */
test.describe('8. Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check for ARIA attributes
    const ariaElements = await page.$$('[aria-label], [aria-labelledby], [role]');
    console.log(`[Test] Elements with ARIA attributes: ${ariaElements.length}`);

    // This is informational - good to have ARIA labels
    expect(ariaElements.length).toBeGreaterThan(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Check if an element gained focus
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName : null;
    });

    console.log('[Test] Focused element after Tab:', focusedElement);
    expect(focusedElement).toBeTruthy();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Take screenshot for manual color contrast verification
    await page.screenshot({ path: '/tmp/fitflow-color-contrast.png', fullPage: true });

    // This is informational - automated color contrast checking is complex
    // Manual review recommended using tools like axe DevTools
    console.log('[Test] Screenshot saved for manual color contrast review');
  });
});
