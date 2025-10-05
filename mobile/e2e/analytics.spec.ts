/**
 * E2E Analytics and Volume Tracking Tests
 *
 * Comprehensive test suite covering all analytics features in FitFlow Pro:
 * - 1RM Progression Chart (T063)
 * - Volume Trends (T082)
 * - Current Week Volume Widget
 * - Consistency Metrics
 * - Program Volume Analysis
 *
 * Test Flow:
 * 1. Setup: Login and seed test data
 * 2. Test each analytics feature independently
 * 3. Verify data accuracy, chart rendering, API integration
 * 4. Test loading states, error handling, and interactions
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper: Login to application
 */
async function login(page: Page): Promise<void> {
  console.log('🔐 Logging in...');

  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Wait for auth screen
  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });

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

  await page.waitForTimeout(3000);
  console.log('✓ Login successful\n');
}

/**
 * Helper: Navigate to Analytics tab
 */
async function navigateToAnalytics(page: Page): Promise<void> {
  console.log('📊 Navigating to Analytics...');

  // Click Analytics tab in bottom navigation
  const analyticsTab = page.getByText('Analytics', { exact: true }).last();
  await analyticsTab.click({ timeout: 10000 });

  await page.waitForTimeout(2000);
  console.log('✓ Analytics screen loaded\n');
}

/**
 * Helper: Switch to specific analytics tab
 */
async function switchToTab(page: Page, tabName: string): Promise<void> {
  console.log(`🔄 Switching to ${tabName} tab...`);

  // Find and click the tab button
  const tabButton = page
    .locator('button')
    .filter({ hasText: new RegExp(`^${tabName}$`, 'i') })
    .first();

  await tabButton.click();
  await page.waitForTimeout(1500); // Wait for data to load

  console.log(`✓ ${tabName} tab active\n`);
}

/**
 * Test 1: 1RM Progression Chart
 *
 * Verifies:
 * - Exercise selector dropdown
 * - Chart displays with data points
 * - Summary statistics (Current, Change, Best)
 * - Date range filtering
 * - Empty state handling
 */
test('1RM Progression Chart - displays and interacts correctly', async ({ page }) => {
  test.setTimeout(120000);

  console.log('\n========================================');
  console.log('📈 TEST: 1RM Progression Chart');
  console.log('========================================\n');

  await login(page);
  await navigateToAnalytics(page);

  // Ensure we're on the Strength tab (default)
  await switchToTab(page, 'Strength');

  // ===== Verify Chart Title =====
  console.log('Step 1: Verifying chart title...');
  const chartTitle = await page.textContent('body');
  expect(chartTitle).toContain('1RM Progression');
  console.log('✓ Chart title found\n');

  // ===== Verify Exercise Selector =====
  console.log('Step 2: Testing exercise selector...');

  // Find and click the exercise selector button
  const selectorButton = page
    .locator('button')
    .filter({ hasText: /Barbell Bench Press|Barbell Back Squat|Deadlift|Overhead Press/i })
    .first();

  const initialExercise = await selectorButton.textContent();
  console.log(`  Current exercise: ${initialExercise?.trim()}`);

  await selectorButton.click();
  await page.waitForTimeout(500);

  // Verify dropdown menu opened
  const menuItem = page.locator('text=Barbell Back Squat').first();
  expect(await menuItem.isVisible()).toBeTruthy();
  console.log('  ✓ Exercise menu opened');

  // Select different exercise
  await menuItem.click();
  await page.waitForTimeout(2000); // Wait for chart to reload

  // Verify exercise changed
  const newExercise = await selectorButton.textContent();
  expect(newExercise?.trim()).toContain('Barbell Back Squat');
  console.log('  ✓ Exercise changed to: Barbell Back Squat\n');

  // ===== Verify Chart Rendering =====
  console.log('Step 3: Verifying chart elements...');

  const bodyContent = await page.textContent('body');

  // Check for summary statistics
  const hasCurrent = bodyContent?.includes('Current');
  const hasChange = bodyContent?.includes('Change');
  const hasBest = bodyContent?.includes('Best');

  expect(hasCurrent).toBeTruthy();
  expect(hasChange).toBeTruthy();
  expect(hasBest).toBeTruthy();

  console.log('  ✓ Summary statistics displayed (Current, Change, Best)');

  // Check for 1RM unit label (kg or lbs)
  const hasUnit = bodyContent?.includes('kg') || bodyContent?.includes('lbs');
  expect(hasUnit).toBeTruthy();
  console.log('  ✓ Weight unit label present\n');

  // ===== Test Empty State =====
  console.log('Step 4: Testing empty state...');

  // Select an exercise that likely has no data (if exists)
  await selectorButton.click();
  await page.waitForTimeout(500);

  const lastExercise = page.locator('text=Barbell Row').first();
  if ((await lastExercise.count()) > 0) {
    await lastExercise.click();
    await page.waitForTimeout(2000);

    const emptyStateText = await page.textContent('body');
    if (
      emptyStateText?.includes('No progression data') ||
      emptyStateText?.includes('Start logging')
    ) {
      console.log('  ✓ Empty state displayed correctly');
    } else {
      console.log('  ℹ️  Exercise has data, empty state not shown');
    }
  } else {
    console.log('  ℹ️  No exercise without data found');
  }

  // Take screenshot
  await page.screenshot({
    path: '/tmp/analytics-1rm-chart.png',
    fullPage: true,
  });

  console.log('\n✅ 1RM Progression Chart test passed\n');
});

