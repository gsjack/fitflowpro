import { test, expect } from '@playwright/test';

test.describe('Registration E2E Test (Post-Fix)', () => {
  test('should successfully register a new user and navigate to dashboard', async ({ page }) => {
    // Capture all console messages
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      console.log(`[BROWSER ${msg.type().toUpperCase()}]`, text);
    });

    // Capture network errors
    page.on('requestfailed', (request) => {
      console.log('[NETWORK ERROR]', request.url(), request.failure()?.errorText);
    });

    // Navigate to registration page
    console.log('[TEST] Navigating to registration page...');
    await page.goto('http://localhost:8081/register');
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e/screenshots/01-registration-page.png', fullPage: true });
    console.log('[TEST] Registration page loaded');

    // Generate unique email with timestamp
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const password = 'Test123!';

    console.log(`[TEST] Using credentials - Email: ${email}, Password: ${password}`);

    // Fill in registration form
    console.log('[TEST] Filling registration form...');
    const emailInput = page.getByLabel('Email address (required)');
    const passwordInput = page.getByLabel('Password (required)');

    await emailInput.fill(email);
    await passwordInput.fill(password);

    // Experience level is pre-selected as "beginner" by default, no need to change

    // Take screenshot before submit
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e/screenshots/02-form-filled.png', fullPage: true });
    console.log('[TEST] Form filled');

    // Click register button
    console.log('[TEST] Clicking "Create Account" button...');
    const registerButton = page.getByRole('button', { name: /create account/i });
    await registerButton.click();

    // Wait a bit for console logs to appear
    await page.waitForTimeout(500);

    // Take screenshot after button click
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e/screenshots/03-after-click.png', fullPage: true });

    // Wait for navigation to dashboard (or error)
    console.log('[TEST] Waiting for navigation or error...');
    try {
      // Wait for URL to change to dashboard
      await page.waitForURL('http://localhost:8081/', { timeout: 10000 });
      console.log('[TEST] ✅ Navigation to dashboard successful!');

      // Take screenshot of dashboard
      await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e/screenshots/04-dashboard-success.png', fullPage: true });

      // Verify we're on the dashboard
      const currentURL = page.url();
      expect(currentURL).toBe('http://localhost:8081/');

      console.log('[TEST] ✅ Registration flow completed successfully!');
      console.log('[TEST] Console logs captured:', consoleLogs.length);

      // Print all console logs for analysis
      console.log('\n=== ALL CONSOLE LOGS ===');
      consoleLogs.forEach(log => console.log(log));
      console.log('=== END CONSOLE LOGS ===\n');

    } catch (error) {
      console.log('[TEST] ❌ Navigation failed or timed out');
      console.log('[TEST] Current URL:', page.url());

      // Take screenshot of failure state
      await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e/screenshots/04-failure-state.png', fullPage: true });

      // Print all console logs for debugging
      console.log('\n=== ALL CONSOLE LOGS ===');
      consoleLogs.forEach(log => console.log(log));
      console.log('=== END CONSOLE LOGS ===\n');

      // Check for specific error messages
      const hasRegisterLog = consoleLogs.some(log => log.includes('[RegisterScreen] handleRegister called'));
      const hasFormValidLog = consoleLogs.some(log => log.includes('[RegisterScreen] Form valid'));
      const hasSuccessLog = consoleLogs.some(log => log.includes('[RegisterScreen] Registration successful'));
      const hasErrorLog = consoleLogs.some(log => log.includes('error') || log.includes('Error'));

      console.log('\n=== DEBUG INFO ===');
      console.log('Has handleRegister log:', hasRegisterLog);
      console.log('Has form valid log:', hasFormValidLog);
      console.log('Has success log:', hasSuccessLog);
      console.log('Has error log:', hasErrorLog);
      console.log('==================\n');

      throw error;
    }
  });

  test('should successfully login with newly created account', async ({ page }) => {
    // This test runs after registration succeeds
    // We'll use a timestamp-based email that should exist from previous test

    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    });

    // Navigate to login page
    console.log('[TEST] Navigating to login page...');
    await page.goto('http://localhost:8081/login');
    await page.waitForLoadState('networkidle');

    // Create new account for this test
    console.log('[TEST] First, create a new account for login test...');
    await page.goto('http://localhost:8081/register');
    await page.waitForLoadState('networkidle');

    const timestamp = Date.now();
    const email = `login-test-${timestamp}@example.com`;
    const password = 'Test123!';

    // Register first
    await page.getByLabel('Email address (required)').fill(email);
    await page.getByLabel('Password (required)').fill(password);
    await page.getByRole('button', { name: /create account/i }).click();

    // Wait for registration to complete
    await page.waitForURL('http://localhost:8081/', { timeout: 10000 });
    console.log('[TEST] Registration completed, now testing login...');

    // Navigate to login page
    await page.goto('http://localhost:8081/login');
    await page.waitForLoadState('networkidle');

    // Take screenshot of login page
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e/screenshots/05-login-page.png', fullPage: true });

    // Fill in login form
    console.log(`[TEST] Logging in with email: ${email}`);
    await page.getByLabel('Email address (required)').fill(email);
    await page.getByLabel('Password (required)').fill(password);

    // Take screenshot before login
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e/screenshots/06-login-form-filled.png', fullPage: true });

    // Click login button
    console.log('[TEST] Clicking "Sign In" button...');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:8081/', { timeout: 10000 });
    console.log('[TEST] ✅ Login successful!');

    // Take screenshot of dashboard
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/e2e/screenshots/07-dashboard-after-login.png', fullPage: true });

    // Verify we're on the dashboard
    expect(page.url()).toBe('http://localhost:8081/');

    console.log('[TEST] ✅ Login flow completed successfully!');
    console.log('\n=== ALL CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));
    console.log('=== END CONSOLE LOGS ===\n');
  });
});
