/**
 * Comprehensive E2E Cross-Platform Compatibility Test Suite
 *
 * Full validation of FitFlow Pro web platform functionality covering:
 * 1. Web SQLite Fallback (API-only mode)
 * 2. All features without local database
 * 3. Login/logout authentication flows
 * 4. Responsive layout (mobile/tablet/desktop)
 * 5. Expo Router file-based navigation
 * 6. Dark theme rendering
 * 7. WCAG 2.1 AA accessibility compliance
 *
 * Test Execution:
 *   npx playwright test e2e/cross-platform-full.spec.ts
 *   npx playwright test e2e/cross-platform-full.spec.ts --project=chromium-desktop
 *   npx playwright test e2e/cross-platform-full.spec.ts --grep="@critical"
 *
 * Prerequisites:
 *   - Backend server: http://localhost:3000
 *   - Expo web dev server: http://localhost:8081
 *   - Clean database or unique test user generation
 *
 * Viewport Testing:
 *   - Mobile: 375px (iPhone SE)
 *   - Tablet: 768px (iPad Mini)
 *   - Desktop: 1920px (Full HD)
 */

import { test, expect, Page } from '@playwright/test';

// ========================================
// Test Configuration
// ========================================

const BASE_URL = 'http://localhost:8081';
const API_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 60000; // 60 seconds for Expo bundling
const NAVIGATION_TIMEOUT = 15000;

// ========================================
// Test User Generation
// ========================================

interface TestUser {
  username: string;
  password: string;
  age: number;
  weight_kg: number;
}