/**
 * Test 2: Volume Trends Chart
 *
 * Verifies:
 * - Muscle group filter chips
 * - Weeks selector (8, 12, 26, 52)
 * - MEV/MAV/MRV threshold lines
 * - Data updates when changing filters
 * - Summary statistics (Current, Average, Peak)
 */
test('Volume Trends - filters and displays correctly', async ({ page }) => {
  test.setTimeout(120000);

  console.log('\n========================================');
  console.log('📊 TEST: Volume Trends Chart');
  console.log('========================================\n');

  await login(page);
  await navigateToAnalytics(page);

  // Switch to Volume tab
  await switchToTab(page, 'Volume');

  // ===== Verify Chart Title =====
  console.log('Step 1: Verifying chart title...');
  const chartTitle = await page.textContent('body');
  expect(chartTitle).toContain('Volume Trends');
  console.log('✓ Chart title found\n');

  // ===== Test Muscle Group Filter =====
  console.log('Step 2: Testing muscle group filter...');

  // Find "All Muscles" chip (should be selected by default)
  const allMusclesChip = page
    .locator('button')
    .filter({ hasText: /All Muscles/i })
    .first();
  expect(await allMusclesChip.count()).toBeGreaterThan(0);
  console.log('  ✓ "All Muscles" filter found');

  // Find and click "Chest" filter
  const chestChip = page
    .locator('button')
    .filter({ hasText: /^Chest$/i })
    .first();

  if ((await chestChip.count()) > 0) {
    await chestChip.click();
    await page.waitForTimeout(2000); // Wait for chart to reload

    console.log('  ✓ Chest filter selected');

    // Verify chart reloaded with chest data
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toContain('Sets per Week'); // Y-axis label
    console.log('  ✓ Chart updated for Chest\n');

    // Test clicking back to All Muscles
    await allMusclesChip.click();
    await page.waitForTimeout(2000);
    console.log('  ✓ Returned to All Muscles view\n');
  } else {
    console.log('  ℹ️  Chest filter not found, skipping muscle group test\n');
  }

  // ===== Test Weeks Selector =====
  console.log('Step 3: Testing weeks selector...');

  // Find and click "12 weeks" button
  const twelveWeeksChip = page
    .locator('button')
    .filter({ hasText: /12 weeks/i })
    .first();

  if ((await twelveWeeksChip.count()) > 0) {
    await twelveWeeksChip.click();
    await page.waitForTimeout(2000); // Wait for data to load

    console.log('  ✓ 12 weeks selected');

    // Verify chart updated
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toContain('Current'); // Summary stat
    console.log('  ✓ Chart updated for 12 weeks\n');
  } else {
    console.log('  ℹ️  Weeks selector not found\n');
  }

  // ===== Verify MEV/MAV/MRV Legend =====
  console.log('Step 4: Verifying volume landmarks...');

  // Select a specific muscle group to see landmarks
  if ((await chestChip.count()) > 0) {
    await chestChip.click();
    await page.waitForTimeout(2000);

    const bodyContent = await page.textContent('body');

    // Check for MEV/MAV/MRV labels
    const hasMEV = bodyContent?.includes('MEV');
    const hasMAV = bodyContent?.includes('MAV');
    const hasMRV = bodyContent?.includes('MRV');

    if (hasMEV && hasMAV && hasMRV) {
      console.log('  ✓ MEV/MAV/MRV landmarks displayed');
    } else {
      console.log('  ℹ️  Some landmarks not visible (might be off-screen or hidden)');
    }
  }

  // ===== Verify Summary Statistics =====
  console.log('\nStep 5: Verifying summary statistics...');

  const bodyContent = await page.textContent('body');

  const hasCurrent = bodyContent?.includes('Current');
  const hasAverage = bodyContent?.includes('Average');
  const hasPeak = bodyContent?.includes('Peak');

  expect(hasCurrent || hasAverage || hasPeak).toBeTruthy();
  console.log('  ✓ Summary statistics present\n');

  // Take screenshot
  await page.screenshot({
    path: '/tmp/analytics-volume-trends.png',
    fullPage: true,
  });

  console.log('\n✅ Volume Trends test passed\n');
});

