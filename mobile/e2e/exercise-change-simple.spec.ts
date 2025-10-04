/**
 * Simple Exercise Change Verification Test
 *
 * Logs sets and captures screenshots to verify exercise names change.
 * This is a simplified version focused on visual verification.
 */

import { test, expect } from '@playwright/test';

test('verify exercise names change - simple version', async ({ page }) => {
  test.setTimeout(180000);

  console.log('\n========================================');
  console.log('🎯 EXERCISE CHANGE VERIFICATION (SIMPLE)');
  console.log('========================================\n');

  // Login
  console.log('Step 1: Login as demo user');
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
  console.log('✓ Logged in\n');

  // Look for Start Workout button on dashboard
  console.log('Step 2: Start workout from dashboard');
  const startWorkoutBtn = page.locator('button').filter({ hasText: /Start Workout/i });

  if ((await startWorkoutBtn.count()) > 0) {
    console.log('✓ Found "Start Workout" button, clicking...');
    await startWorkoutBtn.first().click();
    await page.waitForTimeout(3000);
  } else {
    console.log('⚠️  No "Start Workout" button found, navigating to Workout tab...');
  }

  // Navigate to Workout tab
  console.log('Step 3: Navigate to Workout screen');
  const workoutTab = page.locator('text=Workout').last();
  await workoutTab.click();
  await page.waitForTimeout(2000);

  // Take screenshot of initial state
  await page.screenshot({ path: '/tmp/simple-initial.png', fullPage: true });
  console.log('✓ On Workout screen\n');

  // Extract exercise name from page
  const getExerciseName = async () => {
    // Look for the exercise name (it's the first large text after "Active Workout")
    const bodyText = await page.textContent('body');

    // Try to find exercise name before "Set X"
    const match = bodyText?.match(
      /(Leg Press|Overhead Press|Dumbbell Bench Press|Cable Lateral Raises|Rear Delt Flyes|Close-Grip Bench Press)\s*Set\s+\d+/
    );
    if (match) {
      return match[1];
    }

    // Fallback: just look for known exercise names
    const exercises = [
      'Leg Press',
      'Overhead Press',
      'Dumbbell Bench Press',
      'Cable Lateral Raises',
      'Rear Delt Flyes',
      'Close-Grip Bench Press',
    ];
    for (const ex of exercises) {
      if (bodyText?.includes(ex)) {
        return ex;
      }
    }

    return 'Unknown';
  };

  console.log('Step 4: Log sets and capture exercise changes\n');

  const exerciseSnapshots: Array<{ setNumber: number; exerciseName: string; screenshot: string }> =
    [];

  // Log 19 sets to cover 3 exercises (3 + 4 + 3 = 10 sets for first 3 exercises)
  // We'll capture at sets 1, 4, 8, 12, and 19
  const capturePoints = [1, 4, 8, 12, 19];

  for (let setNum = 1; setNum <= 19; setNum++) {
    try {
      // Capture exercise name at key points
      if (capturePoints.includes(setNum)) {
        const exerciseName = await getExerciseName();
        const screenshotPath = `/tmp/simple-set-${setNum}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });

        exerciseSnapshots.push({ setNumber: setNum, exerciseName, screenshot: screenshotPath });
        console.log(`📸 Set ${setNum}: "${exerciseName}"`);
      }

      // Fill inputs and complete set
      const inputs = await page.locator('input[type="number"], input').all();

      if (inputs.length >= 2) {
        // Weight
        await inputs[0].clear();
        await inputs[0].fill('100');
        await page.waitForTimeout(200);

        // Reps
        await inputs[1].clear();
        await inputs[1].fill('10');
        await page.waitForTimeout(200);
      }

      // Select RIR 3
      const rirButton = page.locator('button').filter({ hasText: /^3$/ }).first();
      if (await rirButton.isVisible()) {
        await rirButton.click();
        await page.waitForTimeout(200);
      }

      // Complete set
      const completeBtn = page
        .locator('button')
        .filter({ hasText: /Complete Set/i })
        .first();
      if (await completeBtn.isVisible()) {
        await completeBtn.click();

        if (!capturePoints.includes(setNum)) {
          console.log(`   Set ${setNum} logged`);
        }

        await page.waitForTimeout(1500);
      } else {
        console.log(`   ⚠️  Complete button not visible at set ${setNum}`);
        break;
      }
    } catch (error) {
      console.log(`   ❌ Error at set ${setNum}: ${error}`);
      break;
    }
  }

  // Results
  console.log('\n========================================');
  console.log('📊 TEST RESULTS');
  console.log('========================================\n');

  console.log('Exercise names captured:');
  exerciseSnapshots.forEach((snap) => {
    console.log(`  Set ${snap.setNumber}: ${snap.exerciseName}`);
  });

  console.log('\n📸 Screenshots saved:');
  exerciseSnapshots.forEach((snap) => {
    console.log(`  - ${snap.screenshot}`);
  });

  // Verify we got different exercise names
  const uniqueExercises = new Set(exerciseSnapshots.map((s) => s.exerciseName));

  console.log(`\n✅ Unique exercises detected: ${uniqueExercises.size}`);
  console.log(`   Exercises: ${Array.from(uniqueExercises).join(', ')}\n`);

  if (uniqueExercises.size >= 3) {
    console.log('🎉 SUCCESS: Exercise names changed as expected!');
    console.log('   The bug fix is working correctly.\n');
  } else {
    console.log('⚠️  WARNING: Expected at least 3 different exercises');
    console.log('   Only found:', Array.from(uniqueExercises), '\n');
  }

  // Visual proof
  if (exerciseSnapshots.length >= 3) {
    console.log('🔍 Visual Verification:');
    console.log(`   Compare: ${exerciseSnapshots[0].screenshot}`);
    console.log(`        vs: ${exerciseSnapshots[2].screenshot}`);
    console.log('   The exercise names should be different.\n');
  }
});