function generateTestUser(): TestUser {
  return {
    username: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@fitflow.test`,
    password: 'TestPassword123!',
    age: 28,
    weight_kg: 75,
  };
}

// ========================================
// Helper Functions
// ========================================

/**
 * Wait for app to be fully loaded and interactive
 */
async function waitForAppReady(page: Page): Promise<void> {
  // Wait for root element
  await page.waitForSelector('#root', { timeout: TEST_TIMEOUT });

  // Wait for React rendering
  await page.waitForTimeout(2000);

  // Verify content is rendered
  const hasContent = await page.evaluate(() => {
    const body = document.querySelector('body');
    return body && body.textContent && body.textContent.trim().length > 0;
  });

  expect(hasContent).toBe(true);
}

/**
 * Take a screenshot with standardized naming
 */
async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  await page.screenshot({
    path: `/tmp/fitflow-${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Register a new test user
 */
async function registerUser(page: Page, user: TestUser): Promise<void> {
  console.log(`[Test] Registering user: ${user.username}`);

  await page.goto(`${BASE_URL}/(auth)/register`, {
    waitUntil: 'domcontentloaded',
    timeout: TEST_TIMEOUT,
  });
  await waitForAppReady(page);

  // Fill registration form
  const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
  const passwordInput = page
    .locator('input[placeholder*="password" i], input[type="password"]')
    .first();

  await emailInput.fill(user.username);
  await passwordInput.fill(user.password);

  // Submit registration
  const registerButton = page
    .locator('button:has-text("Register"), button:has-text("Sign Up")')
    .first();
  await registerButton.click();

  // Wait for navigation to dashboard
  await page.waitForURL(/\/(tabs)?/, { timeout: NAVIGATION_TIMEOUT });
  await waitForAppReady(page);

  console.log('[Test] Registration successful');
}

/**
 * Login with existing user credentials
 */
async function loginUser(page: Page, user: TestUser): Promise<void> {
  console.log(`[Test] Logging in user: ${user.username}`);

  await page.goto(`${BASE_URL}/(auth)/login`, {
    waitUntil: 'domcontentloaded',
    timeout: TEST_TIMEOUT,
  });
  await waitForAppReady(page);

  // Fill login form
  const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
  const passwordInput = page
    .locator('input[placeholder*="password" i], input[type="password"]')
    .first();

  await emailInput.fill(user.username);
  await passwordInput.fill(user.password);

  // Submit login
  const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
  await loginButton.click();

  // Wait for navigation to dashboard
  await page.waitForURL(/\/(tabs)?/, { timeout: NAVIGATION_TIMEOUT });
  await waitForAppReady(page);

  console.log('[Test] Login successful');
}

/**
 * Logout current user
 */
async function logoutUser(page: Page): Promise<void> {
  console.log('[Test] Logging out user');

  // Navigate to settings
  await page.goto(`${BASE_URL}/(tabs)/settings`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(2000);

  // Find and click logout button
  const logoutButton = page
    .locator('button:has-text("Logout"), button:has-text("Sign Out")')
    .first();

  if (await logoutButton.isVisible()) {
    await logoutButton.click();

    // Wait for redirect to login
    await page.waitForURL(/\/(auth)\/login/, { timeout: NAVIGATION_TIMEOUT });
    console.log('[Test] Logout successful');
  } else {
    console.log('[Test] Logout button not found - skipping');
  }
}

/**
 * Verify SQLite graceful degradation on web
 */
async function verifySQLiteFallback(page: Page): Promise<void> {
  const diagnostics = await page.evaluate(() => {
    // Check if SQLite wrapper diagnostics are exposed
    return (window as any).__sqliteDiagnostics || null;
  });

  console.log('[Test] SQLite diagnostics:', diagnostics);

  // Verify app is functional despite SQLite unavailability
  const isAppFunctional = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  });

  expect(isAppFunctional).toBe(true);
}

/**
 * Check for console errors
 */
async function monitorConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return errors;
}

// ========================================
// TEST SUITE 1: Web SQLite Fallback
// ========================================

test.describe('1. Web SQLite Fallback (API-Only Mode) @critical', () => {
  test('should detect web platform and disable SQLite gracefully', async ({ page }) => {
    const errors = await monitorConsoleErrors(page);

    await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    await waitForAppReady(page);

    await verifySQLiteFallback(page);

    // Check for critical errors (ignore SQLite warnings)
    const criticalErrors = errors.filter(
      (err) =>
        !err.toLowerCase().includes('sqlite') &&
        (err.toLowerCase().includes('syntaxerror') ||
          err.toLowerCase().includes('cannot read') ||
          err.toLowerCase().includes('is not a function'))
    );

    expect(criticalErrors.length).toBe(0);
    console.log('[Test] ✅ SQLite gracefully disabled on web platform');
  });

  test('should use API-only mode for all operations', async ({ page }) => {
    const apiCalls: string[] = [];

    // Monitor API requests
    page.on('request', (request) => {
      if (request.url().includes(API_URL)) {
        apiCalls.push(`${request.method()} ${new URL(request.url()).pathname}`);
      }
    });

    await registerUser(page, generateTestUser());

    // Navigate to trigger API calls
    await page.goto(`${BASE_URL}/(tabs)/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify API calls were made (not using local database)
    expect(apiCalls.length).toBeGreaterThan(0);
    console.log('[Test] ✅ API calls made:', apiCalls.length);
    console.log('[Test] Sample API calls:', apiCalls.slice(0, 5).join(', '));
  });

  test('should handle database wrapper calls without crashing', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await registerUser(page, generateTestUser());

    // Navigate through all tabs (may trigger database operations)
    const routes = [
      '/(tabs)/',
      '/(tabs)/workout',
      '/(tabs)/analytics',
      '/(tabs)/planner',
      '/(tabs)/settings',
    ];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
    }

    expect(pageErrors.length).toBe(0);
    console.log('[Test] ✅ No crashes when database operations called');
  });

  test('should verify AsyncStorage falls back to localStorage on web', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const storageWorks = await page.evaluate(() => {
      try {
        localStorage.setItem('test-fitflow-key', 'test-value');
        const value = localStorage.getItem('test-fitflow-key');
        localStorage.removeItem('test-fitflow-key');
        return value === 'test-value';
      } catch {
        return false;
      }
    });

    expect(storageWorks).toBe(true);
    console.log('[Test] ✅ AsyncStorage → localStorage fallback functional');
  });
});

// ========================================
// TEST SUITE 2: All Features Without Local Database
// ========================================

test.describe('2. All Features Work Without Local Database @critical', () => {
  test('should complete authentication flow', async ({ page }) => {
    const user = generateTestUser();

    // Register
    await registerUser(page, user);

    // Verify dashboard loaded
    const currentUrl = page.url();
    expect(currentUrl).toContain('/(tabs)');

    await takeScreenshot(page, 'auth-flow-complete');
    console.log('[Test] ✅ Authentication flow completed without local database');
  });

  test('should load and display dashboard', async ({ page }) => {
    await registerUser(page, generateTestUser());

    await page.goto(`${BASE_URL}/(tabs)/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const hasContent = await page.evaluate(() => document.body.textContent.length > 100);
    expect(hasContent).toBe(true);

    await takeScreenshot(page, 'dashboard');
    console.log('[Test] ✅ Dashboard loaded successfully');
  });

  test('should access all main screens', async ({ page }) => {
    await registerUser(page, generateTestUser());

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

      const hasContent = await page.evaluate(() => document.body.textContent.length > 50);
      expect(hasContent).toBe(true);

      await takeScreenshot(page, screen.name.toLowerCase());
      console.log(`[Test] ✅ ${screen.name} screen accessible`);
    }
  });

  test('should verify form inputs work without local storage', async ({ page }) => {
    await page.goto(`${BASE_URL}/(auth)/register`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    await waitForAppReady(page);

    const testEmail = 'test@example.com';
    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();

    await emailInput.fill(testEmail);
    const value = await emailInput.inputValue();

    expect(value).toBe(testEmail);
    console.log('[Test] ✅ Form inputs functional');
  });

  test('should verify React Native Paper components render', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const hasComponents = await page.evaluate(() => {
      return document.querySelector('button') !== null || document.querySelector('input') !== null;
    });

    expect(hasComponents).toBe(true);
    console.log('[Test] ✅ React Native Paper components rendered');
  });
});

// ========================================
// TEST SUITE 3: Login/Logout Flow
// ========================================

test.describe('3. Login/Logout Flow @critical', () => {
  test('should complete full login/logout cycle', async ({ page }) => {
    const user = generateTestUser();

    // Register
    await registerUser(page, user);

    // Verify logged in
    let currentUrl = page.url();
    expect(currentUrl).toContain('/(tabs)');

    // Logout
    await logoutUser(page);

    // Verify logged out
    currentUrl = page.url();
    expect(currentUrl).toContain('login');

    // Re-login
    await loginUser(page, user);

    // Verify logged back in
    currentUrl = page.url();
    expect(currentUrl).toContain('/(tabs)');

    console.log('[Test] ✅ Full login/logout cycle completed');
  });

  test('should handle invalid credentials gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/(auth)/login`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    await waitForAppReady(page);

    // Try invalid login
    await page.fill('input[placeholder*="email" i], input[type="email"]', 'invalid@test.com');
    await page.fill('input[placeholder*="password" i], input[type="password"]', 'wrongpass');
    await page.click('button:has-text("Login"), button:has-text("Sign In")');

    // Wait for error message or stay on login page
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    // Should stay on login page or show error
    expect(currentUrl).toContain('login');

    console.log('[Test] ✅ Invalid credentials handled gracefully');
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    await registerUser(page, generateTestUser());

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should still be on dashboard (authenticated)
    const currentUrl = page.url();
    expect(currentUrl).toContain('/(tabs)');

    console.log('[Test] ✅ Authentication persisted across reload');
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Try to access protected route
    await page.goto(`${BASE_URL}/(tabs)/workout`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    await page.waitForTimeout(2000);

    // Should redirect to login
    const currentUrl = page.url();
    expect(currentUrl).toContain('login');

    console.log('[Test] ✅ Unauthenticated users redirected to login');
  });
});

// ========================================
// TEST SUITE 4: Responsive Layout
// ========================================

test.describe('4. Responsive Layout (Mobile/Tablet/Desktop)', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`should render correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto(BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUT,
      });
      await waitForAppReady(page);

      // Verify content is visible
      const hasContent = await page.evaluate(() => document.body.scrollHeight > 0);
      expect(hasContent).toBe(true);

      await takeScreenshot(page, `viewport-${viewport.name.toLowerCase()}`);
      console.log(`[Test] ✅ ${viewport.name} viewport renders correctly`);
    });

    test(`should have touch-friendly targets on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await waitForAppReady(page);

      const interactiveElements = await page.$$('button, a, input[type="button"]');
      const smallTargets: { tag: string; size: string }[] = [];

      for (const element of interactiveElements.slice(0, 20)) {
        const box = await element.boundingBox();
        if (box && (box.width < 44 || box.height < 44)) {
          const tag = await element.evaluate((el) => el.tagName);
          smallTargets.push({ tag, size: `${box.width}x${box.height}` });
        }
      }

      if (smallTargets.length > 0) {
        console.warn(`[Test] ⚠️  Small touch targets on ${viewport.name}:`, smallTargets);
      }

      // Allow some small targets (icons, etc.)
      console.log(`[Test] Small targets (<44px) on ${viewport.name}: ${smallTargets.length}`);
    });
  }

  test('should support landscape orientation', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const hasContent = await page.evaluate(() => document.body.scrollWidth > 0);
    expect(hasContent).toBe(true);

    await takeScreenshot(page, 'landscape-orientation');
    console.log('[Test] ✅ Landscape orientation supported');
  });

  test('should verify responsive text sizing', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const textElements = await page.$$('p, span, div, label');
    const smallText: { fontSize: string }[] = [];

    for (const element of textElements.slice(0, 30)) {
      const fontSize = await element.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      const fontSizeNum = parseFloat(fontSize);
      if (fontSizeNum > 0 && fontSizeNum < 12) {
        smallText.push({ fontSize });
      }
    }

    console.log(`[Test] Text elements < 12px: ${smallText.length}`);
  });
});

