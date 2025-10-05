import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8081';
const TIMESTAMP = Date.now();
const TEST_EMAIL = `final-test-${TIMESTAMP}@example.com`;
const TEST_PASSWORD = 'Test1234!';

test.describe('FINAL E2E Validation - Complete Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Test 1: Registration Flow', async ({ page }) => {
    console.log('\n=== TEST 1: REGISTRATION FLOW ===');

    // Step 1: Navigate to registration
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    // Wait for form to be visible
    await page.waitForSelector('input[placeholder*="email" i], input[type="email"]', { timeout: 10000 });

    // Step 2: Fill email
    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    await emailInput.fill(TEST_EMAIL);
    console.log(`[Test] Filled email: ${TEST_EMAIL}`);

    // Step 3: Fill password
    const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
    await passwordInput.fill(TEST_PASSWORD);
    console.log(`[Test] Filled password: ${TEST_PASSWORD}`);

    // Step 4: Select experience (if dropdown exists)
    try {
      const experienceDropdown = page.locator('text=/experience/i').first();
      if (await experienceDropdown.isVisible({ timeout: 2000 })) {
        await experienceDropdown.click();
        await page.locator('text=/beginner/i').first().click();
        console.log('[Test] Selected experience: beginner');
      }
    } catch (e) {
      console.log('[Test] No experience dropdown found (optional)');
    }

    // Take screenshot before clicking register
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e-screenshots/01-before-register.png', fullPage: true });

    // Step 5: Click "Create Account" button
    // Listen for console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log(`[Browser Console] ${text}`);
    });

    const registerButton = page.locator('button:has-text("Create Account"), button:has-text("Register"), button:has-text("Sign Up")').first();
    await registerButton.click();
    console.log('[Test] Clicked Create Account button');

    // Step 6: Wait for registration to complete and check console logs
    await page.waitForTimeout(3000); // Wait for async operations

    const hasHandleRegisterLog = consoleLogs.some(log => log.includes('handleRegister called'));
    const hasSuccessLog = consoleLogs.some(log => log.includes('Registration successful'));

    console.log(`[Test] handleRegister called: ${hasHandleRegisterLog}`);
    console.log(`[Test] Registration successful: ${hasSuccessLog}`);

    // Step 7: Verify URL is dashboard
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log(`[Test] Current URL: ${currentUrl}`);

    const isDashboard = currentUrl === `${BASE_URL}/` || currentUrl === BASE_URL;
    expect(isDashboard, `Expected dashboard URL, got: ${currentUrl}`).toBe(true);

    // Step 8: Verify dashboard content (not blank, not login form)
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').textContent();
    const hasLoginForm = bodyText?.includes('Login') || bodyText?.includes('Email') || bodyText?.includes('Password');
    const isNotBlank = bodyText && bodyText.length > 100;

    console.log(`[Test] Page has content: ${isNotBlank}`);
    console.log(`[Test] Page is not login form: ${!hasLoginForm}`);

    // Step 9: Take screenshot of successful dashboard
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e-screenshots/02-dashboard-success.png', fullPage: true });

    expect(isNotBlank, 'Dashboard should not be blank').toBe(true);
    expect(hasLoginForm, 'Dashboard should not show login form').toBe(false);

    console.log('✅ TEST 1 PASSED: Registration successful, dashboard loaded');
  });

  test('Test 2: Logout Flow', async ({ page }) => {
    console.log('\n=== TEST 2: LOGOUT FLOW ===');

    // First, register and login
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    await emailInput.fill(TEST_EMAIL);

    const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
    await passwordInput.fill(TEST_PASSWORD);

    const registerButton = page.locator('button:has-text("Create Account"), button:has-text("Register"), button:has-text("Sign Up")').first();
    await registerButton.click();

    await page.waitForTimeout(3000);

    // Step 1: Navigate to settings
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('[Test] Navigated to settings page');

    // Take screenshot of settings page
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e-screenshots/03-settings-page.png', fullPage: true });

    // Step 2: Find and click logout/delete account button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log Out"), button:has-text("Sign Out"), button:has-text("Delete Account")').first();

    const buttonExists = await logoutButton.isVisible({ timeout: 5000 });
    console.log(`[Test] Logout button found: ${buttonExists}`);

    if (buttonExists) {
      await logoutButton.click();
      console.log('[Test] Clicked logout button');

      // If there's a confirmation dialog, confirm it
      await page.waitForTimeout(1000);
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        console.log('[Test] Confirmed logout');
      }
    }

    // Step 3: Verify redirected to login
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log(`[Test] Current URL after logout: ${currentUrl}`);

    const isLoginPage = currentUrl.includes('/login');
    expect(isLoginPage, `Expected login page, got: ${currentUrl}`).toBe(true);

    // Step 4: Verify localStorage token cleared
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    console.log(`[Test] Token in localStorage: ${token}`);
    expect(token, 'Token should be cleared').toBeNull();

    // Take screenshot
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e-screenshots/04-after-logout.png', fullPage: true });

    console.log('✅ TEST 2 PASSED: Logout successful, redirected to login, token cleared');
  });

  test('Test 3: Login with Existing Account', async ({ page }) => {
    console.log('\n=== TEST 3: LOGIN FLOW ===');

    // First, register the account
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    let emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    await emailInput.fill(TEST_EMAIL);

    let passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
    await passwordInput.fill(TEST_PASSWORD);

    const registerButton = page.locator('button:has-text("Create Account"), button:has-text("Register"), button:has-text("Sign Up")').first();
    await registerButton.click();

    await page.waitForTimeout(2000);

    // Logout
    await page.evaluate(() => localStorage.clear());

    // Step 1: Go to login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('[Test] Navigated to login page');

    // Step 2: Enter credentials
    emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    await emailInput.fill(TEST_EMAIL);

    passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
    await passwordInput.fill(TEST_PASSWORD);

    console.log('[Test] Filled login credentials');

    // Take screenshot before login
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e-screenshots/05-before-login.png', fullPage: true });

    // Step 3: Click login button
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Log In"), button:has-text("Sign In")').first();
    await loginButton.click();
    console.log('[Test] Clicked login button');

    // Step 4: Verify redirected to dashboard
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log(`[Test] Current URL after login: ${currentUrl}`);

    const isDashboard = currentUrl === `${BASE_URL}/` || currentUrl === BASE_URL;
    expect(isDashboard, `Expected dashboard URL, got: ${currentUrl}`).toBe(true);

    // Step 5: Verify dashboard loads
    const bodyText = await page.locator('body').textContent();
    const isNotBlank = bodyText && bodyText.length > 100;
    expect(isNotBlank, 'Dashboard should not be blank').toBe(true);

    // Take screenshot
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e-screenshots/06-after-login.png', fullPage: true });

    console.log('✅ TEST 3 PASSED: Login successful, dashboard loaded');
  });

  test('Test 4: Protected Routes', async ({ page }) => {
    console.log('\n=== TEST 4: PROTECTED ROUTES ===');

    // First, register and login
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    await emailInput.fill(TEST_EMAIL);

    const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
    await passwordInput.fill(TEST_PASSWORD);

    const registerButton = page.locator('button:has-text("Create Account"), button:has-text("Register"), button:has-text("Sign Up")').first();
    await registerButton.click();

    await page.waitForTimeout(3000);

    // Step 1: Navigate to analytics
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    let currentUrl = page.url();
    console.log(`[Test] URL after navigating to analytics: ${currentUrl}`);

    const isAnalyticsPage = currentUrl.includes('/analytics');
    expect(isAnalyticsPage, `Expected analytics page, got: ${currentUrl}`).toBe(true);

    // Take screenshot
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e-screenshots/07-analytics-page.png', fullPage: true });

    console.log('[Test] Analytics page loaded successfully');

    // Step 2: Navigate to planner
    await page.goto(`${BASE_URL}/planner`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    currentUrl = page.url();
    console.log(`[Test] URL after navigating to planner: ${currentUrl}`);

    const isPlannerPage = currentUrl.includes('/planner');
    expect(isPlannerPage, `Expected planner page, got: ${currentUrl}`).toBe(true);

    // Take screenshot
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e-screenshots/08-planner-page.png', fullPage: true });

    console.log('[Test] Planner page loaded successfully');

    console.log('✅ TEST 4 PASSED: Protected routes accessible when authenticated');
  });
});
