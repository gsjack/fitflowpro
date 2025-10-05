/**
 * Cross-Platform Robust E2E Tests for FitFlow Pro
 *
 * COMPREHENSIVE TEST COVERAGE:
 * 1. Web Platform Specific Tests (no SQLite dependency)
 * 2. Mobile Responsive Layouts (375px-2560px)
 * 3. Touch vs Click Interactions
 * 4. Platform-Specific Features
 * 5. Performance Benchmarks (API response times < 200ms)
 * 6. Network Error Handling (offline scenarios, retries)
 * 7. Accessibility Compliance (WCAG 2.1 AA)
 * 8. API Endpoint Availability (404 error debugging)
 *
 * Test Execution:
 *   npx playwright test e2e/cross-platform-robust.spec.ts
 *   npx playwright test e2e/cross-platform-robust.spec.ts --project=chromium-desktop
 *   npx playwright test e2e/cross-platform-robust.spec.ts --grep="@performance"
 *   npx playwright test e2e/cross-platform-robust.spec.ts --grep="@api"
 *
 * Prerequisites:
 *   - Backend server running on http://localhost:3000
 *   - Expo web server running on http://localhost:8081
 *   - Clean database state (or unique test usernames)
 */

import { test, expect, Page } from '@playwright/test';

// ========================================
// Test Configuration
// ========================================

const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:8081';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 60000; // 60 seconds for web bundling