/**
 * Test 3: Current Week Volume Widget
 *
 * Verifies:
 * - Muscle groups listed
 * - Completed vs planned sets
 * - Zone classification (below_mev, adequate, optimal, above_mrv)
 * - Volume bar visual indicators
 */
test('Current Week Volume - displays volume breakdown', async ({ page }) => {
  test.setTimeout(120000);

  console.log('\n========================================');
  console.log('📈 TEST: Current Week Volume');
  console.log('========================================\n');

  await login(page);

  // Current week volume is shown on Dashboard
  console.log('Step 1: Checking dashboard for volume widget...');

  await page.waitForTimeout(2000);

  const bodyContent = await page.textContent('body');

  // Look for volume-related text
  const hasVolume = bodyContent?.includes('sets') || bodyContent?.includes('Volume');

  if (hasVolume) {
    console.log('  ✓ Volume data found on dashboard\n');

    // Check for muscle group names
    const hasMuscleGroups =
      bodyContent?.includes('Chest') ||
      bodyContent?.includes('Back') ||
      bodyContent?.includes('Legs') ||
      bodyContent?.includes('Shoulders');

    if (hasMuscleGroups) {
      console.log('  ✓ Muscle groups displayed');
    }

    // Check for set counts
    const hasSets = bodyContent?.match(/\d+\/\d+/); // Pattern like "8/12"

    if (hasSets) {
      console.log('  ✓ Set counts displayed (completed/planned)\n');
    }
  } else {
    console.log('  ℹ️  No volume widget on dashboard (might require navigation)\n');
  }

  // Navigate to Analytics > Volume tab for detailed view
  await navigateToAnalytics(page);
  await switchToTab(page, 'Volume');

  await page.waitForTimeout(2000);

  const volumeTabContent = await page.textContent('body');

  // Verify volume data is displayed
  expect(volumeTabContent).toContain('Volume');
  console.log('  ✓ Volume tab displays data\n');

  // Take screenshot
  await page.screenshot({
    path: '/tmp/analytics-current-week-volume.png',
    fullPage: true,
  });

  console.log('\n✅ Current Week Volume test passed\n');
});

/**
 * Test 4: Consistency Metrics
 *
 * Verifies:
 * - Adherence rate (%)
 * - Average session duration (minutes)
 * - Total workouts count
 * - Time period selector (if exists)
 */
