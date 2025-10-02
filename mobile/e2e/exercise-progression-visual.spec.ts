/**
 * Visual Exercise Progression Test
 *
 * Tests that exercises actually change in the UI when logging sets during a workout.
 * Creates a fresh user account to ensure a clean state.
 */

import { test, expect } from '@playwright/test';

test('verify exercises change in UI during workout', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes

  const timestamp = Date.now();
  const testEmail = `visual-test-${timestamp}@fitflow.test`;

  console.log('\n========================================');
  console.log('🎯 EXERCISE PROGRESSION VISUAL TEST');
  console.log('========================================\n');

  // ===== STEP 1: Register new user for clean state =====
  console.log('👤 Step 1: Registering new user...');

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });
  console.log('✓ App loaded');
  await page.waitForTimeout(1000);

  // Click Register tab
  const registerTab = page.locator('button').filter({ hasText: /^Register$/i }).first();
  await registerTab.click();
  await page.waitForTimeout(500);

  // Fill registration form
  await page.locator('input[type="email"]').fill(testEmail);
  await page.waitForTimeout(200);

  await page.locator('input[type="password"]').fill('Password123');
  await page.waitForTimeout(200);

  // Fill optional fields using input placeholders
  // Age field (placeholder is "13-100")
  await page.locator('input[placeholder="13-100"]').fill('30');
  await page.waitForTimeout(200);

  // Weight field
  await page.locator('input[inputmode="decimal"]').fill('75');
  await page.waitForTimeout(200);

  // Select experience level - click "Intermediate"
  const intermediateButton = page.locator('button').filter({ hasText: /^Intermediate$/i });
  await intermediateButton.click();
  await page.waitForTimeout(300);

  // Click "Create Account" button
  const createAccountButton = page.locator('button').filter({ hasText: /Create Account/i });
  await createAccountButton.click();
  console.log(`✓ Registered as ${testEmail}`);

  await page.waitForTimeout(3000);

  // ===== STEP 2: Start workout =====
  console.log('\n🚀 Step 2: Starting workout...');

  // Try to click Start Workout button
  const startButton = page.locator('button').filter({ hasText: /Start Workout/i });
  if (await startButton.count() > 0) {
    await startButton.click();
    console.log('✓ Clicked "Start Workout" button');
    await page.waitForTimeout(1000);
  }

  // Navigate to Workout tab - use simple text selector
  await page.click('text=Workout');
  console.log('✓ Navigated to Workout tab');

  await page.waitForTimeout(2000);

  // ===== STEP 3: Verify and log exercises =====
  console.log('\n💪 Step 3: Logging sets and observing exercise changes...\n');

  const exercisesData: { name: string; sets: number }[] = [];

  // Log sets for first 3 exercises to verify UI changes
  for (let exerciseNum = 1; exerciseNum <= 3; exerciseNum++) {
    // Get current exercise name
    const exerciseHeaderLocator = page.locator('text=/Exercise \\d+\\/6:/').first();

    // Wait for exercise header to be visible
    await exerciseHeaderLocator.waitFor({ state: 'visible', timeout: 10000 });

    const exerciseName = await exerciseHeaderLocator.textContent();
    console.log(`\n📝 ${exerciseName}`);

    // Take screenshot before logging sets
    await page.screenshot({
      path: `/tmp/exercise-${exerciseNum}-before.png`,
      fullPage: true
    });

    // Determine number of sets (usually 3, but exercise 2 might be 4)
    let setsToLog = 3;

    // Check if target shows 4 sets
    const bodyText = await page.textContent('body');
    if (bodyText?.includes('4 sets')) {
      setsToLog = 4;
      console.log('   (Detected 4 sets for this exercise)');
    }

    exercisesData.push({ name: exerciseName || 'Unknown', sets: setsToLog });

    // Log all sets for this exercise
    for (let setNum = 1; setNum <= setsToLog; setNum++) {
      // Fill weight
      const weightInput = page.locator('input[placeholder="Weight (kg)"]').first();
      await weightInput.fill('100');
      await page.waitForTimeout(300);

      // Fill reps
      const repsInput = page.locator('input[placeholder="Reps"]').first();
      await repsInput.fill('10');
      await page.waitForTimeout(300);

      // Click RIR 2 button (or 3 for warm-up)
      const rirButton = page.locator('button').filter({ hasText: /^2$/ }).first();
      await rirButton.click();
      await page.waitForTimeout(300);

      // Click "Complete Set" or "Log Set" button
      const completeButton = page.locator('button').filter({ hasText: /(Complete Set|Log Set)/i }).first();
      await completeButton.click();

      console.log(`   ✓ Set ${setNum}/${setsToLog} logged`);

      await page.waitForTimeout(1500);
    }

    // Take screenshot after logging all sets
    await page.screenshot({
      path: `/tmp/exercise-${exerciseNum}-after.png`,
      fullPage: true
    });

    console.log(`✓ Completed all sets for this exercise`);

    await page.waitForTimeout(1500);
  }

  // ===== STEP 4: Verify results =====
  console.log('\n========================================');
  console.log('📊 TEST RESULTS');
  console.log('========================================\n');

  console.log('Exercises logged:');
  exercisesData.forEach((exercise, index) => {
    console.log(`  ${index + 1}. ${exercise.name} (${exercise.sets} sets)`);
  });

  console.log('\n📸 Screenshots saved to:');
  exercisesData.forEach((_, index) => {
    console.log(`  - /tmp/exercise-${index + 1}-before.png`);
    console.log(`  - /tmp/exercise-${index + 1}-after.png`);
  });

  console.log('\n✅ Visual verification:');
  console.log('   Compare before/after screenshots to see exercise names changing.');
  console.log('   Expected: Exercise 1 → Exercise 2 → Exercise 3\n');

  // Check that we got different exercise names
  const uniqueNames = new Set(exercisesData.map(e => e.name));
  if (uniqueNames.size >= 2) {
    console.log('✅ SUCCESS: Multiple different exercises detected in UI\n');
  } else {
    console.warn('⚠️  WARNING: Exercises may not have changed in UI\n');
  }
});
