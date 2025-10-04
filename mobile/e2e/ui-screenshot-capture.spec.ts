import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.beforeAll(() => {
  // Create screenshots directory
  if (!fs.existsSync('/tmp/screenshots')) {
    fs.mkdirSync('/tmp/screenshots', { recursive: true });
  }
});

test('capture UI screenshots for visual design review', async ({ page }) => {
  // Navigate to app
  console.log('Navigating to app...');
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for initial render

  // 1. Login screen (before login)
  console.log('Capturing login screen...');
  await page.screenshot({ path: '/tmp/screenshots/01-login.png', fullPage: true });

  // Find and fill login form
  console.log('Filling login form...');

  // Try different selectors for email input
  const emailInput = page
    .locator('input[type="email"]')
    .or(page.locator('input[placeholder*="mail" i]'))
    .or(page.locator('input').filter({ hasText: /email/i }))
    .first();

  const passwordInput = page
    .locator('input[type="password"]')
    .or(page.locator('input[placeholder*="password" i]'))
    .first();

  await emailInput.fill('demo@fitflow.test');
  await passwordInput.fill('Password123');

  // Find login button - try multiple strategies
  const loginButton = page
    .locator('button')
    .filter({ hasText: /^(login|sign in)$/i })
    .first();

  console.log('Clicking login button...');
  await loginButton.click();

  // Wait for navigation/login to complete - look for dashboard elements
  console.log('Waiting for dashboard to load...');
  await page.waitForTimeout(2000);

  // Wait for either "FitFlow Pro" header or any tab bar element
  try {
    await page.waitForSelector('text=/FitFlow Pro/i', { timeout: 5000 });
  } catch (e) {
    console.log('Dashboard header not found immediately, waiting longer...');
    await page.waitForTimeout(3000);
  }

  // 2. Dashboard screen
  console.log('Capturing dashboard screen...');
  await page.screenshot({ path: '/tmp/screenshots/02-dashboard.png', fullPage: true });

  // Try to navigate to workout tab
  console.log('Navigating to workout screen...');
  const workoutTab = page
    .locator('button, [role="tab"]')
    .filter({ hasText: /workout/i })
    .first();

  if (await workoutTab.isVisible()) {
    await workoutTab.click();
    await page.waitForTimeout(1500);

    // 3. Workout screen
    console.log('Capturing workout screen...');
    await page.screenshot({ path: '/tmp/screenshots/03-workout.png', fullPage: true });
  } else {
    console.log('Workout tab not found, skipping workout screen');
  }

  // Try to navigate to analytics tab
  console.log('Navigating to analytics screen...');
  const analyticsTab = page
    .locator('button, [role="tab"]')
    .filter({ hasText: /analytics/i })
    .first();

  if (await analyticsTab.isVisible()) {
    await analyticsTab.click();
    await page.waitForTimeout(1500);

    // 4. Analytics screen
    console.log('Capturing analytics screen...');
    await page.screenshot({ path: '/tmp/screenshots/04-analytics.png', fullPage: true });
  } else {
    console.log('Analytics tab not found, skipping analytics screen');
  }

  // Try to navigate to settings
  console.log('Looking for settings...');
  const settingsTab = page
    .locator('button, [role="tab"]')
    .filter({ hasText: /settings/i })
    .first();

  if (await settingsTab.isVisible()) {
    await settingsTab.click();
    await page.waitForTimeout(1500);

    // 5. Settings screen
    console.log('Capturing settings screen...');
    await page.screenshot({ path: '/tmp/screenshots/05-settings.png', fullPage: true });
  } else {
    console.log('Settings tab not found, skipping settings screen');
  }

  console.log('Screenshot capture complete!');
});