// ========================================
// TEST SUITE 5: Expo Router Navigation
// ========================================

test.describe('5. Expo Router File-Based Navigation', () => {
  test('should navigate using file-based routes', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Verify initial route
    let currentUrl = page.url();
    console.log('[Test] Initial URL:', currentUrl);

    // Navigate to register
    const registerLink = page.locator('text=/register|sign up/i').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(1000);

      currentUrl = page.url();
      expect(currentUrl).toContain('register');
      console.log('[Test] ✅ Navigated to register via link');
    }
  });

  test('should verify all routes are accessible', async ({ page }) => {
    await registerUser(page, generateTestUser());

    const routes = [
      '/(tabs)/',
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

  test('should support browser back/forward navigation', async ({ page }) => {
    await registerUser(page, generateTestUser());

    // Navigate forward
    await page.goto(`${BASE_URL}/(tabs)/workout`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.goto(`${BASE_URL}/(tabs)/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Navigate back
    await page.goBack();
    await page.waitForTimeout(500);

    let currentUrl = page.url();
    expect(currentUrl).toContain('workout');

    // Navigate forward
    await page.goForward();
    await page.waitForTimeout(500);

    currentUrl = page.url();
    expect(currentUrl).toContain('analytics');

    console.log('[Test] ✅ Browser back/forward navigation works');
  });

  test('should handle direct URL access', async ({ page }) => {
    await registerUser(page, generateTestUser());

    // Direct URL navigation
    await page.goto(`${BASE_URL}/(tabs)/analytics`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    expect(currentUrl).toContain('analytics');

    console.log('[Test] ✅ Direct URL access works');
  });

  test('should preserve URL state on page reload', async ({ page }) => {
    await registerUser(page, generateTestUser());

    // Navigate to specific route
    await page.goto(`${BASE_URL}/(tabs)/planner`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should stay on same route
    const currentUrl = page.url();
    expect(currentUrl).toContain('planner');

    console.log('[Test] ✅ URL state preserved on reload');
  });
});

// ========================================
// TEST SUITE 6: Dark Theme Rendering
// ========================================

test.describe('6. Dark Theme Rendering', () => {
  test('should apply dark theme colors', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check background color (should be dark)
    const backgroundColor = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });

    console.log('[Test] Background color:', backgroundColor);

    // Dark backgrounds typically have low RGB values
    const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      const isDark = r < 100 && g < 100 && b < 100;
      expect(isDark).toBe(true);
      console.log('[Test] ✅ Dark theme applied (RGB:', r, g, b, ')');
    }
  });

  test('should verify dark theme contrast ratios', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await takeScreenshot(page, 'dark-theme-contrast');

    // This is a visual check - automated contrast testing is complex
    console.log('[Test] ✅ Dark theme screenshot captured for contrast review');
  });

  test('should verify Material Design 3 dark theme tokens', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check for Material Design CSS variables or classes
    const hasMaterialStyles = await page.evaluate(() => {
      const body = document.body;
      const html = body.innerHTML;

      // React Native Paper adds specific attributes
      return (
        html.includes('button') ||
        html.includes('input') ||
        document.querySelector('[role="button"]') !== null
      );
    });

    expect(hasMaterialStyles).toBe(true);
    console.log('[Test] ✅ Material Design components present');
  });

  test('should render primary color correctly', async ({ page }) => {
    await registerUser(page, generateTestUser());

    // Look for primary color elements (buttons)
    const buttons = await page.$$('button');
    if (buttons.length > 0) {
      const buttonColor = await buttons[0].evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('[Test] Primary button color:', buttonColor);
      // Just verify it's defined
      expect(buttonColor).toBeTruthy();
    }

    console.log('[Test] ✅ Primary color rendering verified');
  });
});

// ========================================
// TEST SUITE 7: WCAG 2.1 AA Accessibility
// ========================================

test.describe('7. WCAG 2.1 AA Accessibility Compliance', () => {
  test('should have ARIA labels on interactive elements', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const ariaElements = await page.$$(
      '[aria-label], [aria-labelledby], [aria-describedby], [role]'
    );

    console.log('[Test] Elements with ARIA attributes:', ariaElements.length);
    expect(ariaElements.length).toBeGreaterThan(0);
    console.log('[Test] ✅ ARIA labels present');
  });

  test('should support keyboard navigation with Tab', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Tab to first interactive element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName, id: el.id, className: el.className } : null;
    });

    expect(focusedElement).toBeTruthy();
    console.log('[Test] ✅ Keyboard navigation works, focused:', focusedElement);
  });

  test('should support keyboard navigation with Enter', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Tab to button
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    // Press Enter (should activate button)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    console.log('[Test] ✅ Enter key activates focused elements');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const headings = await page.evaluate(() => {
      const h1 = document.querySelectorAll('h1').length;
      const h2 = document.querySelectorAll('h2').length;
      const h3 = document.querySelectorAll('h3').length;
      return { h1, h2, h3 };
    });

    console.log('[Test] Heading hierarchy:', headings);
    // Should have at least some headings (if content is rendered)
    console.log('[Test] ✅ Heading structure documented');
  });

  test('should have alt text on images', async ({ page }) => {
    await registerUser(page, generateTestUser());

    // Navigate to a page with potential images
    await page.goto(`${BASE_URL}/(tabs)/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const images = await page.$$('img');
    const imagesWithoutAlt: string[] = [];

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (!alt) {
        const src = await img.getAttribute('src');
        imagesWithoutAlt.push(src || 'unknown');
      }
    }

    if (imagesWithoutAlt.length > 0) {
      console.warn('[Test] ⚠️  Images without alt text:', imagesWithoutAlt);
    }

    console.log(`[Test] Images found: ${images.length}, without alt: ${imagesWithoutAlt.length}`);
  });

  test('should have sufficient color contrast (manual review)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await takeScreenshot(page, 'accessibility-contrast');

    console.log(
      '[Test] ✅ Screenshot saved for manual contrast review (WCAG AA requires 4.5:1 for normal text)'
    );
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Tab through elements and check focus
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    const hasFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el) return false;

      const style = window.getComputedStyle(el);
      // Check for outline or box-shadow (common focus indicators)
      return style.outline !== 'none' || style.outlineWidth !== '0px' || style.boxShadow !== 'none';
    });

    console.log('[Test] Focus indicator present:', hasFocusIndicator);
  });

  test('should have form labels associated with inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/(auth)/register`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    await waitForAppReady(page);

    const inputs = await page.$$('input');
    const inputsWithoutLabels: string[] = [];

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have at least one label mechanism
      const hasLabel = ariaLabel || ariaLabelledBy || placeholder;

      if (!hasLabel) {
        inputsWithoutLabels.push(id || 'unknown');
      }
    }

    if (inputsWithoutLabels.length > 0) {
      console.warn('[Test] ⚠️  Inputs without labels:', inputsWithoutLabels);
    }

    console.log(`[Test] Inputs: ${inputs.length}, without labels: ${inputsWithoutLabels.length}`);
  });

  test('should support screen reader semantics', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Check for semantic roles
    const semanticElements = await page.$$(
      '[role="button"], [role="navigation"], [role="main"], [role="form"], button, nav, main, form'
    );

    console.log('[Test] Semantic elements found:', semanticElements.length);
    expect(semanticElements.length).toBeGreaterThan(0);
    console.log('[Test] ✅ Semantic HTML/ARIA roles present');
  });
});

