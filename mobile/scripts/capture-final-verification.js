#!/usr/bin/env node
/**
 * Final Verification Screenshot Capture
 *
 * Captures screenshots of all screens with P2/P3 improvements
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = '/tmp/screenshots/final';
const APP_URL = 'http://localhost:8081';

async function captureScreenshots() {
  console.log('🎬 Starting Final Verification Screenshot Capture...\n');

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    console.log('📱 Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for app to initialize

    // Check if login screen is visible
    const loginVisible = await page.isVisible('text=/login/i').catch(() => false);

    if (loginVisible) {
      console.log('🔐 Logging in...');
      await page.fill('input[type="email"]', 'demo@fitflow.test');
      await page.fill('input[type="password"]', 'Password123');
      await page.click('button:has-text("Login")');
      await page.waitForTimeout(2000);
    }

    // 1. Dashboard
    console.log('📸 Capturing Dashboard...');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-dashboard.png'),
      fullPage: false
    });

    // 2. Analytics (with card backgrounds)
    console.log('📸 Capturing Analytics screen...');
    const analyticsButton = await page.locator('text=/analytics/i').first();
    if (await analyticsButton.isVisible().catch(() => false)) {
      await analyticsButton.click();
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-analytics.png'),
        fullPage: true
      });
    }

    // 3. Planner (with empty state icon)
    console.log('📸 Capturing Planner screen...');
    const plannerButton = await page.locator('text=/planner/i').first();
    if (await plannerButton.isVisible().catch(() => false)) {
      await plannerButton.click();
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-planner.png'),
        fullPage: true
      });
    }

    // 4. Settings (with 56px button height)
    console.log('📸 Capturing Settings screen...');
    const settingsButton = await page.locator('text=/settings/i').first();
    if (await settingsButton.isVisible().catch(() => false)) {
      await settingsButton.click();
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-settings.png'),
        fullPage: true
      });
    }

    // 5. Workout (with 72pt numbers)
    console.log('📸 Capturing Workout screen...');
    const workoutButton = await page.locator('text=/workout/i').first();
    if (await workoutButton.isVisible().catch(() => false)) {
      await workoutButton.click();
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-workout.png'),
        fullPage: true
      });
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📂 Screenshots saved to: ${SCREENSHOT_DIR}\n`);

    // List captured files
    const files = fs.readdirSync(SCREENSHOT_DIR);
    console.log('📋 Captured files:');
    files.forEach(file => {
      const filePath = path.join(SCREENSHOT_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`   ✓ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    });

  } catch (error) {
    console.error('\n❌ Error capturing screenshots:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the capture
captureScreenshots()
  .then(() => {
    console.log('\n🎉 Screenshot capture complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Screenshot capture failed:', error);
    process.exit(1);
  });