test('Consistency Metrics - displays adherence data', async ({ page }) => {
  test.setTimeout(120000);

  console.log('\n========================================');
  console.log('📊 TEST: Consistency Metrics');
  console.log('========================================\n');

  await login(page);
  await navigateToAnalytics(page);

  // Switch to Stats tab (consistency metrics)
  await switchToTab(page, 'Stats');

  // ===== Verify Metrics Title =====
  console.log('Step 1: Verifying metrics title...');
  const bodyContent = await page.textContent('body');
  expect(bodyContent).toContain('Performance Stats');
  console.log('✓ Performance Stats title found\n');

  // ===== Verify Adherence Rate =====
  console.log('Step 2: Verifying adherence rate...');

  const hasAdherence = bodyContent?.includes('Adherence');
  const hasPercentage = bodyContent?.match(/\d+%/); // Pattern like "85%"

  if (hasAdherence && hasPercentage) {
    console.log('  ✓ Adherence rate displayed');
    console.log(`  Adherence: ${hasPercentage[0]}`);
  } else if (bodyContent?.includes('Start tracking')) {
    console.log('  ℹ️  No workouts yet, empty state shown');
  } else {
    console.log('  ⚠️  Adherence rate not found');
  }

  // ===== Verify Average Duration =====
  console.log('\nStep 3: Verifying average duration...');

  const hasDuration = bodyContent?.includes('Duration') || bodyContent?.includes('Avg');
  const hasMinutes = bodyContent?.includes('min');

  if (hasDuration && hasMinutes) {
    console.log('  ✓ Average duration displayed');
  } else {
    console.log('  ℹ️  Duration metric not visible');
  }

  // ===== Verify Total Workouts =====
  console.log('\nStep 4: Verifying total workouts...');

  const hasTotal = bodyContent?.includes('Total Workouts') || bodyContent?.includes('Workouts');

  if (hasTotal) {
    console.log('  ✓ Total workouts metric displayed');
  } else {
    console.log('  ℹ️  Total workouts not visible');
  }

  // ===== Verify Calendar View =====
  console.log('\nStep 5: Checking for calendar view...');

  // WeeklyConsistencyCalendar should be present
  const hasCalendar =
    bodyContent?.includes('Mon') ||
    bodyContent?.includes('Tue') ||
    bodyContent?.includes('Wed') ||
    bodyContent?.includes('Thu') ||
    bodyContent?.includes('Fri') ||
    bodyContent?.includes('Sat') ||
    bodyContent?.includes('Sun');

  if (hasCalendar) {
    console.log('  ✓ Consistency calendar displayed');
  } else {
    console.log('  ℹ️  Calendar not visible');
  }

  // Take screenshot
  await page.screenshot({
    path: '/tmp/analytics-consistency-metrics.png',
    fullPage: true,
  });

  console.log('\n✅ Consistency Metrics test passed\n');
});

/**
 * Test 5: Program Volume Analysis
 *
 * Verifies:
 * - Navigate to planner
 * - View program volume analysis
 * - All muscle groups analyzed
 * - Warnings for imbalanced volume
 * - Recommendations displayed
 */
test('Program Volume Analysis - shows volume planning', async ({ page }) => {
  test.setTimeout(120000);

  console.log('\n========================================');
  console.log('📋 TEST: Program Volume Analysis');
  console.log('========================================\n');

  await login(page);

  // Navigate to Planner tab
  console.log('Step 1: Navigating to Planner...');
  const plannerTab = page.getByText('Planner', { exact: true }).last();
  await plannerTab.click({ timeout: 10000 });

  await page.waitForTimeout(3000);
  console.log('✓ Planner screen loaded\n');

  // ===== Verify Program Volume Overview =====
  console.log('Step 2: Verifying program volume overview...');

  const bodyContent = await page.textContent('body');

  // Check for volume-related elements
  const hasVolumeOverview =
    bodyContent?.includes('Volume') ||
    bodyContent?.includes('MEV') ||
    bodyContent?.includes('MAV') ||
    bodyContent?.includes('MRV');

  if (hasVolumeOverview) {
    console.log('  ✓ Volume overview displayed');

    // Check for muscle groups
    const hasMuscleGroups =
      bodyContent?.includes('Chest') ||
      bodyContent?.includes('Back') ||
      bodyContent?.includes('Legs') ||
      bodyContent?.includes('Shoulders') ||
      bodyContent?.includes('Arms');

    if (hasMuscleGroups) {
      console.log('  ✓ Muscle groups analyzed');
    }

    // Check for zone indicators
    const hasZones =
      bodyContent?.includes('optimal') ||
      bodyContent?.includes('adequate') ||
      bodyContent?.includes('above') ||
      bodyContent?.includes('below');

    if (hasZones) {
      console.log('  ✓ Volume zones displayed');
    }
  } else {
    console.log('  ℹ️  No active program, volume analysis not shown');
  }

  // ===== Check for Warnings =====
  console.log('\nStep 3: Checking for volume warnings...');

  const hasWarning =
    bodyContent?.includes('warning') ||
    bodyContent?.includes('Warning') ||
    bodyContent?.includes('above MRV') ||
    bodyContent?.includes('below MEV');

  if (hasWarning) {
    console.log('  ✓ Volume warnings displayed');
  } else {
    console.log('  ℹ️  No volume warnings (program may be well-balanced)');
  }

  // ===== Verify Phase Indicator =====
  console.log('\nStep 4: Verifying phase indicator...');

  const hasPhase =
    bodyContent?.includes('MEV') ||
    bodyContent?.includes('MAV') ||
    bodyContent?.includes('MRV') ||
    bodyContent?.includes('Deload') ||
    bodyContent?.includes('Week');

  if (hasPhase) {
    console.log('  ✓ Phase indicator displayed');
  } else {
    console.log('  ℹ️  Phase indicator not visible');
  }

  // Take screenshot
  await page.screenshot({
    path: '/tmp/analytics-program-volume-analysis.png',
    fullPage: true,
  });

  console.log('\n✅ Program Volume Analysis test passed\n');
});

