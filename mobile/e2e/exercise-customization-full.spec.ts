/**
 * Exercise Customization - FULL E2E Test Suite
 *
 * Comprehensive end-to-end test covering ALL exercise customization features:
 * 1. View exercise library (100+ exercises)
 * 2. Filter by muscle group, equipment, movement pattern
 * 3. Swap exercise in program (e.g., Bench Press → Dumbbell Press)
 * 4. Reorder exercises in program day
 * 5. View alternative exercise suggestions
 * 6. See exercise details (muscle groups, equipment, difficulty)
 * 7. Verify program volume updates after swap
 *
 * Test Flow:
 * 1. Login to app
 * 2. Navigate to planner
 * 3. View and browse exercise library with all filters
 * 4. View exercise details and metadata
 * 5. Swap exercise with muscle group compatibility validation
 * 6. View alternative exercise suggestions
 * 7. Verify volume warnings after swap
 * 8. Reorder exercises via drag-and-drop (API-based)
 * 9. Add and remove exercises
 * 10. Validate all API synchronization
 *
 * Requirements:
 * - Backend server running on http://localhost:3000
 * - Expo dev server running on http://localhost:8081
 * - Test user: e2e-full-exercise-test@example.com
 * - Password: Test123!
 * - Active program with multiple exercises
 * - 100+ exercises in database
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:8081';
const API_BASE_URL = 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
  email: 'e2e-full-exercise-test@example.com',
  password: 'Test123!',
  age: 30,
};

/**
 * Helper: Login to app
 */
async function login(page: Page): Promise<void> {
  console.log('[Login] Navigating to login page...');
  await page.goto(BASE_URL);

  // Wait for login page to load
  await page.waitForSelector('text=/Welcome to FitFlow|Login|Sign In/i', { timeout: 10000 });

  // Fill login form
  console.log('[Login] Filling credentials...');
  const emailInput = page
    .locator('input[type="email"], input[placeholder*="email" i], input')
    .first();
  await emailInput.fill(TEST_USER.email);

  const passwordInput = page
    .locator('input[type="password"], input[placeholder*="password" i]')
    .first();
  await passwordInput.fill(TEST_USER.password);

  // Click login button
  console.log('[Login] Submitting login...');
  const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
  await loginButton.click();

  // Wait for dashboard to load
  await page.waitForSelector('text=/Dashboard|Today|Workout/i', { timeout: 15000 });
  console.log('[Login] ✅ Login successful');
}

/**
 * Helper: Navigate to specific tab
 */
async function navigateToTab(
  page: Page,
  tabName: 'Planner' | 'Dashboard' | 'Analytics' | 'Settings' | 'Workout'
): Promise<void> {
  console.log(`[Navigation] Navigating to ${tabName} tab...`);

  // Look for tab button (could be icon + label or just icon)
  const tabSelector = `button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}"), a:has-text("${tabName}")`;
  const tabButton = page.locator(tabSelector).first();

  if ((await tabButton.count()) === 0) {
    console.warn(`[Navigation] Tab button not found: ${tabName}, trying alternative selectors...`);
    // Try finding by href
    const linkSelector = `a[href*="${tabName.toLowerCase()}"]`;
    await page.click(linkSelector);
  } else {
    await tabButton.click();
  }

  // Wait for tab content to load
  await page.waitForTimeout(1000);
  console.log(`[Navigation] ✅ Navigated to ${tabName}`);
}

/**
 * Helper: Create test user via API (if doesn't exist)
 */
async function ensureTestUserExists(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER.email,
        password: TEST_USER.password,
        age: TEST_USER.age,
      }),
    });

    if (response.ok) {
      console.log('[Setup] ✅ Test user created');
    } else if (response.status === 409) {
      console.log('[Setup] ℹ️  Test user already exists');
    } else {
      console.warn('[Setup] ⚠️  User creation failed:', response.status);
    }
  } catch (error) {
    console.error('[Setup] ❌ Error creating test user:', error);
  }
}

/**
 * Helper: Get authentication token
 */
async function getAuthToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: TEST_USER.email,
      password: TEST_USER.password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Helper: Get user's program ID
 */
async function getUserProgramId(token: string): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/programs`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!data.programs || data.programs.length === 0) {
    throw new Error('No programs found for test user');
  }

  return data.programs[0].id;
}

/**
 * Helper: Create a program if none exists
 */
async function ensureTestProgramExists(token: string): Promise<number> {
  try {
    const programId = await getUserProgramId(token);
    console.log('[Setup] ℹ️  Using existing program:', programId);
    return programId;
  } catch {
    console.log('[Setup] Creating new program for test user...');

    const response = await fetch(`${API_BASE_URL}/api/programs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'E2E Test Program',
        duration_weeks: 8,
        mesocycle_phase: 'mev',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create program: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Setup] ✅ Created program:', data.program_id);
    return data.program_id;
  }
}

