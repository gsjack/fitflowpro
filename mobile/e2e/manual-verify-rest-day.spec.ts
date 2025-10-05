import { test } from '@playwright/test';

/**
 * Manual verification test for Rest Day and Planner features
 *
 * This test requires manual login via the browser first:
 * 1. Run: npx playwright test manual-verify-rest-day.spec.ts --headed --project=chromium
 * 2. When browser opens, manually log in with: asigator@gmail.com / Test123!
 * 3. Leave the browser open - the test will proceed after you login
 */

test.describe('Manual Verification - Rest Day and Planner', () => {
  test('Verify Dashboard and Planner Features', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://192.168.178.48:8081/');
    await page.waitForLoadState('networkidle');

    console.log('\n=== MANUAL VERIFICATION REQUIRED ===');
    console.log(
      'Please log in manually if needed, then press Enter in the terminal to continue...\n'
    );

    // Wait 30 seconds for manual login
    await page.waitForTimeout(30000);

    console.log('\n=== STEP 1: Checking Dashboard ===');
    await page.goto('http://192.168.178.48:8081/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take dashboard screenshot
    await page.screenshot({
      path: 'test-screenshots/dashboard-verification.png',
      fullPage: true,
    });

    // Check for Rest Day card OR workout recommendation
    const hasRestDay = await page
      .locator('text=/rest day/i')
      .isVisible()
      .catch(() => false);
    const hasWorkoutRec = await page
      .locator('text=/recommended/i')
      .isVisible()
      .catch(() => false);
    const hasStartWorkoutButton = await page
      .locator('button:has-text("Start Workout")')
      .isVisible()
      .catch(() => false);
    const hasVolume = await page
      .locator('text=/this week.*volume/i')
      .isVisible()
      .catch(() => false);
    const hasNavBar = await page
      .locator('[role="tablist"], nav')
      .isVisible()
      .catch(() => false);

    console.log('Dashboard Status:');
    console.log(`  - Rest Day card: ${hasRestDay ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
    console.log(`  - Workout recommendation: ${hasWorkoutRec ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
    console.log(
      `  - Start Workout button: ${hasStartWorkoutButton ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`
    );
    console.log(`  - Volume tracking: ${hasVolume ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
    console.log(`  - Navigation bar: ${hasNavBar ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);

    console.log('\n=== STEP 2: Checking Planner Page ===');
    await page.goto('http://192.168.178.48:8081/planner');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take planner screenshot
    await page.screenshot({
      path: 'test-screenshots/planner-verification.png',
      fullPage: true,
    });

    // Check planner content
    const hasTrainingDays = await page
      .locator('text=/training days/i')
      .isVisible()
      .catch(() => false);
    const hasExercises = await page
      .locator('text=/exercises/i')
      .isVisible()
      .catch(() => false);
    const hasDayButtons =
      (await page.locator('button:has-text("Push"), button:has-text("Pull")').count()) > 0;
    const hasError = await page
      .locator('text=/error/i')
      .isVisible()
      .catch(() => false);

    console.log('Planner Status:');
    console.log(`  - Training Days section: ${hasTrainingDays ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
    console.log(`  - Exercises section: ${hasExercises ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
    console.log(`  - Day buttons: ${hasDayButtons ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
    console.log(`  - Error state: ${hasError ? '❌ YES' : '✅ NO'}`);

    console.log('\n=== Screenshots saved to test-screenshots/ ===\n');
  });
});
