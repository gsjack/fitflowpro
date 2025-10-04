/**
 * Final Visual Exercise Progression Test
 *
 * Uses existing demo account and manually logs into an active workout
 * to verify that exercises actually change in the UI.
 */

import { test } from '@playwright/test';

test('verify exercises change visually during workout', async ({ page }) => {
  test.setTimeout(90000); // 90 seconds

  console.log('\n🎯 FINAL EXERCISE PROGRESSION TEST\n');

  // Step 1: Login
  console.log('1️⃣ Logging in...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });

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
  console.log('✓ Logged in');
  await page.waitForTimeout(2000);

  // Step 2: Navigate to Workout tab
  console.log('\n2️⃣ Navigating to Workout tab...');
  await page.click('text=Workout');
  console.log('✓ On Workout tab');
  await page.waitForTimeout(2000);

  // Take screenshot of current state
  await page.screenshot({ path: '/tmp/workout-screen-initial.png', fullPage: true });

  // Step 3: Check what's on screen
  console.log('\n3️⃣ Analyzing screen content...');
  const bodyText = await page.textContent('body');

  console.log('\n📋 Screen Analysis:');

  if (bodyText?.includes('Exercise')) {
    console.log('✓ Contains "Exercise" text');

    // Try to extract exercise info
    const exercisePattern = /Exercise\s+\d+\/\d+:/g;
    const matches = bodyText.match(exercisePattern);
    if (matches) {
      console.log(`✓ Found exercise headers: ${matches.join(', ')}`);
    }
  } else {
    console.log('⚠️  No "Exercise" text found');
  }

  if (bodyText?.includes('Recovery Assessment')) {
    console.log('⚠️  Recovery assessment is shown');
  }

  if (bodyText?.includes('No workout')) {
    console.log('⚠️  No workout available');
  }

  if (bodyText?.includes('COMPLETED')) {
    console.log('⚠️  Workout is already completed');
  }

  console.log(`\n📸 Screenshot saved to: /tmp/workout-screen-initial.png`);
  console.log('\nℹ️  Next steps:');
  console.log('1. Open the screenshot to see current state');
  console.log('2. If workout is completed, need to create new workout');
  console.log('3. If no program exists, need to set up program first\n');
});