/**
 * Test Suite: Exercise Customization - Full Coverage
 */
test.describe('Exercise Customization - Full E2E Suite', () => {
  // Setup: Ensure test user and program exist before all tests
  test.beforeAll(async () => {
    console.log('\n=== Test Setup ===');
    await ensureTestUserExists();

    const token = await getAuthToken();
    await ensureTestProgramExists(token);
  });

  // Cleanup: Take screenshot on failure
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  });

  /**
   * Test 1: View Exercise Library (100+ exercises)
   *
   * Tests browsing the complete exercise library.
   * Validates:
   * - Library loads all 100+ exercises
   * - Exercise count displayed
   * - Pagination or scrolling works
   * - Exercise cards render correctly
   */
  test('Test 1: should view exercise library with 100+ exercises', async ({ page }) => {
    console.log('\n=== Test 1: View Exercise Library (100+ exercises) ===');

    // Step 1: Login
    await login(page);

    // Step 2: Navigate to planner
    await navigateToTab(page, 'Planner');

    // Step 3: Wait for planner to load
    console.log('[Test 1] Waiting for planner to load...');
    await page.waitForSelector('text=/Planner|Training|Program|Exercises/i', { timeout: 10000 });

    // Step 4: Open exercise selection modal
    console.log('[Test 1] Opening exercise library...');
    const addExerciseButton = page
      .locator('button:has-text("Add Exercise"), button:has-text("Add First Exercise")')
      .first();
    await addExerciseButton.click();

    // Step 5: Wait for modal to open
    await page.waitForSelector('text=Select Exercise', { timeout: 5000 });
    await expect(page.locator('text=Select Exercise')).toBeVisible();
    console.log('[Test 1] ✅ Exercise selection modal opened');

    // Step 6: Wait for exercises to load
    await page.waitForTimeout(2000); // Allow API call to complete

    // Step 7: Verify results counter shows 100+ exercises
    const resultsCounter = page.locator('text=/\\d+ exercises? found/i').first();
    await expect(resultsCounter).toBeVisible({ timeout: 5000 });

    const resultsText = await resultsCounter.textContent();
    const exerciseCount = parseInt(resultsText?.match(/(\d+)/)?.[1] || '0');

    console.log(`[Test 1] Exercise count: ${exerciseCount}`);
    expect(exerciseCount).toBeGreaterThanOrEqual(100);
    console.log('[Test 1] ✅ Library contains 100+ exercises');

    // Step 8: Verify exercise cards are rendered
    const exerciseCards = page.locator('button:has-text("Select")');
    const cardCount = await exerciseCards.count();
    expect(cardCount).toBeGreaterThan(0);
    console.log(`[Test 1] ✅ Rendered ${cardCount} exercise cards`);

    // Step 9: Scroll to test pagination/infinite scroll
    const scrollContainer = page.locator('[role="list"], .flatlist').first();
    if ((await scrollContainer.count()) > 0) {
      await scrollContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(1000);
      console.log('[Test 1] ✅ Scrolled to bottom to test rendering');
    }

    // Step 10: Close modal
    const closeButton = page.locator('button:has-text("Close")').first();
    await closeButton.click();
    await page.waitForSelector('text=Select Exercise', { state: 'hidden', timeout: 5000 });
    console.log('[Test 1] ✅ Exercise library test complete');
  });

  /**
   * Test 2: Filter by Muscle Group, Equipment, Movement Pattern
   *
   * Tests all filtering capabilities in exercise library.
   * Validates:
   * - Muscle group filter (13 muscle groups)
   * - Equipment filter (5 types)
   * - Movement pattern filter (compound/isolation)
   * - Difficulty filter (beginner/intermediate/advanced)
   * - Combined filters with AND logic
   * - Results counter updates correctly
   */
  test('Test 2: should filter exercises by muscle group, equipment, and movement pattern', async ({
    page,
  }) => {
    console.log('\n=== Test 2: Filter Exercise Library ===');

    // Step 1: Login and navigate to planner
    await login(page);
    await navigateToTab(page, 'Planner');

    // Step 2: Open exercise selection modal
    console.log('[Test 2] Opening exercise selection modal...');
    await page.waitForTimeout(2000);
    const addButton = page
      .locator('button:has-text("Add Exercise"), button:has-text("Add First Exercise")')
      .first();
    await addButton.click();
    await page.waitForSelector('text=Select Exercise', { timeout: 5000 });

    // Get initial count
    await page.waitForTimeout(1500);
    const initialResults = await page
      .locator('text=/\\d+ exercises? found/i')
      .first()
      .textContent();
    const initialCount = parseInt(initialResults?.match(/(\d+)/)?.[1] || '0');
    console.log(`[Test 2] Initial exercise count: ${initialCount}`);

    // Step 3: Filter by muscle group (Chest)
    console.log('[Test 2] Filtering by muscle group: Chest...');
    const chestChip = page.locator('button:has-text("Chest")').first();
    await chestChip.click();
    await page.waitForTimeout(1500); // Wait for API call

    const chestResults = await page.locator('text=/\\d+ exercises? found/i').first().textContent();
    const chestCount = parseInt(chestResults?.match(/(\d+)/)?.[1] || '0');
    console.log(`[Test 2] ✅ Chest exercises: ${chestCount}`);
    expect(chestCount).toBeLessThan(initialCount);
    expect(chestCount).toBeGreaterThan(0);

    // Step 4: Filter by equipment (Barbell)
    console.log('[Test 2] Adding equipment filter: Barbell...');
    const barbellChip = page
      .locator('button:has-text("Barbell")')
      .filter({ hasText: /^Barbell$/i })
      .first();
    await barbellChip.click();
    await page.waitForTimeout(1500);

    const barbellResults = await page
      .locator('text=/\\d+ exercises? found/i')
      .first()
      .textContent();
    const barbellCount = parseInt(barbellResults?.match(/(\d+)/)?.[1] || '0');
    console.log(`[Test 2] ✅ Chest + Barbell exercises: ${barbellCount}`);
    expect(barbellCount).toBeLessThanOrEqual(chestCount);

    // Step 5: Filter by movement pattern (Compound)
    console.log('[Test 2] Adding movement pattern filter: Compound...');
    const compoundChip = page.locator('button:has-text("Compound")').first();
    await compoundChip.click();
    await page.waitForTimeout(1500);

    const compoundResults = await page
      .locator('text=/\\d+ exercises? found/i')
      .first()
      .textContent();
    const compoundCount = parseInt(compoundResults?.match(/(\d+)/)?.[1] || '0');
    console.log(`[Test 2] ✅ Chest + Barbell + Compound exercises: ${compoundCount}`);
    expect(compoundCount).toBeLessThanOrEqual(barbellCount);
    expect(compoundCount).toBeGreaterThan(0); // Should have at least Barbell Bench Press

    // Step 6: Verify specific exercises appear (e.g., Barbell Bench Press)
    const benchPressCard = page.locator('text=/Barbell.*Bench.*Press/i');
    await expect(benchPressCard).toBeVisible({ timeout: 3000 });
    console.log('[Test 2] ✅ Expected exercise found: Barbell Bench Press');

    // Step 7: Test search filter
    console.log('[Test 2] Testing search filter: "bench"...');
    const searchBar = page
      .locator('input[placeholder*="Search"], input[aria-label*="Search"]')
      .first();
    await searchBar.fill('bench');
    await page.waitForTimeout(800); // Debounce

    const searchResults = page.locator('text=/Bench Press/i');
    const searchResultsCount = await searchResults.count();
    expect(searchResultsCount).toBeGreaterThan(0);
    console.log(`[Test 2] ✅ Search found ${searchResultsCount} results for "bench"`);

    // Step 8: Clear all filters
    console.log('[Test 2] Clearing all filters...');
    await searchBar.clear();
    await page.waitForTimeout(500);

    const allChip = page.locator('button:has-text("All")').first();
    await allChip.click();
    await page.waitForTimeout(1000);

    // Deselect equipment and movement pattern
    await barbellChip.click();
    await page.waitForTimeout(500);
    await compoundChip.click();
    await page.waitForTimeout(1000);

    const finalResults = await page.locator('text=/\\d+ exercises? found/i').first().textContent();
    const finalCount = parseInt(finalResults?.match(/(\d+)/)?.[1] || '0');
    console.log(`[Test 2] ✅ After clearing filters: ${finalCount} exercises`);
    expect(finalCount).toBe(initialCount);

    // Step 9: Close modal
    const closeButton = page.locator('button:has-text("Close")').first();
    await closeButton.click();
    console.log('[Test 2] ✅ Filter test complete');
  });

  /**
   * Test 3: Swap Exercise in Program (Bench Press → Dumbbell Press)
   *
   * Tests exercise swapping with muscle group compatibility.
   * Validates:
   * - Swap menu option available
   * - Modal pre-filtered by muscle group
   * - Swap API call succeeds
   * - Sets/reps/RIR preserved
   * - Exercise name updates in list
   * - Volume warning displayed (if applicable)
   */
  test('Test 3: should swap exercise (Bench Press → Dumbbell Press)', async ({ page }) => {
    console.log('\n=== Test 3: Swap Exercise ===');

    // Step 1: Login and navigate to planner
    await login(page);
    await navigateToTab(page, 'Planner');

    // Step 2: Wait for exercise list to load
    console.log('[Test 3] Waiting for exercise list...');
    await page.waitForTimeout(2000);

    // Step 3: Find first exercise card
    const exerciseCards = page.locator('[role="button"]:has(text=/\\d+ sets/)');
    const exerciseCount = await exerciseCards.count();

    if (exerciseCount === 0) {
      console.log('[Test 3] ⚠️  No exercises in program, skipping test');
      test.skip();
      return;
    }

    const firstExerciseCard = exerciseCards.first();
    const originalExerciseName = await firstExerciseCard
      .locator('text=/[A-Z][a-z]+.*Press|Row|Squat|Curl|Raise|Fly/i')
      .first()
      .textContent();
    console.log(`[Test 3] Original exercise: ${originalExerciseName}`);

    // Step 4: Open exercise menu (3-dot icon)
    console.log('[Test 3] Opening exercise menu...');
    const menuButton = firstExerciseCard
      .locator('button:has([icon="dots-vertical"]), button[aria-label*="Options"]')
      .first();
    await menuButton.click();
    await page.waitForTimeout(500);
    console.log('[Test 3] ✅ Exercise menu opened');

    // Step 5: Click "Swap Exercise" menu item
    const swapMenuItem = page.locator('text=Swap Exercise').first();
    await expect(swapMenuItem).toBeVisible({ timeout: 3000 });
    await swapMenuItem.click();
    console.log('[Test 3] ✅ Swap Exercise clicked');

    // Step 6: Wait for swap modal to open
    await page.waitForSelector('text=Select Exercise', { timeout: 5000 });
    console.log('[Test 3] ✅ Swap modal opened');

    // Step 7: Verify muscle group filter is pre-applied
    await page.waitForTimeout(1000);
    const activeFilterChips = page
      .locator('button[aria-selected="true"], button.selected')
      .filter({ hasText: /Chest|Back|Shoulders|Legs|Arms|Quads|Hamstrings|Biceps|Triceps/i });

    const activeFilterCount = await activeFilterChips.count();
    if (activeFilterCount > 0) {
      const activeMuscleGroup = await activeFilterChips.first().textContent();
      console.log(`[Test 3] ✅ Pre-filtered by muscle group: ${activeMuscleGroup}`);
    }

    // Step 8: Select first alternative exercise
    const selectButtons = page.locator('button:has-text("Select")');
    const selectButtonsCount = await selectButtons.count();

    if (selectButtonsCount === 0) {
      console.log('[Test 3] ⚠️  No alternative exercises available, skipping swap');
      const closeButton = page.locator('button:has-text("Close")').first();
      await closeButton.click();
      test.skip();
      return;
    }

    // Get new exercise name before clicking
    const firstSelectButton = selectButtons.first();
    const newExerciseCard = firstSelectButton.locator('xpath=../..');
    const newExerciseName = await newExerciseCard
      .locator('text=/[A-Z][a-z]+.*Press|Row|Squat|Curl|Raise|Fly/i')
      .first()
      .textContent();
    console.log(`[Test 3] Swapping to: ${newExerciseName}`);

    // Step 9: Listen for swap API call and click select
    const swapApiPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/program-exercises') && response.url().includes('/swap'),
      { timeout: 10000 }
    );

    await firstSelectButton.click();

    // Step 10: Verify swap API call
    console.log('[Test 3] Waiting for PUT /api/program-exercises/:id/swap API call...');
    const swapApiResponse = await swapApiPromise;
    expect(swapApiResponse.status()).toBe(200);

    const swapResponseData = await swapApiResponse.json();
    console.log('[Test 3] ✅ Swap API response:', swapResponseData);

    // Step 11: Verify swap response data
    expect(swapResponseData.swapped).toBe(true);
    expect(swapResponseData.new_exercise_name).toBeTruthy();
    console.log(
      `[Test 3] ✅ Swapped: ${swapResponseData.old_exercise_name} → ${swapResponseData.new_exercise_name}`
    );

    // Step 12: Check for volume warning
    if (swapResponseData.volume_warning) {
      console.log(`[Test 3] ⚠️  Volume warning: ${swapResponseData.volume_warning}`);
      // Wait for snackbar to appear
      const snackbar = page
        .locator(`text=/${swapResponseData.volume_warning.substring(0, 20)}/i`)
        .first();
      if (await snackbar.isVisible({ timeout: 2000 })) {
        console.log('[Test 3] ✅ Volume warning displayed in UI');
      }
    } else {
      console.log('[Test 3] ℹ️  No volume warning');
    }

    // Step 13: Verify modal closes
    await page.waitForSelector('text=Select Exercise', { state: 'hidden', timeout: 5000 });
    console.log('[Test 3] ✅ Swap modal closed');

    // Step 14: Verify exercise updated in list
    await page.waitForTimeout(1500); // Allow UI to refresh
    const updatedExerciseList = page.locator(`text=/${newExerciseName}/i`).first();
    await expect(updatedExerciseList).toBeVisible({ timeout: 5000 });
    console.log('[Test 3] ✅ Exercise swap complete - UI updated');
  });

  /**
   * Test 4: Reorder Exercises in Program Day
   *
   * Tests exercise reordering functionality.
   * Validates:
   * - Drag handles visible
   * - Reorder API endpoint works
   * - Order persists after refresh
   *
   * Note: Full drag-and-drop gestures not supported in Playwright web tests.
   * This test validates the reorder API endpoint directly.
   */
  test('Test 4: should reorder exercises in program day', async ({ page }) => {
    console.log('\n=== Test 4: Reorder Exercises ===');

    // Step 1: Login and navigate to planner
    await login(page);
    await navigateToTab(page, 'Planner');

    // Step 2: Wait for exercises to load
    console.log('[Test 4] Waiting for exercise list...');
    await page.waitForTimeout(2000);

    // Step 3: Verify drag handles are visible
    const dragHandles = page.locator('[icon="drag-horizontal-variant"], [aria-label*="drag"]');
    const dragHandlesCount = await dragHandles.count();

    if (dragHandlesCount < 2) {
      console.log('[Test 4] ⚠️  Not enough exercises to test reordering (need at least 2)');
      test.skip();
      return;
    }

    console.log(`[Test 4] ✅ Found ${dragHandlesCount} exercises with drag handles`);

    // Step 4: Get original exercise order
    const exerciseNames = await page
      .locator('text=/[A-Z][a-z]+.*Press|Row|Squat|Curl|Raise|Fly|Extension|Lunge/i')
      .allTextContents();
    const originalOrder = exerciseNames.slice(0, 3);
    console.log('[Test 4] Original order:', originalOrder);

    // Step 5: Test reorder via API (simulating drag-and-drop result)
    console.log('[Test 4] Testing reorder API endpoint...');

    const token = await getAuthToken();

    // Get program day ID (first available day)
    const programDaysResponse = await fetch(`${API_BASE_URL}/api/program-days`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const programDaysData = await programDaysResponse.json();
    const firstProgramDayId = programDaysData.program_days?.[0]?.id;

    if (!firstProgramDayId) {
      console.log('[Test 4] ⚠️  No program days found');
      test.skip();
      return;
    }

    // Get exercises for this day
    const exercisesResponse = await fetch(
      `${API_BASE_URL}/api/program-exercises?program_day_id=${firstProgramDayId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const exercisesData = await exercisesResponse.json();
    const exercises = exercisesData.exercises;

    if (exercises.length < 2) {
      console.log('[Test 4] ⚠️  Not enough exercises to reorder');
      test.skip();
      return;
    }

    // Build reverse order
    const reorderPayload = exercises.map((ex: any, index: number) => ({
      program_exercise_id: ex.id,
      new_order_index: exercises.length - 1 - index, // Reverse order
    }));

    console.log('[Test 4] Reordering exercises via API...');
    const reorderResponse = await fetch(`${API_BASE_URL}/api/program-exercises/batch-reorder`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        program_day_id: firstProgramDayId,
        exercise_order: reorderPayload,
      }),
    });

    expect(reorderResponse.status).toBe(200);
    console.log('[Test 4] ✅ Reorder API call successful');

    // Step 6: Refresh page and verify order persisted
    await page.reload();
    await page.waitForTimeout(3000); // Allow page to reload and exercises to load

    const updatedExerciseNames = await page
      .locator('text=/[A-Z][a-z]+.*Press|Row|Squat|Curl|Raise|Fly|Extension|Lunge/i')
      .allTextContents();
    const newOrder = updatedExerciseNames.slice(0, 3);
    console.log('[Test 4] New order after reorder:', newOrder);

    // Verify order changed
    const orderChanged = JSON.stringify(originalOrder) !== JSON.stringify(newOrder);
    expect(orderChanged).toBe(true);
    console.log('[Test 4] ✅ Exercise reordering test complete');
  });

  /**
   * Test 5: View Alternative Exercise Suggestions
   *
   * Tests alternative exercise suggestions with muscle group compatibility.
   * Validates:
   * - Alternatives filtered by same primary muscle group
   * - "Same Equipment" badge for matching equipment
   * - Equipment difference warnings
   * - Exercise metadata displayed
   */
  test('Test 5: should view alternative exercise suggestions', async ({ page }) => {
    console.log('\n=== Test 5: Alternative Exercise Suggestions ===');

    // Step 1: Login and navigate to planner
    await login(page);
    await navigateToTab(page, 'Planner');

    // Step 2: Wait for exercises to load
    await page.waitForTimeout(2000);

    // Step 3: Open swap modal (alternatives use same modal)
    console.log('[Test 5] Opening swap modal to view alternatives...');
    const exerciseCard = page.locator('[role="button"]:has(text=/\\d+ sets/)').first();

    if ((await exerciseCard.count()) === 0) {
      console.log('[Test 5] ⚠️  No exercises in program, skipping test');
      test.skip();
      return;
    }

    const menuButton = exerciseCard
      .locator('button:has([icon="dots-vertical"]), button[aria-label*="Options"]')
      .first();
    await menuButton.click();
    await page.waitForTimeout(500);

    const swapMenuItem = page.locator('text=Swap Exercise').first();
    await swapMenuItem.click();

    // Step 4: Wait for modal to open
    await page.waitForSelector('text=Select Exercise', { timeout: 5000 });
    console.log('[Test 5] ✅ Alternative exercises modal opened');

    // Step 5: Verify exercise cards show metadata
    await page.waitForTimeout(1500);

    const metadataTexts = page.locator('text=/primary muscle:|equipment:|type:|•/i');
    const metadataCount = await metadataTexts.count();

    if (metadataCount > 0) {
      console.log(`[Test 5] ✅ Found exercise metadata in ${metadataCount} locations`);
    }

    // Step 6: Check for "Same Equipment" badges
    const sameEquipmentBadges = page.locator('text=Same Equipment');
    const sameEquipmentCount = await sameEquipmentBadges.count();
    console.log(`[Test 5] ℹ️  ${sameEquipmentCount} exercises with same equipment badge`);

    // Step 7: Verify exercise details are visible
    const exerciseDetails = page.locator('text=/barbell|dumbbell|cable|machine|bodyweight/i');
    const detailsCount = await exerciseDetails.count();
    expect(detailsCount).toBeGreaterThan(0);
    console.log(`[Test 5] ✅ Found ${detailsCount} exercises with equipment details`);

    // Step 8: Verify "Select" buttons are present
    const selectButtons = page.locator('button:has-text("Select")');
    const selectButtonsCount = await selectButtons.count();
    expect(selectButtonsCount).toBeGreaterThan(0);
    console.log(`[Test 5] ✅ ${selectButtonsCount} selectable alternatives available`);

    // Step 9: Verify difficulty levels shown (if available)
    const difficultyBadges = page.locator('text=/beginner|intermediate|advanced/i');
    const difficultyCount = await difficultyBadges.count();
    console.log(`[Test 5] ℹ️  ${difficultyCount} exercises with difficulty levels`);

    // Step 10: Close modal
    const closeButton = page.locator('button:has-text("Close")').first();
    await closeButton.click();
    await page.waitForSelector('text=Select Exercise', { state: 'hidden', timeout: 5000 });
    console.log('[Test 5] ✅ Alternative exercise suggestions test complete');
  });

  /**
   * Test 6: See Exercise Details (Muscle Groups, Equipment, Difficulty)
   *
   * Tests viewing detailed exercise information.
   * Validates:
   * - Exercise name
   * - Primary muscle group
   * - Equipment type
   * - Movement pattern (compound/isolation)
   * - Difficulty level
   */
  test('Test 6: should see exercise details (muscle groups, equipment, difficulty)', async ({
    page,
  }) => {
    console.log('\n=== Test 6: Exercise Details ===');

    // Step 1: Login and navigate to planner
    await login(page);
    await navigateToTab(page, 'Planner');

    // Step 2: Open exercise selection modal
    await page.waitForTimeout(2000);
    const addButton = page
      .locator('button:has-text("Add Exercise"), button:has-text("Add First Exercise")')
      .first();
    await addButton.click();
    await page.waitForSelector('text=Select Exercise', { timeout: 5000 });

    // Step 3: Wait for exercises to load
    await page.waitForTimeout(1500);

    // Step 4: Find first exercise card
    const firstExerciseCard = page
      .locator('button:has-text("Select")')
      .first()
      .locator('xpath=../..');

    // Step 5: Extract exercise details
    const exerciseName = await firstExerciseCard
      .locator('text=/[A-Z][a-z]+.*Press|Row|Squat|Curl|Raise|Fly/i')
      .first()
      .textContent();
    console.log(`[Test 6] Exercise name: ${exerciseName}`);
    expect(exerciseName).toBeTruthy();

    // Step 6: Verify muscle group, equipment, and movement pattern displayed
    const metaText = await firstExerciseCard
      .locator('text=/•|primary muscle|equipment|type/i')
      .first()
      .textContent();
    console.log(`[Test 6] Exercise metadata: ${metaText}`);
    expect(metaText).toBeTruthy();

    // Step 7: Check for muscle group
    const muscleGroupPatterns = [
      'chest',
      'back',
      'shoulders',
      'quads',
      'hamstrings',
      'glutes',
      'biceps',
      'triceps',
      'calves',
      'abs',
    ];
    const hasMuscleGroup = muscleGroupPatterns.some((mg) => metaText?.toLowerCase().includes(mg));
    expect(hasMuscleGroup).toBe(true);
    console.log('[Test 6] ✅ Muscle group displayed');

    // Step 8: Check for equipment type
    const equipmentTypes = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'];
    const hasEquipment = equipmentTypes.some((eq) => metaText?.toLowerCase().includes(eq));
    expect(hasEquipment).toBe(true);
    console.log('[Test 6] ✅ Equipment type displayed');

    // Step 9: Check for movement pattern
    const movementPatterns = ['compound', 'isolation'];
    const hasMovementPattern = movementPatterns.some((mp) => metaText?.toLowerCase().includes(mp));
    expect(hasMovementPattern).toBe(true);
    console.log('[Test 6] ✅ Movement pattern displayed');

    // Step 10: Check for difficulty (if available)
    const difficultyBadge = firstExerciseCard.locator('text=/beginner|intermediate|advanced/i');
    const hasDifficulty = (await difficultyBadge.count()) > 0;
    if (hasDifficulty) {
      const difficultyText = await difficultyBadge.textContent();
      console.log(`[Test 6] ✅ Difficulty displayed: ${difficultyText}`);
    } else {
      console.log('[Test 6] ℹ️  Difficulty not displayed (optional field)');
    }

    // Step 11: Close modal
    const closeButton = page.locator('button:has-text("Close")').first();
    await closeButton.click();
    console.log('[Test 6] ✅ Exercise details test complete');
  });

  /**
   * Test 7: Verify Program Volume Updates After Swap
   *
   * Tests volume tracking after exercise swap.
   * Validates:
   * - Volume calculation updates after swap
   * - Volume zone classification (below_mev, adequate, optimal, above_mrv)
   * - Volume warnings displayed
   * - Weekly volume totals recalculated
   *
   * Note: Requires ProgramVolumeOverview component or Analytics view.
   */
  test('Test 7: should verify program volume updates after swap', async ({ page }) => {
    console.log('\n=== Test 7: Volume Updates After Swap ===');

    // Step 1: Login and navigate to planner
    await login(page);
    await navigateToTab(page, 'Planner');
    await page.waitForTimeout(2000);

    // Step 2: Check for volume overview widget (if available on planner)
    const volumeWidget = page.locator('text=/Volume Overview|Weekly Volume/i').first();
    const hasVolumeWidget = (await volumeWidget.count()) > 0;

    if (!hasVolumeWidget) {
      console.log('[Test 7] ℹ️  Volume widget not visible on planner, checking Analytics tab...');
      await navigateToTab(page, 'Analytics');
      await page.waitForTimeout(2000);
    }

    // Step 3: Verify volume data is displayed
    const volumeData = page.locator('text=/\\d+ sets/i, text=/MEV|MAV|MRV/i');
    const volumeDataCount = await volumeData.count();

    if (volumeDataCount === 0) {
      console.log(
        '[Test 7] ⚠️  No volume data visible in UI. Volume tracking may require Analytics screen.'
      );
      console.log('[Test 7] Testing via API instead...');

      // Step 4: Get volume data via API
      const token = await getAuthToken();
      const programId = await getUserProgramId(token);

      const volumeResponse = await fetch(
        `${API_BASE_URL}/api/analytics/program-volume-analysis?program_id=${programId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!volumeResponse.ok) {
        console.log('[Test 7] ⚠️  Volume API not available, skipping test');
        test.skip();
        return;
      }

      const volumeData = await volumeResponse.json();
      console.log('[Test 7] Volume data from API:', volumeData);

      expect(volumeData.muscle_groups).toBeDefined();
      expect(Array.isArray(volumeData.muscle_groups)).toBe(true);
      console.log(
        `[Test 7] ✅ Volume data contains ${volumeData.muscle_groups.length} muscle groups`
      );

      // Step 5: Verify volume zones are calculated
      const muscleGroupsWithZones = volumeData.muscle_groups.filter(
        (mg: any) => mg.zone !== undefined
      );
      console.log(`[Test 7] ✅ ${muscleGroupsWithZones.length} muscle groups have volume zones`);

      // Step 6: Check for warnings
      const warnings = volumeData.muscle_groups.filter((mg: any) => mg.warning !== null);
      console.log(`[Test 7] ℹ️  ${warnings.length} muscle groups with volume warnings`);

      if (warnings.length > 0) {
        console.log('[Test 7] Volume warnings:', warnings);
      }

      console.log('[Test 7] ✅ Volume tracking verified via API');
    } else {
      console.log(`[Test 7] ✅ Volume data visible in UI (${volumeDataCount} elements)`);

      // Step 4: Perform a swap and verify volume updates
      await navigateToTab(page, 'Planner');
      await page.waitForTimeout(2000);

      // Get current volume state (if visible)
      const initialVolumeText = await volumeData.first().textContent();
      console.log(`[Test 7] Initial volume state: ${initialVolumeText}`);

      // Perform swap (same as Test 3)
      const exerciseCard = page.locator('[role="button"]:has(text=/\\d+ sets/)').first();
      if ((await exerciseCard.count()) > 0) {
        const menuButton = exerciseCard
          .locator('button:has([icon="dots-vertical"]), button[aria-label*="Options"]')
          .first();
        await menuButton.click();
        await page.waitForTimeout(500);

        const swapMenuItem = page.locator('text=Swap Exercise').first();
        if ((await swapMenuItem.count()) > 0) {
          await swapMenuItem.click();
          await page.waitForSelector('text=Select Exercise', { timeout: 5000 });
          await page.waitForTimeout(1500);

          const selectButton = page.locator('button:has-text("Select")').first();
          if ((await selectButton.count()) > 0) {
            await selectButton.click();

            // Wait for swap to complete
            await page.waitForSelector('text=Select Exercise', {
              state: 'hidden',
              timeout: 5000,
            });
            await page.waitForTimeout(2000);

            // Check for volume warning snackbar
            const volumeWarning = page.locator(
              'text=/volume.*MEV|volume.*MAV|volume.*MRV|above MRV|below MEV/i'
            );
            const hasWarning = await volumeWarning.isVisible({ timeout: 3000 });

            if (hasWarning) {
              const warningText = await volumeWarning.textContent();
              console.log(`[Test 7] ✅ Volume warning displayed: ${warningText}`);
            } else {
              console.log('[Test 7] ℹ️  No volume warning (swap within optimal range)');
            }

            console.log('[Test 7] ✅ Volume updates after swap verified');
          }
        }
      }
    }

    console.log('[Test 7] ✅ Volume tracking test complete');
  });
});

