/**
 * Manual Exercise Capture Test
 * Logs sets and captures screenshots showing exercise progression
 */

import { test } from '@playwright/test';

test('capture first 3 exercises with screenshots', async ({ page }) => {
  test.setTimeout(180000);

  console.log('\n🎯 Starting manual exercise capture...\n');

  // Login
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
  await page.waitForTimeout(3000);

  // Navigate to Workout tab
  const workoutTabLink = page.locator('[href*="Workout"]').or(page.locator('text=Workout')).last();
  await workoutTabLink.click();
  await page.waitForTimeout(2000);

  // Capture Exercise 1 - Leg Press
  console.log('📸 Exercise 1 - Leg Press');
  await page.screenshot({ path: '/tmp/exercise-1-before.png', fullPage: true });

  // Log 3 sets for Leg Press
  for (let setNum = 1; setNum <= 3; setNum++) {
    await page.locator('input[placeholder*="Weight"]').first().fill('100');
    await page.waitForTimeout(200);
    await page.locator('input[placeholder*="Reps"]').first().fill('10');
    await page.waitForTimeout(200);

    // Select RIR 3
    const rirButtons = page.locator('button').filter({ hasText: '3' });
    await rirButtons.last().click();
    await page.waitForTimeout(200);

    const completeButton = page
      .locator('button')
      .filter({ hasText: /Complete Set/i })
      .first();
    await completeButton.click();
    console.log(`  ✓ Set ${setNum}/3 logged`);
    await page.waitForTimeout(2000);
  }

  // Capture Exercise 2 - Overhead Press
  await page.waitForTimeout(2000);
  console.log('📸 Exercise 2 - Overhead Press');
  await page.screenshot({ path: '/tmp/exercise-2-before.png', fullPage: true });

  // Log 4 sets for Overhead Press
  for (let setNum = 1; setNum <= 4; setNum++) {
    await page.locator('input[placeholder*="Weight"]').first().fill('60');
    await page.waitForTimeout(200);
    await page.locator('input[placeholder*="Reps"]').first().fill('8');
    await page.waitForTimeout(200);

    const rirButtons = page.locator('button').filter({ hasText: '3' });
    await rirButtons.last().click();
    await page.waitForTimeout(200);

    const completeButton = page
      .locator('button')
      .filter({ hasText: /Complete Set/i })
      .first();
    await completeButton.click();
    console.log(`  ✓ Set ${setNum}/4 logged`);
    await page.waitForTimeout(2000);
  }

  // Capture Exercise 3 - Dumbbell Bench Press
  await page.waitForTimeout(2000);
  console.log('📸 Exercise 3 - Dumbbell Bench Press');
  await page.screenshot({ path: '/tmp/exercise-3-before.png', fullPage: true });

  console.log('\n✅ Screenshots captured:');
  console.log('  /tmp/exercise-1-before.png - Leg Press');
  console.log('  /tmp/exercise-2-before.png - Overhead Press');
  console.log('  /tmp/exercise-3-before.png - Dumbbell Bench Press\n');
});
