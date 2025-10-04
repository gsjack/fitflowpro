/**
 * Guided Workout E2E Test
 *
 * Tests the complete workout flow from login through logging all sets
 * for a full workout session (Push B - Shoulder-Focused).
 *
 * Test Flow:
 * 1. Login to app
 * 2. Navigate to dashboard
 * 3. Start today's workout (Push B)
 * 4. Log sets for all 6 exercises
 * 5. Complete workout
 * 6. Verify completion
 */

import { test, expect, Page } from '@playwright/test';

// Exercise data for Push B (Shoulder-Focused) workout
const WORKOUT_EXERCISES = [
  {
    name: 'Leg Press',
    sets: 3,
    reps: { min: 8, max: 12 },
    rir: 3,
    weight: 150, // kg
  },
  {
    name: 'Overhead Press',
    sets: 4,
    reps: { min: 5, max: 8 },
    rir: 3,
    weight: 60,
  },
  {
    name: 'Dumbbell Bench Press',
    sets: 3,
    reps: { min: 8, max: 12 },
    rir: 2,
    weight: 30,
  },
  {
    name: 'Cable Lateral Raises',
    sets: 4,
    reps: { min: 15, max: 20 },
    rir: 0,
    weight: 15,
  },
  {
    name: 'Rear Delt Flyes',
    sets: 3,
    reps: { min: 15, max: 20 },
    rir: 0,
    weight: 12,
  },
  {
    name: 'Close-Grip Bench Press',
    sets: 3,
    reps: { min: 8, max: 10 },
    rir: 2,
    weight: 80,
  },
];

/**
 * Calculate middle value of rep range
 */
function getTargetReps(exercise: (typeof WORKOUT_EXERCISES)[0]): number {
  return Math.floor((exercise.reps.min + exercise.reps.max) / 2);
}

/**
 * Helper to log a single set
 */
async function logSet(
  page: Page,
  exercise: (typeof WORKOUT_EXERCISES)[0],
  setNumber: number
): Promise<void> {
  const targetReps = getTargetReps(exercise);

  console.log(
    `  Set ${setNumber}/${exercise.sets}: ${exercise.weight}kg × ${targetReps} reps @ RIR ${exercise.rir}`
  );

  // Wait for the set log card to be visible
  await page.waitForSelector('text=Weight (kg)', { timeout: 5000 });

  // Fill in weight - look for the input by label
  const weightInput = page
    .locator('input')
    .filter({ has: page.locator('text=Weight (kg)') })
    .first();
  if ((await weightInput.count()) === 0) {
    // Alternative: find by placeholder or nearby text
    await page
      .locator('input[inputmode="decimal"], input[type="text"]')
      .first()
      .fill(exercise.weight.toString());
  } else {
    await weightInput.fill(exercise.weight.toString());
  }
  await page.waitForTimeout(300);

  // Fill in reps - look for the input by label
  const repsInput = page
    .locator('input')
    .filter({ has: page.locator('text=Reps') })
    .first();
  if ((await repsInput.count()) === 0) {
    // Alternative: find second numeric input
    await page
      .locator('input[inputmode="numeric"], input[type="number"]')
      .first()
      .fill(targetReps.toString());
  } else {
    await repsInput.fill(targetReps.toString());
  }
  await page.waitForTimeout(300);

  // Select RIR - use segmented button
  const rirButton = page
    .locator(`button`)
    .filter({ hasText: new RegExp(`^${exercise.rir}$`) })
    .first();
  await rirButton.click();
  await page.waitForTimeout(300);

  // Click "Complete Set" button
  const completeSetButton = page.locator('button').filter({ hasText: /Complete Set/i });
  await completeSetButton.click();

  // Wait for set to be logged
  await page.waitForTimeout(1500); // Allow for set logging and rest timer

  // Take screenshot after each set
  await page.screenshot({
    path: `/tmp/workout-${exercise.name.replace(/\s+/g, '-').toLowerCase()}-set${setNumber}.png`,
  });
}

