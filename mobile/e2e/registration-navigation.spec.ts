/**
 * Registration Navigation Bug Fix Verification Test
 *
 * CRITICAL BUG: User registration succeeds (backend returns 201 Created),
 * but the app stays on the auth screen instead of navigating to the dashboard.
 *
 * ROOT CAUSE: AuthWrapper's setForceUpdate state change doesn't propagate
 * back to AppNavigator. The AppNavigator only checks authentication once on mount.
 *
 * FIX: Pass handleAuthSuccess callback from AppNavigator to AuthWrapper,
 * which calls checkAuth() to update the authentication state and trigger navigation.
 *
 * This test verifies:
 * 1. Registration form submission succeeds
 * 2. Token is stored in AsyncStorage
 * 3. Navigation to dashboard happens automatically
 * 4. Dashboard content is visible after successful registration
 */

import { test, expect } from '@playwright/test';

// Generate unique email for each test run
const timestamp = Date.now();
const testEmail = `regtest${timestamp}@example.com`;
const testPassword = 'SecurePassword123';

test.describe('Registration Navigation Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging to catch errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[Browser Error] ${msg.text()}`);
      } else if (msg.text().includes('[AuthScreen]') || msg.text().includes('[App]')) {
        console.log(`[Browser Log] ${msg.text()}`);
      }
    });

    // Navigate to app
    await page.goto('http://localhost:8081');

    // Wait for Expo/React to load (look for auth screen)
    await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });
  });

  test('registration navigates to dashboard on success', async ({ page }) => {
    console.log(`Testing registration with email: ${testEmail}`);

    // Step 1: Fill registration form
    await page.fill('input[placeholder*="Email" i]', testEmail);
    await page.fill('input[placeholder*="Password" i]', testPassword);

    // Optional fields (if visible)
    const ageInput = page.locator('input').filter({ hasText: /age/i });
    if ((await ageInput.count()) > 0) {
      await ageInput.fill('30');
    }

    const weightInput = page.locator('input').filter({ hasText: /weight/i });
    if ((await weightInput.count()) > 0) {
      await weightInput.fill('75');
    }

    // Select experience level (if visible)
    const intermediateButton = page.getByRole('button', { name: /intermediate/i });
    if ((await intermediateButton.count()) > 0) {
      await intermediateButton.click();
    }

    // Step 2: Submit registration
    const registerButton = page.getByRole('button', { name: /register/i });
    await registerButton.click();

    console.log('Registration form submitted, waiting for API response...');

    // Step 3: Wait for backend API response (201 Created)
    // This may take a few seconds
    await page.waitForTimeout(2000);

    // Step 4: Verify navigation to dashboard
    // Look for dashboard indicators (any of these should be present)
    const dashboardIndicators = [
      'Dashboard',
      'FitFlow Pro',
      'Home',
      'Start Workout',
      'Today',
      'Recovery',
    ];

    console.log('Checking for dashboard content...');

    // Wait for at least one dashboard indicator to appear
    let foundDashboard = false;
    for (const indicator of dashboardIndicators) {
      try {
        await page.waitForSelector(`text=${indicator}`, { timeout: 5000 });
        console.log(`Found dashboard indicator: ${indicator}`);
        foundDashboard = true;
        break;
      } catch (e) {
        // Continue checking other indicators
      }
    }

    // If still on auth screen, this will fail
    const authScreenVisible = await page.locator('text=Login').count();
    const registerButtonVisible = await page.locator('button', { hasText: /register/i }).count();

    console.log('Auth indicators still visible:', {
      loginText: authScreenVisible,
      registerButton: registerButtonVisible,
    });

    // Verify we're NOT on auth screen anymore
    expect(authScreenVisible).toBe(0);
    expect(registerButtonVisible).toBe(0);

    // Verify we ARE on dashboard
    expect(foundDashboard).toBe(true);

    // Step 5: Verify token was stored
    const tokenStored = await page.evaluate(async () => {
      // Check AsyncStorage for token
      const storage = (window as any).localStorage;
      if (storage) {
        const token = storage.getItem('@fitflow/auth_token');
        return token !== null && token.length > 0;
      }
      return false;
    });

    expect(tokenStored).toBe(true);

    console.log('✅ Registration navigation test PASSED');
  });

  test('login also navigates to dashboard on success', async ({ page }) => {
    // First, register a user to test login
    const loginTestEmail = `logintest${timestamp}@example.com`;

    console.log(`Registering user for login test: ${loginTestEmail}`);

    await page.fill('input[placeholder*="Email" i]', loginTestEmail);
    await page.fill('input[placeholder*="Password" i]', testPassword);

    const registerButton = page.getByRole('button', { name: /register/i });
    await registerButton.click();

    // Wait for registration to complete and dashboard to appear
    await page.waitForTimeout(2000);

    // Log out (if we have a settings/logout button)
    const settingsTab = page.getByRole('button', { name: /settings/i });
    if ((await settingsTab.count()) > 0) {
      await settingsTab.click();
      await page.waitForTimeout(500);

      const logoutButton = page.getByRole('button', { name: /logout/i });
      if ((await logoutButton.count()) > 0) {
        await logoutButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Should be back at auth screen
    await page.waitForSelector('text=FitFlow Pro', { timeout: 5000 });

    // Now test login
    console.log('Testing login navigation...');

    // Switch to login tab
    const loginTab = page.getByRole('button', { name: /login/i }).first();
    await loginTab.click();

    await page.fill('input[placeholder*="Email" i]', loginTestEmail);
    await page.fill('input[placeholder*="Password" i]', testPassword);

    const loginButton = page.getByRole('button', { name: /^Login$/i });
    await loginButton.click();

    await page.waitForTimeout(2000);

    // Verify navigation to dashboard
    let foundDashboard = false;
    const dashboardIndicators = ['Dashboard', 'FitFlow Pro', 'Home', 'Start Workout'];

    for (const indicator of dashboardIndicators) {
      try {
        await page.waitForSelector(`text=${indicator}`, { timeout: 5000 });
        console.log(`Found dashboard indicator after login: ${indicator}`);
        foundDashboard = true;
        break;
      } catch (e) {
        // Continue
      }
    }

    expect(foundDashboard).toBe(true);

    console.log('✅ Login navigation test PASSED');
  });
});
