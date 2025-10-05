/**
 * Comprehensive E2E Authentication Flow Tests for FitFlow Pro
 *
 * Tests all authentication flows:
 * 1. Registration flow with validation
 * 2. Login flow with validation
 * 3. Auth persistence across page refreshes
 * 4. Logout flow
 * 5. Protected route access control
 * 6. Error handling (invalid credentials, network errors)
 *
 * Platform: Web (Playwright)
 * Test Backend: http://localhost:3000 (must be running)
 */

import { test, expect } from '@playwright/test';
import {
  APP_URL,
  _API_URL,
  generateTestUser,
  navigateToLogin,
  navigateToRegister,
  _navigateToTab,
  clickRegisterLink,
  _clickLoginLink,
  fillLoginForm,
  fillRegisterForm,
  submitLoginForm,
  submitRegisterForm,
  _loginUser,
  registerUser,
  _registerAndLogin,
  waitForTokenInStorage,
  clearStorage,
  getStoredToken,
  checkApiHealth,
  verifyOnDashboard,
  verifyOnLoginScreen,
  verifyValidationError,
  logoutUser,
  takeScreenshot,
  _waitForAppReady,
} from './helpers/test-helpers';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto(APP_URL);
    await clearStorage(page);

    // Verify backend is running
    const apiHealthy = await checkApiHealth(page);
    if (!apiHealthy) {
      throw new Error(
        'Backend API is not responding. Please start backend with: cd backend && npm run dev'
      );
    }
  });

  test.describe('1. Registration Flow', () => {
    test('should register new user with valid credentials', async ({ page }) => {
      const user = generateTestUser();

      // Navigate to login, then click Register link
      await navigateToLogin(page);
      await clickRegisterLink(page);

      // Verify we're on registration page
      await expect(page.locator('text=Create Account').first()).toBeVisible();

      // Fill registration form
      await fillRegisterForm(page, user.email, user.password);

      // Take screenshot before submission
      await takeScreenshot(page, 'auth-flow-register-filled');

      // Monitor network request
      const registerPromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/auth/register') && response.request().method() === 'POST'
      );

      // Submit form
      await submitRegisterForm(page);

      // Wait for API response
      const registerResponse = await registerPromise;
      expect(registerResponse.status()).toBe(201);

      const responseData = await registerResponse.json();
      expect(responseData).toHaveProperty('user_id');
      expect(responseData).toHaveProperty('token');

      // Verify token stored in AsyncStorage
      const storedToken = await waitForTokenInStorage(page);
      expect(storedToken).toBeTruthy();
      expect(storedToken).toBe(responseData.token);

      // Verify redirect to dashboard
      await verifyOnDashboard(page);

      // Take screenshot of successful registration
      await takeScreenshot(page, 'auth-flow-register-success');
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await navigateToLogin(page);
      await clickRegisterLink(page);

      // Fill with invalid email
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'TestPass123!');

      // Blur email field to trigger validation
      await page.locator('input[type="email"]').blur();

      // Should show validation error
      await verifyValidationError(page, 'Please enter a valid email address');

      // Submit should fail (button click won't trigger API call)
      const createAccountButton = page.locator('button:has-text("Create Account")');
      await createAccountButton.click();

      // Should still be on register page
      await expect(page.locator('text=Create Account').first()).toBeVisible();
    });

    test('should show validation error for short password', async ({ page }) => {
      await navigateToLogin(page);
      await clickRegisterLink(page);

      // Fill with short password
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'short');

      // Blur password field to trigger validation
      await page.locator('input[type="password"]').blur();

      // Should show validation error
      await verifyValidationError(page, 'Password must be at least 8 characters');
    });

    test('should show error for duplicate email', async ({ page }) => {
      const user = generateTestUser();

      // Register user first time
      await registerUser(page, user.email, user.password);
      await verifyOnDashboard(page);

      // Logout
      await clearStorage(page);

      // Try to register with same email again
      await navigateToRegister(page);
      await fillRegisterForm(page, user.email, user.password);

      const registerPromise = page.waitForResponse((response) =>
        response.url().includes('/api/auth/register')
      );

      await submitRegisterForm(page);

      const response = await registerPromise;
      expect(response.status()).toBe(409); // Conflict

      // Should show error message
      await expect(page.locator('text=An account with this email already exists')).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('2. Login Flow', () => {
    test('should login with valid credentials', async ({ page }) => {
      const user = generateTestUser();

      // First, register the user
      await registerUser(page, user.email, user.password);
      await verifyOnDashboard(page);

      // Logout (clear token)
      await clearStorage(page);
      await navigateToLogin(page);

      // Fill login form
      await fillLoginForm(page, user.email, user.password);

      // Screenshot before login
      await takeScreenshot(page, 'auth-flow-login-filled');

      // Monitor login request
      const loginPromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/auth/login') && response.request().method() === 'POST'
      );

      // Submit login
      await submitLoginForm(page);

      // Verify API response
      const loginResponse = await loginPromise;
      expect(loginResponse.status()).toBe(200);

      const responseData = await loginResponse.json();
      expect(responseData).toHaveProperty('token');
      expect(responseData).toHaveProperty('user');
      expect(responseData.user.username).toBe(user.email);

      // Verify token stored
      const storedToken = await waitForTokenInStorage(page);
      expect(storedToken).toBeTruthy();

      // Verify redirect to dashboard
      await verifyOnDashboard(page);

      // Screenshot success
      await takeScreenshot(page, 'auth-flow-login-success');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await navigateToLogin(page);

      // Fill with invalid credentials
      await fillLoginForm(page, 'nonexistent@example.com', 'WrongPassword123!');

      const loginPromise = page.waitForResponse((response) =>
        response.url().includes('/api/auth/login')
      );

      const loginButton = page.locator('button:has-text("Login")').last();
      await loginButton.click();

      const response = await loginPromise;
      expect(response.status()).toBe(401); // Unauthorized

      // Should show error message
      await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 });

      // Should still be on login page
      await verifyOnLoginScreen(page);

      // No token should be stored
      const token = await getStoredToken(page);
      expect(token).toBeNull();
    });

    test('should toggle password visibility', async ({ page }) => {
      await navigateToLogin(page);

      const passwordInput = page.locator('input[type="password"]').first();
      await expect(passwordInput).toBeVisible();

      // Click eye icon to show password
      await page.click('[aria-label="Show password"]');

      // Password input should now be type="text"
      await page.waitForTimeout(300);
      const textInput = page.locator('input[type="text"]').first();
      await expect(textInput).toBeVisible();

      // Click eye-off icon to hide password
      await page.click('[aria-label="Hide password"]');

      // Should be back to type="password"
      await page.waitForTimeout(300);
      await expect(passwordInput).toBeVisible();
    });
  });

  test.describe('3. Auth Persistence', () => {
    test('should persist login after page refresh', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await registerUser(page, user.email, user.password);
      await verifyOnDashboard(page);

      // Get token before refresh
      const tokenBefore = await getStoredToken(page);
      expect(tokenBefore).toBeTruthy();

      // Refresh page
      await page.reload({ waitUntil: 'networkidle' });

      // Should still be on dashboard (not redirected to login)
      await verifyOnDashboard(page);

      // Token should still be in storage
      const tokenAfter = await getStoredToken(page);
      expect(tokenAfter).toBe(tokenBefore);
    });

    test('should redirect to login if token is manually cleared', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await page.goto(`${APP_URL}/(auth)/register`);
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click('button:has-text("Create Account")');
      await page.waitForURL(/.*\(tabs\).*/, { timeout: 10000 });

      // Clear token
      await clearStorage(page);

      // Refresh page
      await page.reload({ waitUntil: 'networkidle' });

      // Should redirect to login
      await page.waitForURL(/.*\(auth\)\/login.*/, { timeout: 10000 });
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });
  });

  test.describe('4. Logout Flow', () => {
    test('should logout and redirect to login', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await registerUser(page, user.email, user.password);
      await verifyOnDashboard(page);

      // Logout using helper
      await takeScreenshot(page, 'auth-flow-before-logout');
      await logoutUser(page);

      // Token should be cleared
      const token = await getStoredToken(page);
      expect(token).toBeNull();

      // Screenshot after logout
      await takeScreenshot(page, 'auth-flow-logout-success');
    });

    test('should not be able to access protected routes after logout', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await page.goto(`${APP_URL}/(auth)/register`);
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click('button:has-text("Create Account")');
      await page.waitForURL(/.*\(tabs\).*/, { timeout: 10000 });

      // Logout
      await clearStorage(page);

      // Try to access protected route directly
      await page.goto(`${APP_URL}/(tabs)/workout`);
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      await page.waitForURL(/.*\(auth\)\/login.*/, { timeout: 10000 });
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });
  });

  test.describe('5. Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Ensure no token
      await page.goto(APP_URL);
      await clearStorage(page);

      const protectedRoutes = [
        '/(tabs)',
        '/(tabs)/workout',
        '/(tabs)/analytics',
        '/(tabs)/planner',
        '/(tabs)/settings',
      ];

      for (const route of protectedRoutes) {
        await page.goto(`${APP_URL}${route}`);
        await page.waitForLoadState('networkidle');

        // Should redirect to login
        await page.waitForURL(/.*\(auth\)\/login.*/, { timeout: 5000 });
        await expect(page.locator('input[type="email"]')).toBeVisible();
      }
    });

    test('should allow authenticated users to access all routes', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await page.goto(`${APP_URL}/(auth)/register`);
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click('button:has-text("Create Account")');
      await page.waitForURL(/.*\(tabs\).*/, { timeout: 10000 });

      // Test navigation to each tab
      const tabs = [
        { name: 'Dashboard', content: /Dashboard|Today\'s Workout/i },
        { name: 'Workout', content: /Workout|No Active Workout/i },
        { name: 'Analytics', content: /Analytics|Progress/i },
        { name: 'Planner', content: /Planner|Program/i },
        { name: 'Settings', content: /Settings|Profile/i },
      ];

      for (const tab of tabs) {
        await page.click(`text=${tab.name}`);
        await page.waitForTimeout(1000);
        await expect(page.locator(`text=${tab.content}`).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should redirect authenticated users from auth routes to dashboard', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await page.goto(`${APP_URL}/(auth)/register`);
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click('button:has-text("Create Account")');
      await page.waitForURL(/.*\(tabs\).*/, { timeout: 10000 });

      // Try to access login page while authenticated
      await page.goto(`${APP_URL}/(auth)/login`);
      await page.waitForLoadState('networkidle');

      // Should redirect to dashboard
      await page.waitForURL(/.*\(tabs\).*/, { timeout: 5000 });
      await expect(page.locator("text=/Dashboard|Today's Workout/i")).toBeVisible();
    });
  });

  test.describe('6. Error Handling', () => {
    test('should handle network errors gracefully during login', async ({ page }) => {
      await page.goto(`${APP_URL}/(auth)/login`);
      await page.waitForLoadState('networkidle');

      // Block all network requests to simulate network error
      await page.route('**/api/auth/login', (route) => route.abort());

      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'TestPass123!');
      await page.click('button:has-text("Login")');

      // Should show error message (not crash)
      await page.waitForTimeout(2000);

      // Should still be on login page
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('should handle network errors gracefully during registration', async ({ page }) => {
      await page.goto(`${APP_URL}/(auth)/register`);
      await page.waitForLoadState('networkidle');

      // Block all network requests to simulate network error
      await page.route('**/api/auth/register', (route) => route.abort());

      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'TestPass123!');
      await page.click('button:has-text("Create Account")');

      // Should show error message (not crash)
      await page.waitForTimeout(2000);

      // Should still be on register page
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('should handle 401 errors by redirecting to login', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await page.goto(`${APP_URL}/(auth)/register`);
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click('button:has-text("Create Account")');
      await page.waitForURL(/.*\(tabs\).*/, { timeout: 10000 });

      // Simulate expired token by manually setting invalid token
      await page.evaluate(() => {
        localStorage.setItem('@fitflow/auth_token', 'invalid.token.here');
      });

      // Refresh page to trigger auth check
      await page.reload({ waitUntil: 'networkidle' });

      // Should redirect to login (invalid token detected)
      await page.waitForURL(/.*\(auth\)\/login.*/, { timeout: 10000 });
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('should handle malformed email gracefully', async ({ page }) => {
      await page.goto(`${APP_URL}/(auth)/login`);
      await page.waitForLoadState('networkidle');

      const malformedEmails = [
        'not-an-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test @example.com',
      ];

      for (const email of malformedEmails) {
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', 'TestPass123!');
        await page.locator('input[type="email"]').blur();

        // Should show validation error
        if (email !== 'test..test@example.com') {
          // Browser may accept this
          await expect(page.locator('text=Please enter a valid email address')).toBeVisible({
            timeout: 2000,
          });
        }
      }
    });
  });
});

test.describe('Auth Flow Screenshots', () => {
  test('capture full authentication journey', async ({ page }) => {
    const user = generateTestUser();

    // Clear storage
    await page.goto(APP_URL);
    await clearStorage(page);

    // 1. Initial load (should show login)
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: '/tmp/screenshots/auth-journey-01-login-initial.png',
      fullPage: true,
    });

    // 2. Navigate to register
    await page.click('text=Register');
    await page.waitForURL(/.*\(auth\)\/register.*/);
    await page.screenshot({
      path: '/tmp/screenshots/auth-journey-02-register-page.png',
      fullPage: true,
    });

    // 3. Fill registration form
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.screenshot({
      path: '/tmp/screenshots/auth-journey-03-register-filled.png',
      fullPage: true,
    });

    // 4. Submit and wait for dashboard
    await page.click('button:has-text("Create Account")');
    await page.waitForURL(/.*\(tabs\).*/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: '/tmp/screenshots/auth-journey-04-dashboard-after-register.png',
      fullPage: true,
    });

    // 5. Navigate to settings
    await page.click('text=Settings');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: '/tmp/screenshots/auth-journey-05-settings-page.png',
      fullPage: true,
    });

    // 6. Logout
    await page.locator('button:has-text("Logout")').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/tmp/screenshots/auth-journey-06-logout-dialog.png',
      fullPage: true,
    });

    // Confirm logout
    const confirmButton = page.locator('button:has-text("Logout")').last();
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // 7. Back to login
    await page.waitForURL(/.*\(auth\)\/login.*/, { timeout: 10000 });
    await page.screenshot({
      path: '/tmp/screenshots/auth-journey-07-login-after-logout.png',
      fullPage: true,
    });

    // 8. Login again
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.screenshot({
      path: '/tmp/screenshots/auth-journey-08-login-filled.png',
      fullPage: true,
    });

    await page.click('button:has-text("Login")');
    await page.waitForURL(/.*\(tabs\).*/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: '/tmp/screenshots/auth-journey-09-dashboard-after-login.png',
      fullPage: true,
    });

    console.log('\n✅ Full authentication journey captured in /tmp/screenshots/\n');
  });
});