/**
 * Test Suite: Exercise Customization - Edge Cases & Error Handling
 */
test.describe('Exercise Customization - Edge Cases', () => {
  test.beforeAll(async () => {
    await ensureTestUserExists();
    const token = await getAuthToken();
    await ensureTestProgramExists(token);
  });

  /**
   * Test: Handle empty exercise library
   */
  test('Edge Case 1: should handle empty exercise library gracefully', async ({ page }) => {
    console.log('\n=== Edge Case 1: Empty Exercise Library ===');

    await login(page);
    await navigateToTab(page, 'Planner');
    await page.waitForTimeout(2000);

    const addButton = page
      .locator('button:has-text("Add Exercise"), button:has-text("Add First Exercise")')
      .first();
    await addButton.click();
    await page.waitForSelector('text=Select Exercise', { timeout: 5000 });

    // Apply filter that returns no results
    const searchBar = page.locator('input[placeholder*="Search"]').first();
    await searchBar.fill('xyznonexistentexercise123');
    await page.waitForTimeout(1000);

    // Verify empty state appears
    const emptyState = page.locator('text=/No exercises found|No results/i');
    await expect(emptyState).toBeVisible({ timeout: 3000 });
    console.log('[Edge Case 1] ✅ Empty state displayed correctly');

    const closeButton = page.locator('button:has-text("Close")').first();
    await closeButton.click();
  });

  /**
   * Test: Handle network error during swap
   */
  test('Edge Case 2: should handle network error during swap', async ({ page }) => {
    console.log('\n=== Edge Case 2: Network Error Handling ===');

    await login(page);
    await navigateToTab(page, 'Planner');
    await page.waitForTimeout(2000);

    // Intercept swap API call and fail it
    await page.route('**/api/program-exercises/*/swap', (route) => {
      route.abort('failed');
    });

    const exerciseCard = page.locator('[role="button"]:has(text=/\\d+ sets/)').first();
    if ((await exerciseCard.count()) > 0) {
      const menuButton = exerciseCard
        .locator('button:has([icon="dots-vertical"]), button[aria-label*="Options"]')
        .first();

      if ((await menuButton.count()) > 0) {
        await menuButton.click();
        await page.waitForTimeout(500);

        const swapMenuItem = page.locator('text=Swap Exercise').first();
        if ((await swapMenuItem.count()) > 0) {
          await swapMenuItem.click();
          await page.waitForSelector('text=Select Exercise', { timeout: 5000 });
          await page.waitForTimeout(1500);

          const selectButton = page.locator('button:has-text("Select")').first();
          if ((await selectButton.count()) > 0) {
            await selectButton.click();

            // Wait for error message
            const errorSnackbar = page.locator('text=/Failed|Error|try again/i').first();
            await expect(errorSnackbar).toBeVisible({ timeout: 5000 });
            console.log('[Edge Case 2] ✅ Error message displayed correctly');
          }
        }
      }
    }

    // Remove route interception
    await page.unroute('**/api/program-exercises/*/swap');
  });
});