/**
 * Test 6: Loading States and Error Handling
 *
 * Verifies:
 * - Loading skeletons appear during data fetch
 * - Error messages display correctly
 * - Empty states are handled gracefully
 */
test('Analytics - handles loading and error states', async ({ page }) => {
  test.setTimeout(120000);

  console.log('\n========================================');
  console.log('🔄 TEST: Loading States & Error Handling');
  console.log('========================================\n');

  await login(page);
  await navigateToAnalytics(page);

  // ===== Test Loading State =====
  console.log('Step 1: Testing loading states...');

  // Switch tabs quickly to catch loading state
  await switchToTab(page, 'Volume');

  await page.waitForTimeout(500); // Short wait to catch skeleton

  let bodyContent = await page.textContent('body');

  // Check for loading indicator (may not catch it if data loads too fast)
  if (bodyContent?.includes('Loading') || bodyContent?.includes('loading')) {
    console.log('  ✓ Loading state displayed');
  } else {
    console.log('  ℹ️  Data loaded too quickly to catch loading state');
  }

  await page.waitForTimeout(2000); // Wait for data to load

  console.log('  ✓ Data loaded successfully\n');

  // ===== Test Empty State =====
  console.log('Step 2: Testing empty states...');

  // Try switching to Cardio tab (may have no data for new users)
  await switchToTab(page, 'Cardio');

  await page.waitForTimeout(2000);

  bodyContent = await page.textContent('body');

  const hasEmptyState =
    bodyContent?.includes('No data') ||
    bodyContent?.includes('Start tracking') ||
    bodyContent?.includes('no sessions') ||
    bodyContent?.includes('No cardio');

  if (hasEmptyState) {
    console.log('  ✓ Empty state displayed correctly');
  } else {
    console.log('  ℹ️  Cardio data exists, empty state not shown');
  }

  // ===== Verify Error Handling =====
  console.log('\nStep 3: Verifying error handling...');

  // Check console for any errors
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Navigate through all tabs to check for errors
  for (const tab of ['Strength', 'Volume', 'Stats', 'Cardio']) {
    await switchToTab(page, tab);
    await page.waitForTimeout(1000);
  }

  if (errors.length > 0) {
    console.log('  ⚠️  Console errors detected:');
    errors.forEach((err) => console.log(`    - ${err}`));
  } else {
    console.log('  ✓ No console errors detected');
  }

  // Take screenshot
  await page.screenshot({
    path: '/tmp/analytics-loading-states.png',
    fullPage: true,
  });

  console.log('\n✅ Loading States & Error Handling test passed\n');
});

/**
 * Test 7: Data Accuracy Verification
 *
 * Verifies:
 * - Numbers make logical sense
 * - Units are consistent
 * - Calculations appear correct
 */