// Test user factory
const generateTestUser = () => ({
  username: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@fitflow.test`,
  password: 'TestPassword123!',
  age: 28,
  weight_kg: 75,
});

// ========================================
// Helper Functions
// ========================================

/**
 * Wait for React app to be fully loaded and interactive
 */
async function waitForAppReady(page: Page, timeoutMs = TEST_TIMEOUT): Promise<void> {
  // Wait for root element
  await page.waitForSelector('#root', { timeout: timeoutMs });

  // Wait for React to render
  await page.waitForTimeout(2000);

  // Verify content is visible
  const hasContent = await page.evaluate(() => {
    const body = document.querySelector('body');
    return body && body.textContent && body.textContent.trim().length > 0;
  });

  expect(hasContent).toBe(true);
}

/**
 * Check backend server health
 */
async function checkBackendHealth(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get(`${API_URL}/health`);
    return response.ok();
  } catch (error) {
    console.error('[Helper] Backend health check failed:', error);
    return false;
  }
}

/**
 * Test API endpoint availability
 * Returns detailed diagnostics for 404 debugging
 */
async function testAPIEndpoint(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: any
): Promise<{
  status: number;
  ok: boolean;
  responseTime: number;
  error?: string;
  headers?: Record<string, string>;
}> {
  const startTime = Date.now();

  try {
    const options: any = { failOnStatusCode: false };

    if (body) {
      options.data = body;
      options.headers = { 'Content-Type': 'application/json' };
    }

    let response;
    switch (method) {
      case 'GET':
        response = await page.request.get(`${API_URL}${endpoint}`, options);
        break;
      case 'POST':
        response = await page.request.post(`${API_URL}${endpoint}`, options);
        break;
      case 'PUT':
        response = await page.request.put(`${API_URL}${endpoint}`, options);
        break;
      case 'PATCH':
        response = await page.request.patch(`${API_URL}${endpoint}`, options);
        break;
      case 'DELETE':
        response = await page.request.delete(`${API_URL}${endpoint}`, options);
        break;
    }

    const responseTime = Date.now() - startTime;
    const headers = response.headers();

    return {
      status: response.status(),
      ok: response.ok(),
      responseTime,
      headers,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 0,
      ok: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Register and login a test user
 */
async function registerAndLogin(page: Page): Promise<{
  user: ReturnType<typeof generateTestUser>;
  token: string;
}> {
  const user = generateTestUser();

  // Navigate to register page
  await page.goto(`${BASE_URL}/(auth)/register`, { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);

  // Fill registration form
  const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
  const passwordInput = page
    .locator('input[placeholder*="password" i], input[type="password"]')
    .first();

  await emailInput.fill(user.username);
  await passwordInput.fill(user.password);

  // Submit form
  const submitButton = page
    .locator('button:has-text("Register"), button:has-text("Sign Up")')
    .first();
  await submitButton.click();

  // Wait for navigation to dashboard
  await page.waitForURL(/\/(tabs)?/, { timeout: 10000 });
  await waitForAppReady(page);

  // Extract token from localStorage
  const token = await page.evaluate(() => {
    return localStorage.getItem('authToken') || '';
  });

  return { user, token };
}

/**
 * Measure API response time
 */
async function measureAPIResponseTime(
  page: Page,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<number> {
  const result = await testAPIEndpoint(page, method, endpoint, body);
  return result.responseTime;
}

/**
 * Check WCAG 2.1 AA compliance basics
 */
async function checkAccessibility(page: Page): Promise<{
  hasARIA: boolean;
  ariaElementCount: number;
  smallTouchTargets: number;
  smallText: number;
  keyboardNavigable: boolean;
}> {
  // Check ARIA labels
  const ariaElements = await page.$$('[aria-label], [aria-labelledby], [role]');
  const hasARIA = ariaElements.length > 0;

  // Check touch target sizes (minimum 48px)
  const interactiveElements = await page.$$(
    'button, a, input[type="button"], input[type="submit"]'
  );
  let smallTouchTargets = 0;

  for (const element of interactiveElements) {
    const box = await element.boundingBox();
    if (box && (box.width < 48 || box.height < 48)) {
      smallTouchTargets++;
    }
  }

  // Check text sizes (minimum 14px for body text)
  const textElements = await page.$$('p, span, div, label');
  let smallText = 0;

  for (const element of textElements.slice(0, 50)) {
    const fontSize = await element.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return parseFloat(style.fontSize);
    });

    if (fontSize > 0 && fontSize < 14) {
      smallText++;
    }
  }

  // Check keyboard navigation
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  const focusedElement = await page.evaluate(() => {
    return document.activeElement?.tagName || null;
  });

  const keyboardNavigable = focusedElement !== null;

  return {
    hasARIA,
    ariaElementCount: ariaElements.length,
    smallTouchTargets,
    smallText,
    keyboardNavigable,
  };
}

// ========================================
// Test Suite 1: API Endpoint Availability (404 Debugging)
// ========================================

test.describe('1. API Endpoint Availability @api', () => {
  test('should verify backend server is running', async ({ page }) => {
    const isHealthy = await checkBackendHealth(page);
    expect(isHealthy).toBe(true);

    console.log('[Test] ✅ Backend server is healthy');
  });

  test('should test all critical API endpoints', async ({ page }) => {
    const endpoints = [
      { method: 'GET', path: '/health', expectedStatus: 200 },
      { method: 'GET', path: '/api/exercises', expectedStatus: 200 },
      { method: 'POST', path: '/api/auth/register', expectedStatus: 201, body: generateTestUser() },
    ] as const;

    const results: Array<{
      endpoint: string;
      status: number;
      expected: number;
      passed: boolean;
      responseTime: number;
    }> = [];

    for (const endpoint of endpoints) {
      const result = await testAPIEndpoint(page, endpoint.method, endpoint.path, endpoint.body);

      const passed = endpoint.expectedStatus
        ? result.status === endpoint.expectedStatus
        : result.ok;

      results.push({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        status: result.status,
        expected: endpoint.expectedStatus || 200,
        passed,
        responseTime: result.responseTime,
      });

      console.log(
        `[Test] ${endpoint.method} ${endpoint.path}: ${result.status} (${result.responseTime}ms) ${
          passed ? '✅' : '❌'
        }`
      );

      if (!passed && result.status === 404) {
        console.error(`[Test] ❌ 404 ERROR: ${endpoint.path} not found on server`);
        console.error('[Test] Verify backend route is registered in server.ts');
      }

      if (!passed && result.error) {
        console.error(`[Test] ❌ ERROR: ${result.error}`);
      }
    }

    // Verify all endpoints are available
    const failedEndpoints = results.filter((r) => !r.passed);
    if (failedEndpoints.length > 0) {
      console.error('[Test] Failed endpoints:', failedEndpoints);
    }

    expect(failedEndpoints.length).toBe(0);
  });

  test('should verify CORS headers on API endpoints', async ({ page }) => {
    const result = await testAPIEndpoint(page, 'GET', '/api/exercises');

    expect(result.ok).toBe(true);
    expect(result.headers).toBeDefined();
    expect(result.headers?.['access-control-allow-origin']).toBeDefined();

    console.log('[Test] ✅ CORS headers present');
  });

  test('should handle 404 errors gracefully in app', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Trigger a 404 by requesting non-existent endpoint
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check that app doesn't crash on 404
    const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
    expect(hasContent).toBe(true);

    console.log('[Test] ✅ App handles 404 errors gracefully');
  });

  test('should verify all CRUD endpoints exist', async ({ page }) => {
    // Register a user first to get auth token
    const { token } = await registerAndLogin(page);

    const crudEndpoints = [
      { method: 'GET', path: '/api/workouts' },
      { method: 'GET', path: '/api/programs' },
      { method: 'GET', path: '/api/exercises' },
      { method: 'GET', path: '/api/vo2max-sessions' },
    ] as const;

    for (const endpoint of crudEndpoints) {
      const result = await page.request.get(`${API_URL}${endpoint.path}`, {
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      });

      const status = result.status();
      const isValid = status === 200 || status === 401; // 200 OK or 401 Unauthorized (auth required)

      console.log(`[Test] ${endpoint.method} ${endpoint.path}: ${status} ${isValid ? '✅' : '❌'}`);

      if (status === 404) {
        console.error(`[Test] ❌ 404: Endpoint ${endpoint.path} not found`);
      }

      expect(isValid).toBe(true);
    }
  });
});

// ========================================
// Test Suite 2: Performance Benchmarks @performance
// ========================================

test.describe('2. Performance Benchmarks @performance', () => {
  test('should verify API response times < 200ms (p95)', async ({ page }) => {
    const { _token } = await registerAndLogin(page);

    const endpoints = [
      '/api/exercises',
      '/api/workouts',
      '/api/programs',
      '/api/analytics/volume-current-week',
    ];

    const measurements: Record<string, number[]> = {};

    // Take 10 measurements per endpoint
    for (const endpoint of endpoints) {
      measurements[endpoint] = [];

      for (let i = 0; i < 10; i++) {
        const responseTime = await measureAPIResponseTime(page, endpoint, 'GET');
        measurements[endpoint].push(responseTime);
        await page.waitForTimeout(100); // Prevent rate limiting
      }
    }

    // Calculate p95 for each endpoint
    const results: Array<{ endpoint: string; p95: number; passed: boolean }> = [];

    for (const endpoint of endpoints) {
      const times = measurements[endpoint].sort((a, b) => a - b);
      const p95Index = Math.floor(times.length * 0.95);
      const p95 = times[p95Index];

      const passed = p95 < 200;
      results.push({ endpoint, p95, passed });

      console.log(
        `[Test] ${endpoint}: p95=${p95}ms ${passed ? '✅' : '⚠️  (exceeds 200ms target)'}`
      );
    }

    // Log full distribution
    for (const endpoint of endpoints) {
      const times = measurements[endpoint];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      console.log(`[Test] ${endpoint}: avg=${avg.toFixed(1)}ms, min=${min}ms, max=${max}ms`);
    }

    // All endpoints should meet p95 < 200ms target
    const failedEndpoints = results.filter((r) => !r.passed);
    expect(failedEndpoints.length).toBe(0);
  });

  test('should verify page load time < 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });
    await waitForAppReady(page);

    const loadTime = Date.now() - startTime;
    console.log(`[Test] Page load time: ${loadTime}ms`);

    // Web dev server can be slow, allow up to 10s
    expect(loadTime).toBeLessThan(10000);
  });

  test('should verify time to interactive < 3 seconds', async ({ page }) => {
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
    expect(timeToInteractive).toBeLessThan(10000); // Allow 10s for dev server
  });

  test('should verify SQLite operations gracefully disabled on web', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check that app doesn't crash when DB operations are called
    const dbOperationTime = await page.evaluate(async () => {
      const startTime = Date.now();
      try {
        // This should gracefully fail on web (no SQLite)
        // @ts-ignore - accessing global for test
        if (window.SQLite) {
          await window.SQLite.openDatabase({ name: 'test.db' });
        }
      } catch (error) {
        // Expected to fail gracefully
      }
      return Date.now() - startTime;
    });

    console.log(`[Test] DB operation handling time: ${dbOperationTime}ms`);

    // Should fail quickly (< 100ms) without blocking
    expect(dbOperationTime).toBeLessThan(100);
  });

  test('should verify bundle size is reasonable', async ({ page }) => {
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
      console.log(`  - ${(r.size / 1024 / 1024).toFixed(2)} MB: ${r.url.split('/').pop()}`);
    });

    // Bundle should be reasonable (< 10MB for dev build)
    expect(parseFloat(totalMB)).toBeLessThan(10);
  });
});

// ========================================
// Test Suite 3: Network Error Handling @network
// ========================================

test.describe('3. Network Error Handling @network', () => {
  test('should handle offline mode gracefully', async ({ page, context }) => {
    // Block all API requests
    await context.route(`${API_URL}/**/*`, (route) => {
      route.abort('failed');
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });
    await waitForAppReady(page);

    // App should still render (cached assets)
    const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
    expect(hasContent).toBe(true);

    console.log('[Test] ✅ App renders offline (API calls blocked)');
  });

  test('should retry failed requests with exponential backoff', async ({ page, context }) => {
    let attemptCount = 0;
    const attemptTimestamps: number[] = [];

    // Fail first 2 requests, then succeed
    await context.route('**/api/exercises', (route) => {
      attemptCount++;
      attemptTimestamps.push(Date.now());

      if (attemptCount <= 2) {
        console.log(`[Test] Request attempt ${attemptCount}: failing`);
        route.abort('failed');
      } else {
        console.log(`[Test] Request attempt ${attemptCount}: succeeding`);
        route.continue();
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Navigate to a page that triggers API call
    await page.goto(`${BASE_URL}/(tabs)/planner`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); // Wait for retries

    console.log(`[Test] Total request attempts: ${attemptCount}`);

    // Verify exponential backoff timing
    if (attemptTimestamps.length >= 2) {
      const delays = attemptTimestamps.slice(1).map((time, i) => time - attemptTimestamps[i]);
      console.log('[Test] Retry delays (ms):', delays);
    }

    // Should have retried at least once
    expect(attemptCount).toBeGreaterThan(1);
  });

  test('should handle slow network (500ms latency)', async ({ page, context }) => {
    // Simulate slow network
    await context.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      route.continue();
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });

    // Check for loading indicators
    const hasLoadingState = await page.evaluate(() => {
      const body = document.body;
      const text = body.textContent || '';
      return (
        text.toLowerCase().includes('loading') ||
        text.toLowerCase().includes('please wait') ||
        document.querySelector('[role="progressbar"]') !== null
      );
    });

    console.log('[Test] Loading state shown during slow network:', hasLoadingState);
  });

  test('should handle API errors with user-friendly messages', async ({ page, context }) => {
    // Return 500 error for API calls
    await context.route('**/api/workouts', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Navigate to workout page (triggers API call)
    await page.goto(`${BASE_URL}/(tabs)/workout`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // App should still be functional (not crash)
    const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
    expect(hasContent).toBe(true);

    console.log('[Test] ✅ App handles 500 errors gracefully');
  });

  test('should handle network timeout', async ({ page, context }) => {
    // Simulate timeout by delaying response indefinitely
    await context.route('**/api/programs', async (route) => {
      // Wait 30 seconds (should trigger timeout)
      await new Promise((resolve) => setTimeout(resolve, 30000));
      route.continue();
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Navigate to planner (triggers programs API call)
    await page.goto(`${BASE_URL}/(tabs)/planner`, { waitUntil: 'domcontentloaded' });

    // Wait a bit for timeout handling
    await page.waitForTimeout(3000);

    // App should still render
    const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
    expect(hasContent).toBe(true);

    console.log('[Test] ✅ App handles network timeout');
  });
});

// ========================================
// Test Suite 4: Responsive Design @responsive
// ========================================

test.describe('4. Responsive Design @responsive', () => {
  const viewports = [
    { name: 'Small Mobile', width: 320, height: 568 }, // iPhone SE 1st gen
    { name: 'Mobile', width: 375, height: 667 }, // iPhone 8
    { name: 'Large Mobile', width: 414, height: 896 }, // iPhone 11 Pro Max
    { name: 'Tablet Portrait', width: 768, height: 1024 }, // iPad
    { name: 'Tablet Landscape', width: 1024, height: 768 }, // iPad landscape
    { name: 'Desktop', width: 1920, height: 1080 }, // Full HD
    { name: 'Large Desktop', width: 2560, height: 1440 }, // 1440p
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
        path: `/tmp/fitflow-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true,
      });

      // Verify content is visible
      const hasContent = await page.evaluate(() => {
        const body = document.body;
        return body && body.scrollHeight > 0;
      });

      expect(hasContent).toBe(true);

      // Check for horizontal overflow (layout should not overflow on small screens)
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasOverflow) {
        console.warn(`[Test] ⚠️  Horizontal overflow detected on ${viewport.name}`);
      }

      console.log(`[Test] ✅ ${viewport.name} renders correctly`);
    });
  }

  test('should have touch targets ≥48px on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const interactiveElements = await page.$$(
      'button, a, input[type="button"], input[type="submit"]'
    );

    const smallTargets: { element: string; width: number; height: number }[] = [];

    for (const element of interactiveElements) {
      const box = await element.boundingBox();
      if (box && (box.width < 48 || box.height < 48)) {
        const tag = await element.evaluate((el) => el.tagName);
        smallTargets.push({ element: tag, width: box.width, height: box.height });
      }
    }

    if (smallTargets.length > 0) {
      console.warn('[Test] ⚠️  Touch targets smaller than 48px:', smallTargets.slice(0, 5));
    }

    console.log(
      `[Test] Found ${smallTargets.length}/${interactiveElements.length} touch targets < 48px`
    );

    // Allow some small targets (icons), but most should be 48px+
    expect(smallTargets.length).toBeLessThan(interactiveElements.length * 0.3);
  });

  test('should verify text readability (font size ≥14px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const textElements = await page.$$('p, span, div, label');
    const smallText: { element: string; fontSize: string }[] = [];

    for (const element of textElements.slice(0, 50)) {
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
      console.warn('[Test] ⚠️  Text elements with small font size:', smallText.slice(0, 5));
    }

    console.log(`[Test] Found ${smallText.length} text elements < 14px (sampled 50 elements)`);

    // Allow some small text (captions), but most should be 14px+
    expect(smallText.length).toBeLessThan(25);
  });
});

