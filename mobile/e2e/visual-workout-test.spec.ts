import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('visual verification - exercises change on UI', async ({ page }) => {
  test.setTimeout(180000); // 3 minutes

  // Create screenshots directory
  const screenshotDir = path.join(__dirname, '../test-results/visual-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Login
  await page.goto('http://localhost:8081');
  await page.waitForTimeout(3000);
  const loginTab = page.locator('button').filter({ hasText: /^Login$/i }).first();
  await loginTab.click();
  await page.waitForTimeout(1000);
  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');
  const loginButton = page.locator('button').filter({ hasText: /^Login$/i }).last();
  await loginButton.click();
  await page.waitForTimeout(3000);

  // Start workout
  const startButton = page.locator('button').filter({ hasText: /Start Workout/i });
  await startButton.click();
  await page.waitForTimeout(2000);

  // Go to workout tab
  const workoutTab = page.locator('button[role="tab"]').filter({ hasText: /Workout/i });
  await workoutTab.click();
  await page.waitForTimeout(2000);

  console.log('\n=== VISUAL TEST: EXERCISE CHANGES ===\n');

  // Log first 3 exercises to verify UI updates
  for (let exerciseNum = 1; exerciseNum <= 3; exerciseNum++) {
    // Take screenshot before logging sets
    const beforePath = path.join(screenshotDir, `exercise-${exerciseNum}-before.png`);
    await page.screenshot({ path: beforePath, fullPage: true });

    // Get current exercise name from UI
    const exerciseName = await page.locator('text=/Exercise \\d+\\/6:/').textContent();
    console.log(`\n📝 ${exerciseName}`);

    // Get target sets from UI
    const targetText = await page.locator('text=/Target:/').textContent();
    console.log(`   ${targetText}`);

    // Determine number of sets (3 or 4)
    const numSets = exerciseNum === 2 ? 4 : 3; // Overhead Press has 4 sets

    // Log all sets for this exercise
    for (let setNum = 1; setNum <= numSets; setNum++) {
      await page.locator('input[placeholder="Weight (kg)"]').fill('100');
      await page.locator('input[placeholder="Reps"]').fill('10');
      const logButton = page.locator('button').filter({ hasText: /^Log Set$/i });
      await logButton.click();
      await page.waitForTimeout(1000);
      console.log(`   ✓ Logged set ${setNum}/${numSets}`);
    }

    // Take screenshot after logging all sets
    const afterPath = path.join(screenshotDir, `exercise-${exerciseNum}-after.png`);
    await page.screenshot({ path: afterPath, fullPage: true });
    await page.waitForTimeout(2000);
  }

  console.log(`\n=== Screenshots saved to ${screenshotDir} ===`);
  console.log('Compare before/after screenshots to see if exercise name changed\n');

  // Keep browser open for 10 seconds
  await page.waitForTimeout(10000);
});
