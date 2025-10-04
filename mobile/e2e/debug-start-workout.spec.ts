/**
 * Debug test to check workout start flow
 */

import { test, expect } from '@playwright/test';

test('debug workout start', async ({ page }) => {
  test.setTimeout(60000);

  console.log('\n=== DEBUG: Workout Start Flow ===\n');

  // Step 1: Load app
  console.log('1. Loading app...');
  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  // Step 2: Login
  console.log('2. Logging in...');
  const loginTab = page
    .locator('button')
    .filter({ hasText: /^Login$/i })
    .first();
  await loginTab.click();
  await page.waitForTimeout(500);

  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');

  const loginButton = page
    .locator('button')
    .filter({ hasText: /^Login$/i })
    .last();
  await loginButton.click();
  await page.waitForTimeout(3000);

  console.log('✓ Logged in');

  // Step 3: Take screenshot of dashboard
  await page.screenshot({ path: '/tmp/debug-01-dashboard.png', fullPage: true });
  console.log('✓ Dashboard screenshot saved');

  // Step 4: Get all text content
  const bodyText = await page.textContent('body');
  console.log('\n=== Dashboard Content ===');
  console.log(bodyText?.substring(0, 1000));
  console.log('========================\n');

  // Step 5: Check for Start Workout button
  const startButton = page.locator('button').filter({ hasText: /Start Workout/i });
  const startButtonCount = await startButton.count();
  console.log(`Start Workout button count: ${startButtonCount}`);

  if (startButtonCount > 0) {
    console.log('✓ Start Workout button found - clicking it');
    await startButton.click();
    await page.waitForTimeout(2000);
    console.log('✓ Start Workout button clicked');
  } else {
    console.log('✗ Start Workout button NOT found');
    console.log('Looking for other workout-related buttons...');

    const allButtons = await page.locator('button').all();
    console.log(`Total buttons on page: ${allButtons.length}`);

    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const text = await allButtons[i].textContent();
      console.log(`  Button ${i + 1}: "${text}"`);
    }
  }

  // Step 6: Navigate to Workout tab
  console.log('\n6. Navigating to Workout tab...');
  const workoutTab = page.locator('button, a').filter({ hasText: /^Workout$/i });
  await workoutTab.click();
  console.log('✓ Clicked Workout tab');

  await page.waitForTimeout(3000);

  // Step 7: Take screenshot of workout screen
  await page.screenshot({ path: '/tmp/debug-02-workout-screen.png', fullPage: true });
  console.log('✓ Workout screen screenshot saved');

  // Step 8: Get workout screen content
  const workoutText = await page.textContent('body');
  console.log('\n=== Workout Screen Content ===');
  console.log(workoutText?.substring(0, 1000));
  console.log('==============================\n');

  console.log('✓ Debug test completed');
});