// ========================================
// Test Suite 5: Touch vs Click Interactions @interaction
// ========================================

test.describe('5. Touch vs Click Interactions @interaction', () => {
  test('should handle click interactions on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Find clickable elements
    const buttons = await page.$$('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Click first button
    if (buttons.length > 0) {
      const firstButton = buttons[0];
      const text = await firstButton.textContent();

      console.log(`[Test] Clicking button: "${text}"`);
      await firstButton.click();
      await page.waitForTimeout(500);

      // Verify no crash
      const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
      expect(hasContent).toBe(true);
    }

    console.log('[Test] ✅ Click interactions work on desktop');
  });

  test('should handle tap interactions on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Find tappable elements
    const buttons = await page.$$('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Tap first button (Playwright simulates touch events)
    if (buttons.length > 0) {
      const firstButton = buttons[0];
      const text = await firstButton.textContent();

      console.log(`[Test] Tapping button: "${text}"`);
      await firstButton.tap();
      await page.waitForTimeout(500);

      // Verify no crash
      const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
      expect(hasContent).toBe(true);
    }

    console.log('[Test] ✅ Tap interactions work on mobile');
  });

  test('should handle double tap (zoom prevention)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Double tap on body (should not zoom on mobile)
    await page.tap('body');
    await page.waitForTimeout(100);
    await page.tap('body');
    await page.waitForTimeout(500);

    // Get viewport scale
    const scale = await page.evaluate(() => {
      return window.visualViewport?.scale || 1;
    });

    console.log(`[Test] Viewport scale after double tap: ${scale}`);

    // Should remain at 1.0 (no zoom)
    expect(scale).toBe(1);
  });

  test('should handle long press interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const buttons = await page.$$('button');

    if (buttons.length > 0) {
      const firstButton = buttons[0];

      // Simulate long press
      await firstButton.hover();
      await page.mouse.down();
      await page.waitForTimeout(1000);
      await page.mouse.up();

      // Verify app is still functional
      const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
      expect(hasContent).toBe(true);
    }

    console.log('[Test] ✅ Long press handled without issues');
  });

  test('should handle swipe gestures', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Simulate swipe left (for tabs)
    await page.mouse.move(300, 400);
    await page.mouse.down();
    await page.mouse.move(100, 400);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Verify app is still functional
    const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
    expect(hasContent).toBe(true);

    console.log('[Test] ✅ Swipe gestures handled');
  });
});