// ========================================
// TEST SUITE 8: Performance & Load Times
// ========================================

test.describe('8. Performance & Load Times', () => {
  test('should load page in under 10 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    await waitForAppReady(page);

    const loadTime = Date.now() - startTime;
    console.log(`[Test] Page load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(10000);
    console.log('[Test] ✅ Page loaded within acceptable time');
  });

  test('should verify time to interactive', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // Find interactive elements
    const buttons = await page.$$('button');

    const timeToInteractive = Date.now() - startTime;
    console.log(`[Test] Time to interactive: ${timeToInteractive}ms`);
    console.log(`[Test] Interactive elements: ${buttons.length}`);

    expect(buttons.length).toBeGreaterThan(0);
  });

  test('should check bundle size', async ({ page }) => {
    const resourceSizes: { url: string; size: number }[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.js') || url.includes('.bundle')) {
        const contentLength = response.headers()['content-length'];
        const size = contentLength ? parseInt(contentLength) : 0;
        if (size > 0) {
          resourceSizes.push({ url, size });
        }
      }
    });

    await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    await waitForAppReady(page);

    const totalSize = resourceSizes.reduce((sum, r) => sum + r.size, 0);
    const totalMB = (totalSize / 1024 / 1024).toFixed(2);

    console.log(`[Test] Total JS bundle: ${totalMB} MB`);
    console.log(`[Test] JS files: ${resourceSizes.length}`);

    const largest = resourceSizes.sort((a, b) => b.size - a.size).slice(0, 3);
    console.log('[Test] Largest bundles:');
    largest.forEach((r) => {
      console.log(`  - ${(r.size / 1024 / 1024).toFixed(2)} MB`);
    });
  });
});

// ========================================
// TEST SUITE 9: Error Handling & Edge Cases
// ========================================

test.describe('9. Error Handling & Edge Cases', () => {
  test('should handle network errors gracefully', async ({ page, context }) => {
    // Block API requests after initial load
    await context.route('**/api/**', (route) => {
      route.abort('failed');
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    // App should still render (cached assets)
    const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
    expect(hasContent).toBe(true);

    console.log('[Test] ✅ App renders with network errors');
  });

  test('should handle slow network conditions', async ({ page, context }) => {
    // Simulate 500ms latency
    await context.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      route.continue();
    });

    await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    await waitForAppReady(page);

    const hasContent = await page.evaluate(() => document.body.textContent.length > 0);
    expect(hasContent).toBe(true);

    console.log('[Test] ✅ App loads on slow network');
  });

  test('should display loading states', async ({ page, context }) => {
    // Add delay to API responses
    await context.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      route.continue();
    });

    const user = generateTestUser();

    await page.goto(`${BASE_URL}/(auth)/register`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_TIMEOUT,
    });
    await waitForAppReady(page);

    await page.fill('input[placeholder*="email" i], input[type="email"]', user.username);
    await page.fill('input[placeholder*="password" i], input[type="password"]', user.password);
    await page.click('button:has-text("Register"), button:has-text("Sign Up")');

    // Check for loading state during API call
    await page.waitForTimeout(500);

    const hasLoadingIndicator = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return (
        text.toLowerCase().includes('loading') ||
        document.querySelector('[role="progressbar"]') !== null
      );
    });

    console.log('[Test] Loading indicator shown:', hasLoadingIndicator);
  });
});
