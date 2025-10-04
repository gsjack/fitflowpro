import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.beforeAll(() => {
  if (!fs.existsSync('/tmp/screenshots')) {
    fs.mkdirSync('/tmp/screenshots', { recursive: true });
  }
});

test('capture all screens with proper navigation', async ({ page }) => {
  // Set viewport to mobile size
  await page.setViewportSize({ width: 375, height: 812 });

  console.log('1. Navigating to app...');
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Capture login screen
  console.log('2. Capturing AuthScreen (Login tab)...');
  await page.screenshot({ path: '/tmp/screenshots/01-auth-login.png', fullPage: true });

  // Click Register tab
  console.log('3. Switching to Register tab...');
  const registerTab = page.locator('button, [role="tab"]').filter({ hasText: /register/i }).first();
  if (await registerTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await registerTab.click();
    await page.waitForTimeout(500);
    console.log('4. Capturing AuthScreen (Register tab)...');
    await page.screenshot({ path: '/tmp/screenshots/02-auth-register.png', fullPage: true });

    // Switch back to login
    const loginTab = page.locator('button, [role="tab"]').filter({ hasText: /^login$/i }).first();
    await loginTab.click();
    await page.waitForTimeout(500);
  }

  // Perform login
  console.log('5. Logging in...');
  const emailInput = page.locator('input[type="email"], input[placeholder*="mail" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const loginButton = page.locator('button').filter({ hasText: /^login$/i }).first();

  await emailInput.fill('demo@fitflow.test');
  await passwordInput.fill('Password123');
  await loginButton.click();

  // Wait for navigation - look for bottom tab bar
  console.log('6. Waiting for app to load...');
  await page.waitForTimeout(3000);

  // Try to find any tab bar element
  const tabBar = page.locator('[role="tablist"], nav').first();
  const hasTabs = await tabBar.isVisible({ timeout: 5000 }).catch(() => false);

  if (!hasTabs) {
    console.log('No tab bar found - app might not have loaded properly');
    console.log('Current URL:', page.url());

    // Capture current state for debugging
    await page.screenshot({ path: '/tmp/screenshots/03-debug-after-login.png', fullPage: true });

    // Print page content for debugging
    const bodyText = await page.locator('body').textContent();
    console.log('Page content:', bodyText?.substring(0, 500));
  } else {
    // Dashboard screen (default tab)
    console.log('7. Capturing DashboardScreen...');
    await page.screenshot({ path: '/tmp/screenshots/03-dashboard.png', fullPage: true });

    // Navigate to Analytics
    console.log('8. Navigating to Analytics...');
    const analyticsTab = page.locator('[role="tab"]').filter({ hasText: /analytics/i }).first();
    if (await analyticsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await analyticsTab.click();
      await page.waitForTimeout(2000);
      console.log('9. Capturing AnalyticsScreen...');
      await page.screenshot({ path: '/tmp/screenshots/04-analytics.png', fullPage: true });
    }

    // Navigate to Planner
    console.log('10. Navigating to Planner...');
    const plannerTab = page.locator('[role="tab"]').filter({ hasText: /planner/i }).first();
    if (await plannerTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await plannerTab.click();
      await page.waitForTimeout(2000);
      console.log('11. Capturing PlannerScreen...');
      await page.screenshot({ path: '/tmp/screenshots/05-planner.png', fullPage: true });
    }

    // Navigate to Settings
    console.log('12. Navigating to Settings...');
    const settingsTab = page.locator('[role="tab"]').filter({ hasText: /settings/i }).first();
    if (await settingsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsTab.click();
      await page.waitForTimeout(2000);
      console.log('13. Capturing SettingsScreen...');
      await page.screenshot({ path: '/tmp/screenshots/06-settings.png', fullPage: true });
    }

    // Go back to Dashboard and try to start a workout
    console.log('14. Going back to Dashboard...');
    const dashboardTab = page.locator('[role="tab"]').filter({ hasText: /dashboard|home/i }).first();
    if (await dashboardTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dashboardTab.click();
      await page.waitForTimeout(1000);

      // Look for "Start Workout" button
      const startButton = page.locator('button').filter({ hasText: /start.*workout/i }).first();
      if (await startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('15. Starting workout...');
        await startButton.click();
        await page.waitForTimeout(2000);
        console.log('16. Capturing WorkoutScreen...');
        await page.screenshot({ path: '/tmp/screenshots/07-workout.png', fullPage: true });
      }
    }
  }

  console.log('Screenshot capture complete!');
});