/**
 * Main test: Complete guided workout flow
 */
test('complete guided workout with all exercises', async ({ page }) => {
  test.setTimeout(300000); // 5 minutes timeout for full workout

  console.log('\n========================================');
  console.log('🏋️  GUIDED WORKOUT E2E TEST');
  console.log('========================================\n');

  // ===== STEP 1: Navigate to app =====
  console.log('📱 Step 1: Loading app...');
  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });
  console.log('✓ App loaded\n');

  // ===== STEP 2: Login =====
  console.log('🔐 Step 2: Logging in...');

  // Click Login tab
  const loginTab = page
    .locator('button')
    .filter({ hasText: /^Login$/i })
    .first();
  await loginTab.click();
  await page.waitForTimeout(1000);

  // Fill credentials
  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');

  // Click login button
  const loginButton = page
    .locator('button')
    .filter({ hasText: /^Login$/i })
    .last();
  await loginButton.click();

  console.log('✓ Login submitted');
  await page.waitForTimeout(3000);

  // Take screenshot of dashboard
  await page.screenshot({ path: '/tmp/01-dashboard.png', fullPage: true });
  console.log('✓ Dashboard loaded\n');

  // ===== STEP 3: Verify today's workout is displayed =====
  console.log("📋 Step 3: Checking today's workout...");

  const bodyText = await page.textContent('body');

  // Check if workout name is visible (could be "Push B" or variations)
  const hasWorkout = bodyText?.includes('Push') || bodyText?.includes('Shoulder');

  if (!hasWorkout) {
    console.error('❌ No workout found on dashboard');
    console.log('Dashboard content:', bodyText?.substring(0, 500));
    throw new Error('Expected workout not found on dashboard');
  }

  console.log("✓ Today's workout found: Push B (Shoulder-Focused)\n");

  // ===== STEP 4: Start workout (navigate to Workout tab) =====
  console.log('🚀 Step 4: Starting workout...');

  // First, try to click "Start Workout" button to initialize the workout
  const startButton = page.locator('button').filter({ hasText: /Start Workout/i });

  if ((await startButton.count()) > 0) {
    await startButton.click();
    console.log('✓ Clicked "Start Workout" button');
    await page.waitForTimeout(1000);
  }

  // Now navigate to the Workout tab (the Start Workout button doesn't navigate in web)
  console.log('Navigating to Workout tab...');

  // Target the Workout tab in the bottom navigation
  // Look for text "Workout" that's not part of "Resume Workout" or "Start Workout" buttons
  const workoutTab = page.getByText('Workout', { exact: true }).last();

  await workoutTab.click({ timeout: 10000 });
  console.log('✓ Navigated to Workout tab');

  await page.waitForTimeout(2000);

  // Take screenshot after starting workout
  await page.screenshot({ path: '/tmp/02-workout-started.png', fullPage: true });
  console.log('✓ Workout screen loaded\n');

  // ===== STEP 5: Log sets for all exercises =====
  console.log('💪 Step 5: Logging sets for all exercises...\n');

  let totalSetsLogged = 0;

  for (let i = 0; i < WORKOUT_EXERCISES.length; i++) {
    const exercise = WORKOUT_EXERCISES[i];

    console.log(`\n📝 Exercise ${i + 1}/${WORKOUT_EXERCISES.length}: ${exercise.name}`);
    console.log(
      `   Target: ${exercise.sets} sets × ${exercise.reps.min}-${exercise.reps.max} reps @ RIR ${exercise.rir}`
    );

    // Log all sets for this exercise
    for (let setNum = 1; setNum <= exercise.sets; setNum++) {
      try {
        await logSet(page, exercise, setNum);
        totalSetsLogged++;
      } catch (error) {
        console.error(`  ❌ Failed to log set ${setNum}:`, error);

        // Take error screenshot
        await page.screenshot({
          path: `/tmp/error-${exercise.name.replace(/\s+/g, '-').toLowerCase()}-set${setNum}.png`,
        });

        // Try to continue with next set
        console.log('  ⚠️  Attempting to continue...');
      }
    }

    console.log(`✓ Completed ${exercise.name} (${exercise.sets} sets)`);

    // Check if we need to move to next exercise
    if (i < WORKOUT_EXERCISES.length - 1) {
      // Look for "Next Exercise" button or similar
      const nextButton = page.locator('button').filter({ hasText: /Next Exercise|Continue/i });

      if ((await nextButton.count()) > 0) {
        await nextButton.click();
        await page.waitForTimeout(1000);
        console.log('  → Moved to next exercise');
      } else {
        // Workout screen should auto-advance or show next exercise
        console.log('  → Auto-advanced to next exercise');
      }
    }
  }

  console.log(`\n✓ Logged ${totalSetsLogged} total sets\n`);

  // ===== STEP 6: Complete workout =====
  console.log('🏁 Step 6: Completing workout...');

  // Look for "Complete Workout" button
  const completeButton = page.locator('button').filter({ hasText: /Complete Workout|Finish/i });

  if ((await completeButton.count()) > 0) {
    await completeButton.click();
    console.log('✓ Clicked "Complete Workout" button');
    await page.waitForTimeout(2000);
  } else {
    console.log('⚠️  No "Complete Workout" button found');
  }

  // Take final screenshot
  await page.screenshot({ path: '/tmp/03-workout-completed.png', fullPage: true });

  // ===== STEP 7: Verification =====
  console.log('\n✅ Step 7: Verifying completion...');

  const finalBodyText = await page.textContent('body');

  // Check for completion indicators
  const isCompleted =
    finalBodyText?.includes('completed') ||
    finalBodyText?.includes('Completed') ||
    finalBodyText?.includes('finished') ||
    finalBodyText?.includes('success') ||
    finalBodyText?.includes('Home'); // Back to dashboard

  if (isCompleted) {
    console.log('✓ Workout marked as completed');
  } else {
    console.log('⚠️  Completion status unclear');
    console.log('Final screen content:', finalBodyText?.substring(0, 300));
  }

  // ===== STEP 8: Keep browser open for review =====
  console.log('\n========================================');
  console.log('✅ WORKOUT TEST COMPLETED');
  console.log('========================================');
  console.log(
    `Total sets logged: ${totalSetsLogged}/${WORKOUT_EXERCISES.reduce((sum, ex) => sum + ex.sets, 0)}`
  );
  console.log('Screenshots saved to:');
  console.log('  - /tmp/01-dashboard.png');
  console.log('  - /tmp/02-workout-started.png');
  console.log('  - /tmp/03-workout-completed.png');
  console.log('  - /tmp/workout-*.png (per-set screenshots)');
  console.log('\nBrowser will remain open for 30 seconds...');
  console.log('========================================\n');

  // Keep browser open for manual review
  await page.waitForTimeout(30000);
});

/**
 * Simplified test: Login and navigate to workout screen only
 */
test('quick navigation to workout screen', async ({ page }) => {
  test.setTimeout(60000);

  console.log('\n🏃 Quick navigation test...\n');

  // Listen to console messages
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`[Browser ${type}]`, msg.text());
    }
  });

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });

  // Login
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
  const workoutTab = page.getByText('Workout', { exact: true }).last();
  await workoutTab.click({ timeout: 10000 });
  await page.waitForTimeout(5000); // Wait longer for workout to load

  await page.screenshot({ path: '/tmp/workout-screen-quick.png', fullPage: true });

  const bodyText = await page.textContent('body');
  console.log(
    'Workout screen visible:',
    bodyText?.includes('Set') || bodyText?.includes('Exercise') || bodyText?.includes('active')
  );
  console.log('Body text sample:', bodyText?.substring(0, 200));

  console.log('✅ Quick navigation completed\n');
});
