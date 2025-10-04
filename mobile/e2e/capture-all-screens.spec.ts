import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/post-implementation');
const BASE_URL = 'http://localhost:8081';
const TEST_USER = {
  email: 'visual-test@example.com',
  password: 'Test123!',
};

interface ScreenshotReport {
  screenshots: Array<{
    name: string;
    path: string;
    timestamp: string;
  }>;
  errors: Array<{
    screen: string;
    error: string;
  }>;
  skipped: Array<{
    screen: string;
    reason: string;
  }>;
  totalCount: number;
}

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  console.log('📸 Starting comprehensive screenshot capture...');
  console.log(`Screenshots will be saved to: ${SCREENSHOT_DIR}`);
});

test('Capture all FitFlow Pro screens systematically', async ({ page }) => {
  const report: ScreenshotReport = {
    screenshots: [],
    errors: [],
    skipped: [],
    totalCount: 0,
  };

  async function captureScreenshot(
    name: string,
    description: string
  ): Promise<void> {
    try {
      const filename = `${String(report.totalCount + 1).padStart(2, '0')}-${name}.png`;
      const filepath = path.join(SCREENSHOT_DIR, filename);

      // Wait for network to be idle and animations to complete
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log(`⚠️  Network not idle for ${name}, continuing anyway...`);
      });
      await page.waitForTimeout(1500); // Wait for animations

      await page.screenshot({ path: filepath, fullPage: true });

      report.screenshots.push({
        name: description,
        path: filepath,
        timestamp: new Date().toISOString(),
      });
      report.totalCount++;

      console.log(`✅ Captured: ${description} → ${filename}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      report.errors.push({
        screen: description,
        error: errorMsg,
      });
      console.log(`❌ Failed to capture ${description}: ${errorMsg}`);
    }
  }

  // Set viewport to desktop size for better clarity
  await page.setViewportSize({ width: 1280, height: 720 });

  console.log('\n🚀 Starting screen capture journey...\n');

  // ============================================================
  // 1. AUTH SCREEN - Login Tab
  // ============================================================
  console.log('📍 Step 1: AuthScreen - Login Tab');
  await page.goto(BASE_URL, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Wait for app to actually render (wait for FitFlow Pro text)
  await page.waitForSelector('text=FitFlow Pro', { timeout: 15000 });
  await page.waitForTimeout(2000); // Wait for initial load

  await captureScreenshot('auth-login', 'AuthScreen - Login Tab');

  // ============================================================
  // 2. AUTH SCREEN - Register Tab
  // ============================================================
  console.log('📍 Step 2: AuthScreen - Register Tab');
  try {
    // Look for Register tab button
    const registerTab = page.locator('button, [role="tab"]').filter({ hasText: /register/i }).first();
    const isVisible = await registerTab.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await registerTab.click();
      await page.waitForTimeout(1000);

      await captureScreenshot('auth-register', 'AuthScreen - Register Tab');

      // Go back to Login tab
      const loginTab = page.locator('button, [role="tab"]').filter({ hasText: /^login$/i }).first();
      await loginTab.click();
      await page.waitForTimeout(500);
    } else {
      report.skipped.push({
        screen: 'AuthScreen - Register Tab',
        reason: 'Register tab button not found',
      });
    }
  } catch (error) {
    console.log('⚠️  Could not find Register tab, skipping...');
    report.skipped.push({
      screen: 'AuthScreen - Register Tab',
      reason: 'Register tab button not found or not clickable',
    });
  }

  // ============================================================
  // 3. LOGIN
  // ============================================================
  console.log('📍 Step 3: Login');
  try {
    // Make sure we're on login tab
    const loginTab = page.locator('button').filter({ hasText: /^Login$/i }).first();
    await loginTab.click();
    await page.waitForTimeout(500);

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);

    // Click the submit Login button (the larger one at bottom, not the tab)
    const submitButton = page.locator('button').filter({ hasText: /^Login$/i }).last();
    await submitButton.click();

    // Wait for navigation
    await page.waitForTimeout(5000);

    // Check if login succeeded (look for Dashboard text or nav tabs)
    const bodyText = await page.textContent('body');
    const isLoggedIn = bodyText?.includes('Dashboard') || bodyText?.includes('Analytics') || bodyText?.includes('Home');

    if (!isLoggedIn) {
      console.log('⚠️  Login failed, attempting registration...');

      // Go back to auth screen
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector('text=FitFlow Pro', { timeout: 15000 });
      await page.waitForTimeout(1000);

      // Click Register tab
      const registerTab = page.locator('button').filter({ hasText: /^Register$/i }).first();
      await registerTab.click();
      await page.waitForTimeout(500);

      // Fill registration form
      const regEmailInput = page.locator('input[type="email"]').first();
      const regPasswordInput = page.locator('input[type="password"]').first();

      await regEmailInput.fill(TEST_USER.email);
      await regPasswordInput.fill(TEST_USER.password);

      // Click Create Account button
      const createButton = page.locator('button').filter({ hasText: /^Create Account$/i }).first();
      await createButton.click();

      await page.waitForTimeout(5000);
    }

    console.log('✅ Logged in successfully');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Login/Registration failed: ${errorMsg}`);
    report.errors.push({
      screen: 'Login Process',
      error: errorMsg,
    });
  }

  // ============================================================
  // 4. DASHBOARD SCREEN
  // ============================================================
  console.log('📍 Step 4: DashboardScreen');
  try {
    const dashboardTab = page.locator('[role="tab"]').filter({ hasText: /dashboard|home/i }).first();
    const isVisible = await dashboardTab.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await dashboardTab.click();
      await page.waitForTimeout(2000);

      await captureScreenshot('dashboard', 'DashboardScreen - Main View');
    } else {
      report.skipped.push({
        screen: 'DashboardScreen',
        reason: 'Dashboard tab not found',
      });
    }
  } catch (error) {
    report.skipped.push({
      screen: 'DashboardScreen',
      reason: 'Could not navigate to Dashboard',
    });
  }

  // ============================================================
  // 5. ANALYTICS SCREEN
  // ============================================================
  console.log('📍 Step 5: AnalyticsScreen');
  try {
    const analyticsTab = page.locator('[role="tab"]').filter({ hasText: /analytics/i }).first();
    const isVisible = await analyticsTab.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await analyticsTab.click();
      await page.waitForTimeout(2000);

      await captureScreenshot('analytics', 'AnalyticsScreen - Charts View');

      // Scroll down to capture volume analytics
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1000);

      await captureScreenshot('analytics-scrolled', 'AnalyticsScreen - Volume Analytics');

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    } else {
      report.skipped.push({
        screen: 'AnalyticsScreen',
        reason: 'Analytics tab not found',
      });
    }
  } catch (error) {
    report.skipped.push({
      screen: 'AnalyticsScreen',
      reason: 'Could not navigate to Analytics',
    });
  }

  // ============================================================
  // 6. PLANNER SCREEN
  // ============================================================
  console.log('📍 Step 6: PlannerScreen');
  try {
    const plannerTab = page.locator('[role="tab"]').filter({ hasText: /planner/i }).first();
    const isVisible = await plannerTab.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await plannerTab.click();
      await page.waitForTimeout(2000);

      await captureScreenshot('planner', 'PlannerScreen - Program Exercises');

      // Scroll to see drag handles
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(1000);

      await captureScreenshot('planner-scrolled', 'PlannerScreen - Drag Handles Visible');

      // Scroll back
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    } else {
      report.skipped.push({
        screen: 'PlannerScreen',
        reason: 'Planner tab not found',
      });
    }
  } catch (error) {
    report.skipped.push({
      screen: 'PlannerScreen',
      reason: 'Could not navigate to Planner',
    });
  }

  // ============================================================
  // 7. SETTINGS SCREEN
  // ============================================================
  console.log('📍 Step 7: SettingsScreen');
  try {
    const settingsTab = page.locator('[role="tab"]').filter({ hasText: /settings/i }).first();
    const isVisible = await settingsTab.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await settingsTab.click();
      await page.waitForTimeout(2000);

      await captureScreenshot('settings', 'SettingsScreen - Main View');
    } else {
      report.skipped.push({
        screen: 'SettingsScreen',
        reason: 'Settings tab not found',
      });
    }
  } catch (error) {
    report.skipped.push({
      screen: 'SettingsScreen',
      reason: 'Could not navigate to Settings',
    });
  }

  // ============================================================
  // 8. WORKOUT SCREEN (if accessible)
  // ============================================================
  console.log('📍 Step 8: WorkoutScreen (if accessible)');
  try {
    // Go back to Dashboard
    const dashboardTab = page.locator('[role="tab"]').filter({ hasText: /dashboard|home/i }).first();
    await dashboardTab.click({ timeout: 5000 });
    await page.waitForTimeout(1500);

    // Look for "Start Workout" button
    const startWorkoutButton = page.locator('button').filter({ hasText: /start.*workout/i }).first();
    const isVisible = await startWorkoutButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await startWorkoutButton.click();
      await page.waitForTimeout(2000);

      await captureScreenshot('workout', 'WorkoutScreen - Set Logging Interface');

      // Try to navigate back
      const backButton = page.locator('button[aria-label*="back" i], button').filter({ hasText: /back/i }).first();
      const backVisible = await backButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (backVisible) {
        await backButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      report.skipped.push({
        screen: 'WorkoutScreen',
        reason: 'Start Workout button not found on Dashboard',
      });
    }
  } catch (error) {
    report.skipped.push({
      screen: 'WorkoutScreen',
      reason: 'Could not navigate to Workout screen',
    });
  }

  console.log('\n✨ Screenshot capture journey complete!\n');

  // ============================================================
  // GENERATE REPORT
  // ============================================================
  const reportPath = path.join(SCREENSHOT_DIR, 'capture-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('📊 SCREENSHOT CAPTURE REPORT');
  console.log('='.repeat(80));
  console.log(`✅ Total Screenshots: ${report.totalCount}`);
  console.log(`❌ Errors: ${report.errors.length}`);
  console.log(`⏭️  Skipped: ${report.skipped.length}`);
  console.log('\n📁 Screenshots:');
  report.screenshots.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}`);
    console.log(`     ${s.path}`);
  });
  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.screen}: ${e.error}`);
    });
  }
  if (report.skipped.length > 0) {
    console.log('\n⏭️  Skipped:');
    report.skipped.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.screen}: ${s.reason}`);
    });
  }
  console.log('\n' + '='.repeat(80));
  console.log(`📄 Full report: ${reportPath}`);
  console.log('='.repeat(80) + '\n');

  // Verify at least some screenshots were captured
  expect(report.totalCount).toBeGreaterThan(0);
});
