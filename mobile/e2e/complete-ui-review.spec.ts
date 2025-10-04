import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.beforeAll(() => {
  const dirs = ['/tmp/screenshots/after', '/tmp/screenshots/before'];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
});

test('capture all screens for comprehensive UI review', async ({ page }) => {
  console.log('\n=== STARTING COMPLETE UI REVIEW ===\n');

  // Navigate to app
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // ===== SCREEN 1: AUTH/LOGIN =====
  console.log('📸 Capturing: Login Screen');
  await page.screenshot({
    path: '/tmp/screenshots/after/01-login.png',
    fullPage: true,
  });

  // Fill login credentials
  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');

  // Capture filled form
  await page.screenshot({
    path: '/tmp/screenshots/after/01-login-filled.png',
    fullPage: true,
  });

  // Click login button (last "Login" button is the submit button)
  console.log('🔐 Logging in...');
  const loginButtons = page.getByRole('button', { name: /^login$/i });
  await loginButtons.last().click();

  // Wait for navigation to dashboard
  await page.waitForTimeout(3000);

  // ===== SCREEN 2: DASHBOARD =====
  console.log('📸 Capturing: Dashboard Screen');
  await page.screenshot({
    path: '/tmp/screenshots/after/02-dashboard.png',
    fullPage: true,
  });

  // Check if we're logged in by looking for dashboard elements
  const hasDashboard = (await page.locator('text=/today.*workout|recovery/i').count()) > 0;
  console.log(`Dashboard loaded: ${hasDashboard}`);

  if (!hasDashboard) {
    console.error('❌ Login failed - Dashboard not visible');
    return;
  }

  // ===== SCREEN 3: WORKOUT =====
  console.log('📸 Capturing: Workout Screen');
  // Click on Workout tab in bottom navigation
  const workoutTab = page.locator('text=/^workout$/i').first();
  if (await workoutTab.isVisible()) {
    await workoutTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: '/tmp/screenshots/after/03-workout.png',
      fullPage: true,
    });
  } else {
    console.log('⚠️  Workout tab not found, looking for alternative...');
    // Try finding by tab bar button
    const tabButtons = page.locator('[role="button"]');
    const count = await tabButtons.count();
    for (let i = 0; i < count; i++) {
      const text = await tabButtons.nth(i).textContent();
      if (text?.toLowerCase().includes('workout')) {
        await tabButtons.nth(i).click();
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: '/tmp/screenshots/after/03-workout.png',
          fullPage: true,
        });
        break;
      }
    }
  }

  // ===== SCREEN 4: ANALYTICS =====
  console.log('📸 Capturing: Analytics Screen');
  const analyticsTab = page.locator('text=/^analytics$/i').first();
  if (await analyticsTab.isVisible()) {
    await analyticsTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: '/tmp/screenshots/after/04-analytics.png',
      fullPage: true,
    });
  } else {
    console.log('⚠️  Analytics tab not found, looking for alternative...');
    const tabButtons = page.locator('[role="button"]');
    const count = await tabButtons.count();
    for (let i = 0; i < count; i++) {
      const text = await tabButtons.nth(i).textContent();
      if (text?.toLowerCase().includes('analytics')) {
        await tabButtons.nth(i).click();
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: '/tmp/screenshots/after/04-analytics.png',
          fullPage: true,
        });
        break;
      }
    }
  }

  // ===== SCREEN 5: PLANNER =====
  console.log('📸 Capturing: Planner Screen');
  const plannerTab = page.locator('text=/^planner$/i').first();
  if (await plannerTab.isVisible()) {
    await plannerTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: '/tmp/screenshots/after/05-planner.png',
      fullPage: true,
    });
  } else {
    console.log('⚠️  Planner tab not found, looking for alternative...');
    const tabButtons = page.locator('[role="button"]');
    const count = await tabButtons.count();
    for (let i = 0; i < count; i++) {
      const text = await tabButtons.nth(i).textContent();
      if (text?.toLowerCase().includes('planner')) {
        await tabButtons.nth(i).click();
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: '/tmp/screenshots/after/05-planner.png',
          fullPage: true,
        });
        break;
      }
    }
  }

  // ===== SCREEN 6: SETTINGS =====
  console.log('📸 Capturing: Settings Screen');
  const settingsTab = page.locator('text=/^settings$/i').first();
  if (await settingsTab.isVisible()) {
    await settingsTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: '/tmp/screenshots/after/06-settings.png',
      fullPage: true,
    });
  } else {
    console.log('⚠️  Settings tab not found, looking for alternative...');
    const tabButtons = page.locator('[role="button"]');
    const count = await tabButtons.count();
    for (let i = 0; i < count; i++) {
      const text = await tabButtons.nth(i).textContent();
      if (text?.toLowerCase().includes('settings')) {
        await tabButtons.nth(i).click();
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: '/tmp/screenshots/after/06-settings.png',
          fullPage: true,
        });
        break;
      }
    }
  }

  // Go back to Dashboard for final capture
  console.log('📸 Capturing: Final Dashboard View');
  const homeTab = page.locator('text=/^home$/i').first();
  if (await homeTab.isVisible()) {
    await homeTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: '/tmp/screenshots/after/07-dashboard-final.png',
      fullPage: true,
    });
  }

  console.log('\n=== SCREENSHOT CAPTURE COMPLETE ===\n');
  console.log('Screenshots saved to: /tmp/screenshots/after/\n');

  // List all captured screenshots
  const screenshotDir = '/tmp/screenshots/after';
  if (fs.existsSync(screenshotDir)) {
    const files = fs.readdirSync(screenshotDir);
    console.log('Captured screenshots:');
    files.forEach((file) => {
      const stats = fs.statSync(path.join(screenshotDir, file));
      console.log(`  ✓ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    });
  }
});
