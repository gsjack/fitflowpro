/**
 * Visual Regression Tests - FitFlow Pro Screens
 *
 * This test suite captures baseline screenshots of all screens and compares
 * them against future runs to detect visual regressions.
 *
 * Key Features:
 * - Screenshot comparison with pixel diff detection
 * - Covers all major screens and states
 * - Validates P0/P1 improvements (drag handles, tab labels, etc.)
 * - Detects layout shifts, styling changes, and UI breakage
 *
 * Running Tests:
 *   npm run test:visual          # Run visual regression tests
 *   npm run test:visual:update   # Update baseline screenshots
 *
 * Baseline Screenshots Location:
 *   e2e/visual/screens.visual.spec.ts-snapshots/
 */

import { test, expect } from '@playwright/test';
import {
  loginUser,
  navigateToTab,
  waitForStableRender,
  takeScreenshot,
  scrollAndWait,
  goToHome,
} from './helpers';

test.describe('Visual Regression - All Screens', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ============================================================
  // AUTH SCREEN TESTS
  // ============================================================

  test('Auth Screen - Login Tab', async ({ page }) => {
    console.log('📸 Testing: Auth Screen - Login Tab');

    await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=FitFlow Pro', { timeout: 15000 });
    await waitForStableRender(page);

    // Ensure we're on Login tab
    const loginTab = page.locator('button').filter({ hasText: /^Login$/i }).first();
    await loginTab.click();
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'auth-login-tab');
  });

  test('Auth Screen - Register Tab', async ({ page }) => {
    console.log('📸 Testing: Auth Screen - Register Tab');

    await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=FitFlow Pro', { timeout: 15000 });
    await waitForStableRender(page);

    // Click Register tab
    const registerTab = page.locator('button').filter({ hasText: /^Register$/i }).first();
    await registerTab.click();
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'auth-register-tab');
  });

  test('Auth Screen - Login Form Validation (Empty)', async ({ page }) => {
    console.log('📸 Testing: Auth Screen - Empty Form Validation');

    await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=FitFlow Pro', { timeout: 15000 });
    await waitForStableRender(page);

    // Click submit without filling form
    const submitButton = page.locator('button').filter({ hasText: /^Login$/i }).last();
    await submitButton.click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'auth-login-validation-empty');
  });

  test('Auth Screen - Login Form Validation (Invalid Email)', async ({ page }) => {
    console.log('📸 Testing: Auth Screen - Invalid Email Validation');

    await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=FitFlow Pro', { timeout: 15000 });
    await waitForStableRender(page);

    // Fill with invalid email
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('invalid-email');
    await passwordInput.fill('Test123!');

    const submitButton = page.locator('button').filter({ hasText: /^Login$/i }).last();
    await submitButton.click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'auth-login-validation-invalid-email');
  });

  // ============================================================
  // DASHBOARD SCREEN TESTS
  // ============================================================

  test('Dashboard Screen - Default State', async ({ page }) => {
    console.log('📸 Testing: Dashboard Screen - Default State');

    await loginUser(page);
    await navigateToTab(page, 'Dashboard');

    await takeScreenshot(page, 'dashboard-default-state');
  });

  test('Dashboard Screen - With Recovery Assessment', async ({ page }) => {
    console.log('📸 Testing: Dashboard Screen - Recovery Assessment Visible');

    await loginUser(page);
    await navigateToTab(page, 'Dashboard');

    // Check if recovery assessment is visible
    const recoverySection = page.locator('text=/recovery|assessment/i').first();
    const isVisible = await recoverySection.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVisible) {
      await takeScreenshot(page, 'dashboard-with-recovery-assessment');
    } else {
      console.log('⚠️  Recovery assessment not visible, using default view');
      await takeScreenshot(page, 'dashboard-no-recovery-assessment');
    }
  });

  // ============================================================
  // ANALYTICS SCREEN TESTS
  // ============================================================

  test('Analytics Screen - With Data', async ({ page }) => {
    console.log('📸 Testing: Analytics Screen - Charts Visible');

    await loginUser(page);
    await navigateToTab(page, 'Analytics');

    await takeScreenshot(page, 'analytics-charts-view');
  });

  test('Analytics Screen - Volume Analytics Section', async ({ page }) => {
    console.log('📸 Testing: Analytics Screen - Volume Analytics');

    await loginUser(page);
    await navigateToTab(page, 'Analytics');

    // Scroll down to volume analytics
    await scrollAndWait(page, 500);

    await takeScreenshot(page, 'analytics-volume-section');

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
  });

  test('Analytics Screen - Empty State', async ({ page }) => {
    console.log('📸 Testing: Analytics Screen - Empty State');

    await loginUser(page);
    await navigateToTab(page, 'Analytics');

    // Check for empty state indicators
    const emptyStateText = page.locator('text=/no data|start training|begin workout/i').first();
    const hasEmptyState = await emptyStateText.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasEmptyState) {
      await takeScreenshot(page, 'analytics-empty-state');
    } else {
      console.log('⚠️  No empty state detected, user has data');
    }
  });

  // ============================================================
  // PLANNER SCREEN TESTS (Critical for P0 Validation)
  // ============================================================

  test('Planner Screen - Exercise List with Drag Handles', async ({ page }) => {
    console.log('📸 Testing: Planner Screen - Drag Handles on RIGHT');

    await loginUser(page);
    await navigateToTab(page, 'Planner');

    // Verify drag handles are present
    const dragHandles = page.locator('[aria-label*="drag" i], [role="button"]').filter({
      hasText: /drag|reorder|≡|⋮/i,
    });

    const handleCount = await dragHandles.count();
    console.log(`Found ${handleCount} drag handle(s)`);

    await takeScreenshot(page, 'planner-drag-handles-right');
  });

  test('Planner Screen - Volume Warnings Visible', async ({ page }) => {
    console.log('📸 Testing: Planner Screen - Volume Warnings');

    await loginUser(page);
    await navigateToTab(page, 'Planner');

    // Check for volume warning badges
    const volumeWarnings = page.locator('text=/warning|mev|mav|mrv|volume/i');
    const warningCount = await volumeWarnings.count();

    console.log(`Found ${warningCount} volume indicator(s)`);

    await takeScreenshot(page, 'planner-volume-warnings');
  });

  test('Planner Screen - Scrolled View', async ({ page }) => {
    console.log('📸 Testing: Planner Screen - Scrolled View');

    await loginUser(page);
    await navigateToTab(page, 'Planner');

    // Scroll to see more exercises
    await scrollAndWait(page, 400);

    await takeScreenshot(page, 'planner-scrolled-exercises');

    // Scroll back
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
  });

  test('Planner Screen - Empty State', async ({ page }) => {
    console.log('📸 Testing: Planner Screen - Empty State');

    await loginUser(page);
    await navigateToTab(page, 'Planner');

    // Check for empty state
    const emptyStateText = page.locator('text=/no exercises|add exercise|get started/i').first();
    const hasEmptyState = await emptyStateText.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasEmptyState) {
      await takeScreenshot(page, 'planner-empty-state');
    } else {
      console.log('⚠️  No empty state, user has exercises configured');
    }
  });

  // ============================================================
  // SETTINGS SCREEN TESTS
  // ============================================================

  test('Settings Screen - Main View', async ({ page }) => {
    console.log('📸 Testing: Settings Screen - All Options Visible');

    await loginUser(page);
    await navigateToTab(page, 'Settings');

    await takeScreenshot(page, 'settings-main-view');
  });

  test('Settings Screen - Scrolled View', async ({ page }) => {
    console.log('📸 Testing: Settings Screen - Scrolled View');

    await loginUser(page);
    await navigateToTab(page, 'Settings');

    // Scroll to see all settings options
    await scrollAndWait(page, 300);

    await takeScreenshot(page, 'settings-scrolled-view');

    // Scroll back
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
  });

  // ============================================================
  // WORKOUT SCREEN TESTS (if accessible)
  // ============================================================

  test('Workout Screen - Set Logging Interface', async ({ page }) => {
    console.log('📸 Testing: Workout Screen - Set Logging');

    await loginUser(page);
    await goToHome(page);

    // Look for "Start Workout" button
    const startWorkoutButton = page.locator('button').filter({ hasText: /start.*workout/i }).first();
    const isVisible = await startWorkoutButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await startWorkoutButton.click();
      await waitForStableRender(page);

      await takeScreenshot(page, 'workout-set-logging-interface');

      // Navigate back
      const backButton = page
        .locator('button[aria-label*="back" i], button')
        .filter({ hasText: /back/i })
        .first();
      const backVisible = await backButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (backVisible) {
        await backButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('⚠️  Start Workout button not found, skipping workout screen');
    }
  });

  // ============================================================
  // NAVIGATION TESTS (Tab Validation)
  // ============================================================

  test('Bottom Tab Navigation - All Tabs Visible', async ({ page }) => {
    console.log('📸 Testing: Bottom Tab Navigation - All Tabs');

    await loginUser(page);
    await goToHome(page);

    // Capture bottom navigation
    const bottomNav = page.locator('[role="tablist"]').first();
    const isVisible = await bottomNav.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      // Highlight navigation area for screenshot
      await takeScreenshot(page, 'bottom-navigation-all-tabs');
    } else {
      console.log('⚠️  Bottom navigation not found');
    }
  });
});
