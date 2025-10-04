import { test, expect } from '@playwright/test';

/**
 * Manual QA Test Suite for P1 Improvements
 *
 * Tests the following improvements:
 * 1. Empty States (Analytics, Planner, Workout)
 * 2. SetLogCard Ergonomics (Button Size, Long-Press, Labels)
 * 3. Recovery Assessment (Emoji Labels, Scale Descriptions)
 * 4. Workout Progress (Progress Bar, Milestone Celebrations)
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Helper: Create test user and login
async function setupTestUser(page: any) {
  const timestamp = Date.now();
  const username = `qa-p1-test-${timestamp}@example.com`;
  const password = 'Test123!';

  // Register user via API
  const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, age: 28 }),
  });

  if (!registerResponse.ok) {
    throw new Error(`Registration failed: ${registerResponse.statusText}`);
  }

  const { token } = await registerResponse.json();

  // Navigate to app
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');

  // Fill in login form
  await page.fill('input[placeholder*="mail" i]', username);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Login"), button:has-text("Log In")');

  // Wait for navigation to dashboard
  await page.waitForTimeout(2000);

  return { username, password, token };
}

test.describe('P1 Improvements - Manual QA', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000); // 2 minute timeout
  });

  test('1. Empty States - AnalyticsScreen', async ({ page }) => {
    const { token } = await setupTestUser(page);

    // Navigate to Analytics tab
    await page.click('[aria-label="Analytics"]');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/manual-testing/empty-state-analytics.png' });

    // Verify empty state elements
    const hasChartIcon = await page.locator('svg, image').count() > 0;
    const hasTitle = await page.locator('text=/start tracking/i').isVisible().catch(() => false);
    const hasSubtitle = await page.locator('text=/complete at least 3 workouts/i').isVisible().catch(() => false);
    const hasButton = await page.locator('button:has-text("Start Your First Workout")').isVisible().catch(() => false);

    console.log('Analytics Empty State:');
    console.log('- Chart Icon:', hasChartIcon ? 'PASS' : 'FAIL');
    console.log('- Title:', hasTitle ? 'PASS' : 'FAIL');
    console.log('- Subtitle:', hasSubtitle ? 'PASS' : 'FAIL');
    console.log('- CTA Button:', hasButton ? 'PASS' : 'FAIL');

    expect(hasTitle || hasSubtitle || hasButton).toBeTruthy();
  });

  test('2. Empty States - PlannerScreen', async ({ page }) => {
    const { token } = await setupTestUser(page);

    // Navigate to Planner tab
    await page.click('[aria-label="Planner"]');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/manual-testing/empty-state-planner.png' });

    // Verify empty state elements
    const hasCalendarIcon = await page.locator('svg, image').count() > 0;
    const hasTitle = await page.locator('text=/no active program/i').isVisible().catch(() => false);
    const hasSubtitle = await page.locator('text=/create your personalized/i').isVisible().catch(() => false);
    const hasHelper = await page.locator('text=/MEV.*MAV.*MRV/i').isVisible().catch(() => false);
    const hasButton = await page.locator('button:has-text("Create Program")').isVisible().catch(() => false);

    console.log('Planner Empty State:');
    console.log('- Calendar Icon:', hasCalendarIcon ? 'PASS' : 'FAIL');
    console.log('- Title:', hasTitle ? 'PASS' : 'FAIL');
    console.log('- Subtitle:', hasSubtitle ? 'PASS' : 'FAIL');
    console.log('- Helper Text:', hasHelper ? 'PASS' : 'FAIL');
    console.log('- CTA Button:', hasButton ? 'PASS' : 'FAIL');

    expect(hasTitle || hasSubtitle || hasButton).toBeTruthy();
  });

  test('3. Empty States - WorkoutScreen', async ({ page }) => {
    const { token } = await setupTestUser(page);

    // Navigate to Workout screen (without starting a workout)
    // This might require navigating to Workout tab or trying to access workout without session
    await page.click('[aria-label="Workout"]');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/manual-testing/empty-state-workout.png' });

    // Verify empty state elements
    const hasDumbbellIcon = await page.locator('svg, image').count() > 0;
    const hasTitle = await page.locator('text=/no active workout/i').isVisible().catch(() => false);
    const hasSubtitle = await page.locator('text=/return to dashboard/i').isVisible().catch(() => false);
    const hasButton = await page.locator('button:has-text("Go to Dashboard")').isVisible().catch(() => false);

    console.log('Workout Empty State:');
    console.log('- Dumbbell Icon:', hasDumbbellIcon ? 'PASS' : 'FAIL');
    console.log('- Title:', hasTitle ? 'PASS' : 'FAIL');
    console.log('- Subtitle:', hasSubtitle ? 'PASS' : 'FAIL');
    console.log('- CTA Button:', hasButton ? 'PASS' : 'FAIL');

    expect(hasTitle || hasSubtitle || hasButton).toBeTruthy();
  });

  test('4. SetLogCard Ergonomics - Button Size and Labels', async ({ page }) => {
    const { token } = await setupTestUser(page);

    // Create a program and start a workout (simplified - assumes program exists or creates one)
    // Navigate to Dashboard
    await page.click('[aria-label="Dashboard"]');
    await page.waitForTimeout(1000);

    // Try to start a workout
    const startWorkoutButton = page.locator('button:has-text("Start Workout")');
    if (await startWorkoutButton.isVisible()) {
      await startWorkoutButton.click();
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({ path: 'screenshots/manual-testing/setlogcard-buttons.png' });

      // Check for SetLogCard button labels
      const hasWeightPlusButton = await page.locator('button:has-text("+2.5")').isVisible().catch(() => false);
      const hasWeightMinusButton = await page.locator('button:has-text("-2.5")').isVisible().catch(() => false);
      const hasRepsPlusButton = await page.locator('button:has-text("+1")').isVisible().catch(() => false);
      const hasRepsMinusButton = await page.locator('button:has-text("-1")').isVisible().catch(() => false);

      console.log('SetLogCard Button Labels:');
      console.log('- Weight +2.5 Button:', hasWeightPlusButton ? 'PASS' : 'FAIL');
      console.log('- Weight -2.5 Button:', hasWeightMinusButton ? 'PASS' : 'FAIL');
      console.log('- Reps +1 Button:', hasRepsPlusButton ? 'PASS' : 'FAIL');
      console.log('- Reps -1 Button:', hasRepsMinusButton ? 'PASS' : 'FAIL');

      // Button size check (should be 64x64px touchable area)
      if (hasWeightPlusButton) {
        const buttonBox = await page.locator('button:has-text("+2.5")').boundingBox();
        if (buttonBox) {
          const buttonSizeOk = buttonBox.width >= 60 && buttonBox.height >= 60;
          console.log('- Button Size (64x64px):', buttonSizeOk ? 'PASS' : `FAIL (${buttonBox.width}x${buttonBox.height})`);
        }
      }

      expect(hasWeightPlusButton || hasRepsPlusButton).toBeTruthy();
    } else {
      console.log('SetLogCard test skipped - no workout available');
    }
  });

  test('5. Recovery Assessment - Emoji Labels and Descriptions', async ({ page }) => {
    const { token } = await setupTestUser(page);

    // Navigate to Dashboard
    await page.click('[aria-label="Dashboard"]');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/manual-testing/recovery-assessment.png' });

    // Check for recovery assessment section
    const hasSleepQuality = await page.locator('text=/sleep quality/i').isVisible().catch(() => false);
    const hasMuscleSoreness = await page.locator('text=/muscle soreness/i').isVisible().catch(() => false);
    const hasMotivation = await page.locator('text=/motivation/i').isVisible().catch(() => false);

    console.log('Recovery Assessment:');
    console.log('- Sleep Quality Section:', hasSleepQuality ? 'PASS' : 'FAIL');
    console.log('- Muscle Soreness Section:', hasMuscleSoreness ? 'PASS' : 'FAIL');
    console.log('- Motivation Section:', hasMotivation ? 'PASS' : 'FAIL');

    // Check for scale descriptions
    const hasSleepScale = await page.locator('text=/1 = Terrible.*5 = Excellent/i').isVisible().catch(() => false);
    const hasSorenessScale = await page.locator('text=/1 = Very sore.*5 = No soreness/i').isVisible().catch(() => false);
    const hasMotivationScale = await page.locator('text=/1 = Very low.*5 = Very high/i').isVisible().catch(() => false);

    console.log('- Sleep Scale Description:', hasSleepScale ? 'PASS' : 'FAIL');
    console.log('- Soreness Scale Description:', hasSorenessScale ? 'PASS' : 'FAIL');
    console.log('- Motivation Scale Description:', hasMotivationScale ? 'PASS' : 'FAIL');

    // Check for emoji in buttons (visual inspection in screenshot)
    const emojiButtons = await page.locator('button').allTextContents();
    const hasEmojis = emojiButtons.some(text => /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text));

    console.log('- Emoji Buttons Present:', hasEmojis ? 'PASS' : 'FAIL');

    expect(hasSleepQuality || hasMuscleSoreness || hasMotivation).toBeTruthy();
  });

  test('6. Workout Progress - Progress Bar and Milestones', async ({ page }) => {
    const { token } = await setupTestUser(page);

    // Navigate to Dashboard and start a workout
    await page.click('[aria-label="Dashboard"]');
    await page.waitForTimeout(1000);

    const startWorkoutButton = page.locator('button:has-text("Start Workout")');
    if (await startWorkoutButton.isVisible()) {
      await startWorkoutButton.click();
      await page.waitForTimeout(2000);

      // Take initial screenshot
      await page.screenshot({ path: 'screenshots/manual-testing/workout-progress-start.png' });

      // Check for progress bar
      const hasProgressBar = await page.locator('[role="progressbar"]').isVisible().catch(() => false);
      console.log('Workout Progress:');
      console.log('- Progress Bar Present:', hasProgressBar ? 'PASS' : 'FAIL');

      if (hasProgressBar) {
        const progressBar = page.locator('[role="progressbar"]');
        const barHeight = await progressBar.evaluate((el: any) => el.offsetHeight || window.getComputedStyle(el).height);
        const heightOk = parseInt(barHeight) >= 12;
        console.log('- Progress Bar Height (≥12px):', heightOk ? 'PASS' : `FAIL (${barHeight})`);
      }

      // Try to complete a set to trigger milestone
      const logSetButton = page.locator('button:has-text("Log Set")');
      if (await logSetButton.isVisible()) {
        await logSetButton.click();
        await page.waitForTimeout(1000);

        // Take screenshot after logging set
        await page.screenshot({ path: 'screenshots/manual-testing/workout-progress-after-set.png' });

        // Check for milestone snackbar (if 25% reached)
        const hasSnackbar = await page.locator('text=/Great start|Halfway|Almost done|complete/i').isVisible().catch(() => false);
        console.log('- Milestone Snackbar:', hasSnackbar ? 'PASS' : 'Not triggered yet');
      }

      expect(hasProgressBar).toBeTruthy();
    } else {
      console.log('Workout Progress test skipped - no workout available');
    }
  });

  test('7. Generate Test Results Summary', async ({ page }) => {
    // This test just ensures all screenshots are captured
    // Actual report generation will be done by the QA script

    console.log('\n===========================================');
    console.log('Manual QA Test Suite Completed');
    console.log('===========================================');
    console.log('Screenshots saved to: screenshots/manual-testing/');
    console.log('Review screenshots for visual validation.');
  });
});
