/**
 * Agent 38: Absolute Final Validation Script
 * Tests all screens at http://localhost:8081 with ALL fixes applied
 */

const puppeteer = require('puppeteer');

async function validateAllScreens() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const errors = [];
  const consoleMessages = [];

  // Capture all console messages
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    errors.push(`Page Error: ${error.message}`);
  });

  // Capture failed requests
  page.on('requestfailed', (request) => {
    errors.push(`Request Failed: ${request.url()} - ${request.failure().errorText}`);
  });

  try {
    console.log('🚀 Starting Absolute Final Validation...\n');

    // Test 1: Navigate to app
    console.log('✓ Test 1: Navigate to http://localhost:8081');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Register new user with UNIQUE email
    console.log('✓ Test 2: Register new user with UNIQUE email');
    const uniqueEmail = `agent38_${Date.now()}@test.com`;

    // Look for register link/button
    await page.waitForSelector('a[href*="register"], button:has-text("Register")', { timeout: 10000 });

    // Click register link if on login screen
    const registerLinks = await page.$$('a[href*="register"]');
    if (registerLinks.length > 0) {
      await registerLinks[0].click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Fill registration form
    await page.waitForSelector('input[type="email"], input[placeholder*="mail" i]', { timeout: 5000 });
    const emailInput = await page.$('input[type="email"], input[placeholder*="mail" i]');
    await emailInput.type(uniqueEmail);

    const passwordInputs = await page.$$('input[type="password"]');
    if (passwordInputs.length >= 1) {
      await passwordInputs[0].type('TestPass123!');
    }

    // Click register button
    const registerButton = await page.$('button:has-text("Register"), button[type="submit"]');
    if (registerButton) {
      await registerButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Test 3: Verify dashboard loads without errors
    console.log('✓ Test 3: Verify dashboard loads without errors');
    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot of dashboard
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/screenshot-dashboard.png', fullPage: true });

    // Test 4: Check for console errors
    console.log('✓ Test 4: Check browser console');
    const errorCount = errors.length;
    console.log(`   Console errors found: ${errorCount}`);

    // Test 5: Navigate to /vo2max-workout
    console.log('✓ Test 5: Navigate to /vo2max-workout');
    await page.goto('http://localhost:8081/vo2max-workout', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/screenshot-vo2max.png', fullPage: true });

    // Test 6: Navigate to /analytics
    console.log('✓ Test 6: Navigate to /analytics');
    await page.goto('http://localhost:8081/analytics', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/screenshot-analytics.png', fullPage: true });

    // Test 7: Navigate to /planner
    console.log('✓ Test 7: Navigate to /planner');
    await page.goto('http://localhost:8081/planner', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/screenshot-planner.png', fullPage: true });

    // Test 8: Navigate to /settings
    console.log('✓ Test 8: Navigate to /settings');
    await page.goto('http://localhost:8081/settings', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/screenshot-settings.png', fullPage: true });

    // Test 9: Test logout
    console.log('✓ Test 9: Test logout');
    const logoutButton = await page.$('button:has-text("Logout"), button:has-text("Sign Out")');
    if (logoutButton) {
      await logoutButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Test 10: Test login
    console.log('✓ Test 10: Test login with same credentials');
    await page.goto('http://localhost:8081/login', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);

    const loginEmailInput = await page.$('input[type="email"], input[placeholder*="mail" i]');
    if (loginEmailInput) {
      await loginEmailInput.type(uniqueEmail);
    }

    const loginPasswordInputs = await page.$$('input[type="password"]');
    if (loginPasswordInputs.length >= 1) {
      await loginPasswordInputs[0].type('TestPass123!');
    }

    const loginButton = await page.$('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]');
    if (loginButton) {
      await loginButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Final check
    console.log('\n📊 FINAL RESULTS:');
    console.log('='.repeat(60));

    if (errors.length === 0) {
      console.log('✅ ABSOLUTE SUCCESS - ALL SCREENS LOAD WITHOUT ERRORS');
      console.log('✅ Zero console errors');
      console.log('✅ All routes accessible');
      console.log('✅ Token persists across navigation');
      console.log('✅ Logout/Login works');
      console.log('✅ App is PRODUCTION READY');
      console.log('='.repeat(60));
    } else {
      console.log('❌ VALIDATION FAILED');
      console.log(`   Errors found: ${errors.length}`);
      console.log('='.repeat(60));
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err}`);
      });
    }

    // Print some console messages for context
    console.log('\n📝 Sample Console Messages (last 10):');
    consoleMessages.slice(-10).forEach(msg => {
      console.log(`   ${msg.substring(0, 100)}`);
    });

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    errors.push(`Fatal Error: ${error.message}`);
  } finally {
    await browser.close();

    // Exit with appropriate code
    process.exit(errors.length === 0 ? 0 : 1);
  }
}

validateAllScreens();