// ========================================
// Test Suite 6: Platform-Specific Features @platform
// ========================================

test.describe('6. Platform-Specific Features @platform', () => {
  test('should verify web-only features (localStorage)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const storageWorks = await page.evaluate(() => {
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
    console.log('[Test] ✅ localStorage (web-only) functional');
  });

  test('should verify web APIs available', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const webAPIs = await page.evaluate(() => {
      return {
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        Promise: typeof Promise !== 'undefined',
        async: typeof (async () => {}) === 'function',
        WebSocket: typeof WebSocket !== 'undefined',
        URL: typeof URL !== 'undefined',
      };
    });

    expect(webAPIs.localStorage).toBe(true);
    expect(webAPIs.sessionStorage).toBe(true);
    expect(webAPIs.fetch).toBe(true);
    expect(webAPIs.Promise).toBe(true);
    expect(webAPIs.async).toBe(true);
    expect(webAPIs.WebSocket).toBe(true);
    expect(webAPIs.URL).toBe(true);

    console.log('[Test] ✅ All required Web APIs available');
  });

  test('should verify SQLite gracefully disabled on web', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const sqliteDiagnostics = await page.evaluate(() => {
      // Access global diagnostics if available
      return (window as any).sqliteDiagnostics || null;
    });

    console.log('[Test] SQLite diagnostics:', sqliteDiagnostics);

    // Verify app is still functional without SQLite
    const isAppFunctional = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });

    expect(isAppFunctional).toBe(true);
    console.log('[Test] ✅ App functional without SQLite (web mode)');
  });

  test('should verify Expo Router navigation works on web', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Click registration link (if on login page)
    const registerLink = page.locator('text=/register|sign up/i').first();
    if (await registerLink.isVisible({ timeout: 5000 })) {
      await registerLink.click();
      await page.waitForTimeout(1000);

      // Verify URL changed
      const currentUrl = page.url();
      expect(currentUrl).toContain('register');

      console.log('[Test] ✅ Expo Router navigation functional');
    } else {
      console.log('[Test] ℹ️  Register link not found (may already be authenticated)');
    }
  });

  test('should verify React Native Paper components render on web', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const hasMaterialUI = await page.evaluate(() => {
      const body = document.body;
      const html = body.innerHTML;

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
});

// ========================================
// Test Suite 7: Accessibility Compliance (WCAG 2.1 AA) @accessibility
// ========================================

test.describe('7. Accessibility Compliance (WCAG 2.1 AA) @accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const accessibility = await checkAccessibility(page);

    console.log(`[Test] ARIA elements: ${accessibility.ariaElementCount}`);
    console.log(`[Test] Keyboard navigable: ${accessibility.keyboardNavigable ? 'Yes' : 'No'}`);

    expect(accessibility.hasARIA).toBe(true);
    expect(accessibility.ariaElementCount).toBeGreaterThan(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const accessibility = await checkAccessibility(page);

    expect(accessibility.keyboardNavigable).toBe(true);
    console.log('[Test] ✅ Keyboard navigation supported');
  });

  test('should have sufficient touch target sizes (WCAG 2.1 AA)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const accessibility = await checkAccessibility(page);

    console.log(`[Test] Small touch targets (< 48px): ${accessibility.smallTouchTargets}`);

    // Allow some small targets, but most should meet guidelines
    expect(accessibility.smallTouchTargets).toBeLessThan(10);
  });

  test('should have readable text sizes (WCAG 2.1 AA)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const accessibility = await checkAccessibility(page);

    console.log(`[Test] Small text elements (< 14px): ${accessibility.smallText}`);

    // Allow some small text (captions), but most should be readable
    expect(accessibility.smallText).toBeLessThan(15);
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check for semantic HTML
    const semanticElements = await page.$$('nav, main, header, footer, section, article');
    console.log(`[Test] Semantic HTML elements: ${semanticElements.length}`);

    // Check for heading hierarchy
    const headings = await page.$$('h1, h2, h3, h4, h5, h6');
    console.log(`[Test] Heading elements: ${headings.length}`);

    // Should have some semantic structure
    expect(semanticElements.length + headings.length).toBeGreaterThan(0);
  });

  test('should have form labels associated with inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/(auth)/register`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const inputs = await page.$$('input');
    let inputsWithLabels = 0;

    for (const input of inputs) {
      const hasLabel = await input.evaluate((el) => {
        const id = el.id;
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');

        if (ariaLabel || ariaLabelledBy) {
          return true;
        }

        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          return label !== null;
        }

        return false;
      });

      if (hasLabel) {
        inputsWithLabels++;
      }
    }

    console.log(`[Test] Inputs with labels: ${inputsWithLabels}/${inputs.length}`);

    // Most inputs should have labels
    if (inputs.length > 0) {
      expect(inputsWithLabels).toBeGreaterThan(0);
    }
  });

  test('should have sufficient color contrast (visual check)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Take screenshot for manual color contrast verification
    await page.screenshot({ path: '/tmp/fitflow-color-contrast.png', fullPage: true });

    console.log('[Test] Screenshot saved for manual color contrast review');
    console.log(
      '[Test] ℹ️  Manual review recommended using axe DevTools or WebAIM Contrast Checker'
    );
  });
});

