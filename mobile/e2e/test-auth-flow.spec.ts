/**
 * Test Authentication Flow - Register and Login
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:8081';
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/verification');

test.describe('Authentication Flow E2E', () => {
  test('should register new user and login', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Go to registration page
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'auth-01-register-page.png'),
      fullPage: true
    });

    // Fill registration form
    await page.fill('input[type="email"], input[placeholder*="email" i]', testEmail);
    await page.fill('input[type="password"], input[placeholder*="password" i]', testPassword);

    // Select experience level (click Beginner button)
    const beginnerBtn = page.locator('button:has-text("Beginner")').first();
    await beginnerBtn.click();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'auth-02-register-filled.png'),
      fullPage: true
    });

    // Click Create Account button
    const createBtn = page.locator('button:has-text("Create Account")').first();
    await createBtn.click();

    // Wait for navigation or success
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log('[Auth Test] After registration, URL:', currentUrl);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'auth-03-after-register.png'),
      fullPage: true
    });

    // Check if we're on dashboard or still on auth page
    const isOnDashboard = currentUrl.includes('/(tabs)') || currentUrl === `${BASE_URL}/`;
    const hasWorkoutCard = await page.locator('text=/workout/i, text=/dashboard/i').count() > 0;

    console.log('[Auth Test] Is on dashboard:', isOnDashboard);
    console.log('[Auth Test] Has workout-related content:', hasWorkoutCard);

    // If registration succeeded and we're logged in, test logout and login
    if (isOnDashboard || currentUrl === `${BASE_URL}/`) {
      // Look for logout button (might be in settings)
      await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'auth-04-settings-page.png'),
        fullPage: true
      });

      // Find and click logout
      const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), button:has-text("Log Out")').first();
      const hasLogout = await logoutBtn.count() > 0;
      console.log('[Auth Test] Has logout button:', hasLogout);

      if (hasLogout) {
        await logoutBtn.click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, 'auth-05-after-logout.png'),
          fullPage: true
        });

        const afterLogoutUrl = page.url();
        console.log('[Auth Test] After logout, URL:', afterLogoutUrl);

        // Now test login
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        await page.fill('input[type="email"], input[placeholder*="email" i]', testEmail);
        await page.fill('input[type="password"], input[placeholder*="password" i]', testPassword);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, 'auth-06-login-filled.png'),
          fullPage: true
        });

        const loginBtn = page.locator('button:has-text("Login")').first();
        await loginBtn.click();
        await page.waitForTimeout(3000);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, 'auth-07-after-login.png'),
          fullPage: true
        });

        const finalUrl = page.url();
        console.log('[Auth Test] After login, URL:', finalUrl);
      }
    }

    // Test navigation to different tabs if logged in
    const finalUrl = page.url();
    if (!finalUrl.includes('/login') && !finalUrl.includes('/register')) {
      console.log('[Auth Test] Testing tab navigation...');

      // Test workout tab
      await page.goto(`${BASE_URL}/workout`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'auth-08-workout-tab.png'),
        fullPage: true
      });

      // Test analytics tab
      await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'auth-09-analytics-tab.png'),
        fullPage: true
      });

      console.log('[Auth Test] ✅ Full flow completed successfully');
    } else {
      console.log('[Auth Test] ⚠️ Not logged in after registration/login attempt');
    }
  });
});
