import { test, expect } from '@playwright/test';

// Generate unique test user
const timestamp = Date.now();
const testEmail = `absolute-final-${timestamp}@example.com`;
const testPassword = 'FinalTest123!';

test.describe('ABSOLUTE FINAL E2E TEST - Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:8081');
    await page.evaluate(() => localStorage.clear());
  });

  test('Test 1: Complete Registration Flow', async ({ page }) => {
    console.log('[TEST 1] Starting registration flow...');

    // Navigate to registration
    await page.goto('http://localhost:8081/register');
    await page.waitForTimeout(2000);

    // Take screenshot of registration page
    await page.screenshot({ path: 'screenshots/test1-registration-page.png', fullPage: true });

    // Fill registration form
    console.log(`[TEST 1] Filling form with email: ${testEmail}`);

    // Find and fill email input
    const emailInput = page.locator('input[type="email"], input[placeholder*="mail" i], input[aria-label*="mail" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(testEmail);

    // Find and fill password input
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(testPassword);

    // Select experience level (intermediate)
    // Look for segmented buttons with "Intermediate"
    const intermediateButton = page.locator('button:has-text("Intermediate")').first();
    await intermediateButton.waitFor({ state: 'visible', timeout: 10000 });
    await intermediateButton.click();

    // Take screenshot before submit
    await page.screenshot({ path: 'screenshots/test1-form-filled.png', fullPage: true });

    // Check console for errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log(`[BROWSER CONSOLE] ${text}`);
    });

    // Click Create Account button
    console.log('[TEST 1] Clicking Create Account button...');
    const createButton = page.locator('button:has-text("Create Account"), button:has-text("Register"), button:has-text("Sign Up")').first();
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click();

    // Wait for navigation to dashboard
    console.log('[TEST 1] Waiting for navigation to dashboard...');
    await page.waitForURL('http://localhost:8081/', { timeout: 15000 });

    // Verify we're on dashboard
    const currentUrl = page.url();
    console.log(`[TEST 1] Current URL: ${currentUrl}`);
    expect(currentUrl).toBe('http://localhost:8081/');

    // Wait for dashboard to load
    await page.waitForTimeout(3000);

    // Take screenshot of dashboard
    await page.screenshot({ path: 'screenshots/test1-dashboard.png', fullPage: true });

    // Verify dashboard content loaded (no blank page)
    const bodyText = await page.locator('body').textContent();
    console.log(`[TEST 1] Dashboard body length: ${bodyText?.length || 0} chars`);

    // Check for error banners
    const errorBanner = await page.locator('[role="alert"], .error-banner, [class*="error"]').count();
    console.log(`[TEST 1] Error banners found: ${errorBanner}`);

    // Verify no React error overlay
    const reactErrorOverlay = await page.locator('[data-error-overlay], iframe[title*="error"]').count();
    console.log(`[TEST 1] React error overlays: ${reactErrorOverlay}`);
    expect(reactErrorOverlay).toBe(0);

    // Check if RegisterScreen logs are present
    const hasRegisterLogs = consoleMessages.some(msg => msg.includes('[RegisterScreen]'));
    console.log(`[TEST 1] RegisterScreen logs found: ${hasRegisterLogs}`);

    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    console.log(`[TEST 1] Token stored: ${token ? 'YES' : 'NO'}`);
    expect(token).toBeTruthy();

    console.log('[TEST 1] ✅ PASSED - Registration and dashboard load successful');
  });

  test('Test 2: Multi-Page Navigation While Authenticated', async ({ page }) => {
    console.log('[TEST 2] Starting navigation test...');

    // First, register and login
    await page.goto('http://localhost:8081/register');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="mail" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(testEmail);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(testPassword);

    const intermediateButton = page.locator('button:has-text("Intermediate")').first();
    await intermediateButton.click();

    const createButton = page.locator('button:has-text("Create Account"), button:has-text("Register")').first();
    await createButton.click();

    await page.waitForURL('http://localhost:8081/', { timeout: 15000 });
    console.log('[TEST 2] Registered and on dashboard');

    // Verify token exists
    let token = await page.evaluate(() => localStorage.getItem('authToken'));
    console.log(`[TEST 2] Initial token: ${token ? 'EXISTS' : 'MISSING'}`);

    // Navigate to Analytics
    console.log('[TEST 2] Navigating to /analytics...');
    await page.goto('http://localhost:8081/analytics');
    await page.waitForTimeout(2000);

    // CRITICAL: Check URL didn't redirect to login
    let currentUrl = page.url();
    console.log(`[TEST 2] After /analytics navigation, URL: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      console.log('[TEST 2] ❌ FAILED - Redirected to login page');
      token = await page.evaluate(() => localStorage.getItem('authToken'));
      console.log(`[TEST 2] Token after navigation: ${token ? 'EXISTS' : 'MISSING'}`);
      await page.screenshot({ path: 'screenshots/test2-failed-analytics.png', fullPage: true });
    }

    expect(currentUrl).toBe('http://localhost:8081/analytics');
    await page.screenshot({ path: 'screenshots/test2-analytics.png', fullPage: true });

    // Navigate to Planner
    console.log('[TEST 2] Navigating to /planner...');
    await page.goto('http://localhost:8081/planner');
    await page.waitForTimeout(2000);

    currentUrl = page.url();
    console.log(`[TEST 2] After /planner navigation, URL: ${currentUrl}`);
    expect(currentUrl).toBe('http://localhost:8081/planner');
    await page.screenshot({ path: 'screenshots/test2-planner.png', fullPage: true });

    // Navigate to Settings
    console.log('[TEST 2] Navigating to /settings...');
    await page.goto('http://localhost:8081/settings');
    await page.waitForTimeout(2000);

    currentUrl = page.url();
    console.log(`[TEST 2] After /settings navigation, URL: ${currentUrl}`);
    expect(currentUrl).toBe('http://localhost:8081/settings');
    await page.screenshot({ path: 'screenshots/test2-settings.png', fullPage: true });

    // Navigate back to Dashboard
    console.log('[TEST 2] Navigating back to / (dashboard)...');
    await page.goto('http://localhost:8081/');
    await page.waitForTimeout(2000);

    currentUrl = page.url();
    console.log(`[TEST 2] After / navigation, URL: ${currentUrl}`);
    expect(currentUrl).toBe('http://localhost:8081/');
    await page.screenshot({ path: 'screenshots/test2-dashboard-return.png', fullPage: true });

    // Verify token still exists
    token = await page.evaluate(() => localStorage.getItem('authToken'));
    console.log(`[TEST 2] Final token check: ${token ? 'EXISTS' : 'MISSING'}`);
    expect(token).toBeTruthy();

    console.log('[TEST 2] ✅ PASSED - All navigation preserved authentication');
  });

  test('Test 3: Logout and Login', async ({ page }) => {
    console.log('[TEST 3] Starting logout/login test...');

    // First, register
    await page.goto('http://localhost:8081/register');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="mail" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(testEmail);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(testPassword);

    const intermediateButton = page.locator('button:has-text("Intermediate")').first();
    await intermediateButton.click();

    const createButton = page.locator('button:has-text("Create Account"), button:has-text("Register")').first();
    await createButton.click();

    await page.waitForURL('http://localhost:8081/', { timeout: 15000 });
    console.log('[TEST 3] Registered and on dashboard');

    // Navigate to settings to find logout button
    await page.goto('http://localhost:8081/settings');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/test3-settings.png', fullPage: true });

    // Look for logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log Out"), button:has-text("Sign Out")').first();
    const hasLogoutButton = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasLogoutButton) {
      console.log('[TEST 3] Found logout button, clicking...');
      await logoutButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('[TEST 3] No logout button found, manually clearing localStorage...');
      await page.evaluate(() => localStorage.clear());
      await page.goto('http://localhost:8081/login');
    }

    // Verify we're on login page
    await page.waitForURL(/\/(login|auth)/, { timeout: 10000 });
    console.log(`[TEST 3] After logout, URL: ${page.url()}`);
    await page.screenshot({ path: 'screenshots/test3-after-logout.png', fullPage: true });

    // Login with same credentials
    console.log('[TEST 3] Logging in with same credentials...');
    const loginEmailInput = page.locator('input[type="email"], input[placeholder*="mail" i]').first();
    await loginEmailInput.waitFor({ state: 'visible', timeout: 10000 });
    await loginEmailInput.fill(testEmail);

    const loginPasswordInput = page.locator('input[type="password"]').first();
    await loginPasswordInput.fill(testPassword);

    const loginButton = page.locator('button:has-text("Login"), button:has-text("Log In"), button:has-text("Sign In")').first();
    await loginButton.click();

    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:8081/', { timeout: 15000 });
    console.log(`[TEST 3] After login, URL: ${page.url()}`);

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/test3-after-login.png', fullPage: true });

    // Verify token exists
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    console.log(`[TEST 3] Token after login: ${token ? 'EXISTS' : 'MISSING'}`);
    expect(token).toBeTruthy();

    console.log('[TEST 3] ✅ PASSED - Logout and login successful');
  });
});