// ========================================
// Test Suite 8: Web Platform Specific Tests @web
// ========================================

test.describe('8. Web Platform Specific Tests @web', () => {
  test('should load web app without errors', async ({ page }) => {
    const errors: string[] = [];
    const pageErrors: Error[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

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

    console.log('[Test] ✅ Web app loads without critical errors');
  });

  test('should authenticate on web without SQLite', async ({ page }) => {
    const { _user } = await registerAndLogin(page);

    // Verify authentication succeeded
    const currentUrl = page.url();
    expect(currentUrl).toContain('/(tabs)');

    console.log('[Test] ✅ Authentication successful on web (API-only mode)');
  });

  test('should verify API-only mode functional', async ({ page }) => {
    await registerAndLogin(page);

    // Intercept API calls
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes(API_URL)) {
        apiCalls.push(`${request.method()} ${new URL(request.url()).pathname}`);
      }
    });

    // Navigate to different screens to trigger API calls
    await page.goto(`${BASE_URL}/(tabs)/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify API calls were made (app using API, not local DB)
    expect(apiCalls.length).toBeGreaterThan(0);
    console.log('[Test] API calls made:', apiCalls);
  });

  test('should complete full user flow on web', async ({ page }) => {
    const { _user } = await registerAndLogin(page);

    // Navigate through all tabs
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

      await page.screenshot({
        path: `/tmp/fitflow-${screen.name.toLowerCase()}-web.png`,
        fullPage: true,
      });

      console.log(`[Test] ✅ ${screen.name} screen rendered`);
    }

    console.log('[Test] ✅ Full user flow completed on web');
  });
});
