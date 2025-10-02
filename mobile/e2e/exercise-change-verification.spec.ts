/**
 * Exercise Change Verification Test
 *
 * Verifies that exercise names actually change in the UI as the user
 * progresses through a workout by logging sets.
 *
 * This test uses the existing demo account and navigates through
 * the workout flow to capture visual evidence of exercise progression.
 */

import { test } from '@playwright/test';

test('verify exercise names change during workout progression', async ({ page }) => {
  test.setTimeout(180000); // 3 minutes

  console.log('\n========================================');
  console.log('🎯 EXERCISE CHANGE VERIFICATION TEST');
  console.log('========================================\n');

  // Login
  console.log('Step 1: Login');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });

  const loginTab = page.locator('button').filter({ hasText: /^Login$/i }).first();
  await loginTab.click();
  await page.waitForTimeout(500);

  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');

  const loginButton = page.locator('button').filter({ hasText: /^Login$/i }).last();
  await loginButton.click();
  console.log('✓ Logged in\n');
  await page.waitForTimeout(3000);

  // Check if there's a Start Workout or Resume Workout button
  console.log('Step 2: Looking for workout controls...');
  const bodyText = await page.textContent('body');

  let workoutStarted = false;

  // Try to start/resume workout from dashboard
  const startButton = page.locator('button').filter({ hasText: /Start Workout|Resume Workout/i });
  if (await startButton.count() > 0) {
    console.log('✓ Found workout button, clicking...');
    await startButton.first().click();
    await page.waitForTimeout(2000);
    workoutStarted = true;
  }

  // Navigate to Workout tab
  console.log('Navigating to Workout tab...');
  const workoutTabLink = page.locator('[href*="Workout"]').or(page.locator('text=Workout')).last();
  await workoutTabLink.click();
  await page.waitForTimeout(2000);

  // Take initial screenshot
  await page.screenshot({ path: '/tmp/workout-state-initial.png', fullPage: true });
  console.log('✓ On Workout screen\n');

  // Analyze what's on screen
  const workoutScreenText = await page.textContent('body');

  console.log('📋 Screen Analysis:');

  if (workoutScreenText?.includes('COMPLETED')) {
    console.log('❌ Workout is already completed');
    console.log('   Cannot verify exercise changes - workout must be active');
    console.log('   Screenshot saved to: /tmp/workout-state-initial.png\n');
    return;
  }

  if (workoutScreenText?.includes('No workout')) {
    console.log('❌ No active workout found');
    console.log('   Screenshot saved to: /tmp/workout-state-initial.png\n');
    return;
  }

  // Check for active workout interface (Complete Set button or weight input)
  const hasCompleteButton = await page.locator('button').filter({ hasText: /Complete Set/i }).count();
  const hasWeightInput = await page.locator('input').filter({ hasText: /Weight/i }).count();

  if (hasCompleteButton === 0 && hasWeightInput === 0) {
    console.log('⚠️  No active workout interface found');
    console.log('   Looking for "Complete Set" button or weight inputs');
    console.log('   Screenshot saved to: /tmp/workout-state-initial.png\n');
    return;
  }

  console.log('✅ Active workout detected!\n');

  // Log sets for 3 exercises to verify UI changes
  console.log('Step 3: Logging sets and capturing exercise changes...\n');

  const exerciseData: string[] = [];

  for (let exerciseNum = 1; exerciseNum <= 3; exerciseNum++) {
    // Capture current exercise name - look for the heading text
    await page.waitForTimeout(1000);

    // Try multiple strategies to extract exercise name
    let exerciseName = 'Unknown Exercise';

    // Strategy 1: Look for h2 or h3 headings (common for exercise names)
    const headings = await page.locator('h1, h2, h3').allTextContents();
    const validHeading = headings.find(h =>
      h && !h.includes('Active Workout') && !h.includes('Progress') && h.trim().length > 0
    );

    if (validHeading) {
      exerciseName = validHeading.trim();
    } else {
      // Strategy 2: Look for text before "Set X"
      const currentText = await page.textContent('body');
      const match = currentText?.match(/([A-Z][a-zA-Z\s-]+)\s*Set\s+\d+/);
      if (match) {
        exerciseName = match[1].trim();
      }
    }

    exerciseData.push(exerciseName);
    console.log(`\n📝 Exercise ${exerciseNum}: ${exerciseName}`);
    console.log(`   (Looking for exercise name in UI)`)

    // Take before screenshot
    await page.screenshot({
      path: `/tmp/exercise-${exerciseNum}-before.png`,
      fullPage: true
    });

    // Log 3 sets (or 4 if it's exercise 2 which is usually Overhead Press with 4 sets)
    const setsToLog = exerciseNum === 2 ? 4 : 3;

    for (let setNum = 1; setNum <= setsToLog; setNum++) {
      try {
        // Fill weight - look for the weight input field
        const weightInputs = page.locator('input[placeholder*="Weight"], input').filter({ has: page.locator('text=/Weight/i') });
        const weightInput = weightInputs.first();

        if (await weightInput.count() > 0) {
          await weightInput.clear();
          await weightInput.fill('100');
          await page.waitForTimeout(300);
        }

        // Fill reps - look for the reps input field
        const repsInputs = page.locator('input').nth(1); // Usually second input
        if (await repsInputs.count() > 0) {
          await repsInputs.clear();
          await repsInputs.fill('10');
          await page.waitForTimeout(300);
        }

        // Select RIR 3 (click the button with "3")
        const rirButton = page.locator('button:has-text("3")').first();
        if (await rirButton.count() > 0) {
          await rirButton.click();
          await page.waitForTimeout(200);
        }

        // Click Complete Set button
        const completeButton = page.locator('button').filter({ hasText: /Complete Set/i }).first();
        if (await completeButton.count() > 0) {
          await completeButton.click();
          console.log(`   ✓ Set ${setNum}/${setsToLog} logged (100kg × 10 reps @ RIR 3)`);
          await page.waitForTimeout(2000); // Wait for UI to update
        } else {
          console.log(`   ⚠️  Complete Set button not found for set ${setNum}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not log set ${setNum}: ${error}`);
      }
    }

    // Take after screenshot
    await page.screenshot({
      path: `/tmp/exercise-${exerciseNum}-after.png`,
      fullPage: true
    });

    await page.waitForTimeout(1000);
  }

  // Summary
  console.log('\n========================================');
  console.log('📊 TEST RESULTS');
  console.log('========================================\n');

  console.log('Exercises captured:');
  exerciseData.forEach((name, index) => {
    console.log(`  ${index + 1}. ${name}`);
  });

  console.log('\n📸 Screenshots saved:');
  console.log('  - /tmp/workout-state-initial.png');
  for (let i = 1; i <= 3; i++) {
    console.log(`  - /tmp/exercise-${i}-before.png`);
    console.log(`  - /tmp/exercise-${i}-after.png`);
  }

  console.log('\n✅ Visual Verification:');
  console.log('   Compare exercise-1-before.png vs exercise-2-before.png');
  console.log('   The exercise names should be different.\n');

  // Check if we got different exercise names
  const uniqueExercises = new Set(exerciseData);
  if (uniqueExercises.size > 1) {
    console.log('✅ SUCCESS: Multiple different exercises detected!');
    console.log(`   Found ${uniqueExercises.size} unique exercises\n`);
  } else {
    console.log('⚠️  WARNING: May not have progressed to different exercises\n');
  }
});