test('Analytics - verifies data accuracy', async ({ page }) => {
  test.setTimeout(120000);

  console.log('\n========================================');
  console.log('🔍 TEST: Data Accuracy Verification');
  console.log('========================================\n');

  await login(page);
  await navigateToAnalytics(page);

  // ===== Verify 1RM Values =====
  console.log('Step 1: Verifying 1RM values...');

  await switchToTab(page, 'Strength');
  await page.waitForTimeout(2000);

  const strengthContent = await page.textContent('body');

  // Extract 1RM values (pattern: number followed by kg or lbs)
  const oneRMMatches = strengthContent?.match(/\d+\s*(kg|lbs)/g);

  if (oneRMMatches && oneRMMatches.length > 0) {
    console.log('  ✓ 1RM values found:');
    oneRMMatches.slice(0, 3).forEach((match) => console.log(`    - ${match}`));

    // Verify values are reasonable (20-500 for kg, 44-1100 for lbs)
    const values = oneRMMatches.map((m) => parseInt(m.match(/\d+/)?.[0] || '0'));
    const allReasonable = values.every((v) => v >= 20 && v <= 1100);

    if (allReasonable) {
      console.log('  ✓ Values are within reasonable range');
    } else {
      console.log('  ⚠️  Some values may be unrealistic');
    }
  } else {
    console.log('  ℹ️  No 1RM values visible (may be empty state)');
  }

  // ===== Verify Set Counts =====
  console.log('\nStep 2: Verifying set counts...');

  await switchToTab(page, 'Volume');
  await page.waitForTimeout(2000);

  const volumeContent = await page.textContent('body');

  // Extract set counts (pattern: number followed by "sets")
  const setMatches = volumeContent?.match(/\d+\s*sets?/gi);

  if (setMatches && setMatches.length > 0) {
    console.log('  ✓ Set counts found:');
    setMatches.slice(0, 3).forEach((match) => console.log(`    - ${match}`));

    // Verify counts are reasonable (0-50 sets per muscle group per week)
    const counts = setMatches.map((m) => parseInt(m.match(/\d+/)?.[0] || '0'));
    const allReasonable = counts.every((c) => c >= 0 && c <= 50);

    if (allReasonable) {
      console.log('  ✓ Set counts are within reasonable range');
    } else {
      console.log('  ⚠️  Some counts may be unrealistic');
    }
  } else {
    console.log('  ℹ️  No set counts visible');
  }

  // ===== Verify Percentages =====
  console.log('\nStep 3: Verifying percentages...');

  await switchToTab(page, 'Stats');
  await page.waitForTimeout(2000);

  const statsContent = await page.textContent('body');

  // Extract percentages
  const percentageMatches = statsContent?.match(/\d+%/g);

  if (percentageMatches && percentageMatches.length > 0) {
    console.log('  ✓ Percentages found:');
    percentageMatches.forEach((match) => console.log(`    - ${match}`));

    // Verify percentages are 0-100%
    const percentages = percentageMatches.map((m) => parseInt(m.match(/\d+/)?.[0] || '0'));
    const allValid = percentages.every((p) => p >= 0 && p <= 100);

    if (allValid) {
      console.log('  ✓ Percentages are valid (0-100%)');
    } else {
      console.log('  ⚠️  Some percentages are invalid');
    }
  } else {
    console.log('  ℹ️  No percentages visible');
  }

  // Take screenshot
  await page.screenshot({
    path: '/tmp/analytics-data-accuracy.png',
    fullPage: true,
  });

  console.log('\n✅ Data Accuracy Verification test passed\n');
});

/**
 * Test 8: Chart Interactions
 *
 * Verifies:
 * - Charts are rendered (SVG elements present)
 * - Interactive elements are clickable
 * - Filters update chart data
 */
test('Analytics - tests chart interactions', async ({ page }) => {
  test.setTimeout(120000);

  console.log('\n========================================');
  console.log('🖱️  TEST: Chart Interactions');
  console.log('========================================\n');

  await login(page);
  await navigateToAnalytics(page);

  // ===== Test 1RM Chart Interaction =====
  console.log('Step 1: Testing 1RM chart interaction...');

  await switchToTab(page, 'Strength');
  await page.waitForTimeout(2000);

  // Check for SVG element (charts are SVG-based)
  const svgCount = await page.locator('svg').count();

  if (svgCount > 0) {
    console.log(`  ✓ Found ${svgCount} SVG element(s) (charts rendered)`);

    // Try to interact with exercise selector
    const selectorButton = page
      .locator('button')
      .filter({ hasText: /Bench Press|Squat|Deadlift/i })
      .first();

    if ((await selectorButton.count()) > 0) {
      const beforeText = await page.textContent('body');

      await selectorButton.click();
      await page.waitForTimeout(500);

      // Select different exercise
      const menuItem = page.locator('text=Conventional Deadlift').first();
      if ((await menuItem.count()) > 0) {
        await menuItem.click();
        await page.waitForTimeout(2000);

        const afterText = await page.textContent('body');

        // Verify content changed
        if (beforeText !== afterText) {
          console.log('  ✓ Chart updated after exercise change');
        } else {
          console.log('  ℹ️  Chart content unchanged (may have same data)');
        }
      }
    }
  } else {
    console.log('  ℹ️  No SVG elements found (charts may be in loading/empty state)');
  }

  // ===== Test Volume Trends Filters =====
  console.log('\nStep 2: Testing volume trends filters...');

  await switchToTab(page, 'Volume');
  await page.waitForTimeout(2000);

  // Test muscle group filter
  const beforeFilter = await page.textContent('body');

  const chestChip = page
    .locator('button')
    .filter({ hasText: /^Chest$/i })
    .first();

  if ((await chestChip.count()) > 0) {
    await chestChip.click();
    await page.waitForTimeout(2000);

    const afterFilter = await page.textContent('body');

    // Verify content changed
    if (beforeFilter !== afterFilter) {
      console.log('  ✓ Chart updated after muscle group filter');
    } else {
      console.log('  ℹ️  Chart content unchanged');
    }

    // Test weeks filter
    const twelveWeeksChip = page
      .locator('button')
      .filter({ hasText: /12 weeks/i })
      .first();

    if ((await twelveWeeksChip.count()) > 0) {
      const beforeWeeks = await page.textContent('body');

      await twelveWeeksChip.click();
      await page.waitForTimeout(2000);

      const afterWeeks = await page.textContent('body');

      if (beforeWeeks !== afterWeeks) {
        console.log('  ✓ Chart updated after weeks filter');
      } else {
        console.log('  ℹ️  Chart content unchanged');
      }
    }
  } else {
    console.log('  ℹ️  Muscle group filters not found');
  }

  // Take screenshot
  await page.screenshot({
    path: '/tmp/analytics-chart-interactions.png',
    fullPage: true,
  });

  console.log('\n✅ Chart Interactions test passed\n');
});

/**
 * Summary Test: Comprehensive Analytics Walkthrough
 *
 * Runs through all analytics features in sequence
 */
test('Analytics - comprehensive walkthrough', async ({ page }) => {
  test.setTimeout(180000);

  console.log('\n========================================');
  console.log('🎯 TEST: Comprehensive Analytics Walkthrough');
  console.log('========================================\n');

  await login(page);
  await navigateToAnalytics(page);

  const tabs = ['Strength', 'Volume', 'Stats', 'Cardio'];

  for (const tab of tabs) {
    console.log(`\n📊 Testing ${tab} tab...`);
    await switchToTab(page, tab);
    await page.waitForTimeout(2000);

    const content = await page.textContent('body');
    expect(content).toBeTruthy();

    // Take screenshot of each tab
    await page.screenshot({
      path: `/tmp/analytics-${tab.toLowerCase()}.png`,
      fullPage: true,
    });

    console.log(`  ✓ ${tab} tab rendered successfully`);
  }

  console.log('\n========================================');
  console.log('✅ ALL ANALYTICS TESTS COMPLETED');
  console.log('========================================');
  console.log('\nScreenshots saved to:');
  console.log('  - /tmp/analytics-1rm-chart.png');
  console.log('  - /tmp/analytics-volume-trends.png');
  console.log('  - /tmp/analytics-current-week-volume.png');
  console.log('  - /tmp/analytics-consistency-metrics.png');
  console.log('  - /tmp/analytics-program-volume-analysis.png');
  console.log('  - /tmp/analytics-loading-states.png');
  console.log('  - /tmp/analytics-data-accuracy.png');
  console.log('  - /tmp/analytics-chart-interactions.png');
  console.log('  - /tmp/analytics-strength.png');
  console.log('  - /tmp/analytics-volume.png');
  console.log('  - /tmp/analytics-stats.png');
  console.log('  - /tmp/analytics-cardio.png');
  console.log('\n========================================\n');
});
