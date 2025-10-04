import { test, expect } from '@playwright/test';

test('complete logout flow works correctly', async ({ page }) => {
  // Listen to logs
  page.on('console', (msg) => {
    const text = msg.text();
    if (
      text.includes('[AppNavigator]') ||
      text.includes('[SettingsScreen]') ||
      text.includes('[authApi]')
    ) {
      console.log('[BROWSER]', text);
    }
  });

  console.log('\n=== TEST: COMPLETE LOGOUT FLOW ===\n');

  // Step 1: Login
  console.log('[TEST] Step 1: Logging in...');
  await page.goto('http://localhost:8081');
  await page.waitForTimeout(2000);

  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');

  const loginButton = page.locator('button:has-text("Login")').first();
  await loginButton.click();

  console.log('[TEST] Waiting for login to complete (8 seconds)...');
  await page.waitForTimeout(8000);

  // Step 2: Verify we're logged in (check for Settings tab)
  console.log('[TEST] Step 2: Verifying login successful...');
  const settingsTab = page.locator('text=/settings/i');
  const settingsVisible = await settingsTab.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('[TEST] Settings tab visible:', settingsVisible);

  if (!settingsVisible) {
    console.log('[TEST] ❌ Login failed - Settings tab not visible');
    console.log('[TEST] Current URL:', page.url());

    const allButtons = await page.locator('button').count();
    console.log('[TEST] Buttons on page:', allButtons);
    for (let i = 0; i < Math.min(allButtons, 10); i++) {
      const text = await page.locator('button').nth(i).textContent();
      console.log(`[TEST]   Button ${i}: ${text}`);
    }

    throw new Error('Login failed - cannot proceed with logout test');
  }

  console.log('[TEST] ✅ Login successful - proceeding to Settings');

  // Step 3: Navigate to Settings
  console.log('[TEST] Step 3: Clicking Settings tab...');
  await settingsTab.click();
  await page.waitForTimeout(2000);

  // Step 4: Find and click logout button
  console.log('[TEST] Step 4: Looking for Logout button...');
  const logoutButton = page.locator('button:has-text("Logout")');
  const logoutCount = await logoutButton.count();
  console.log('[TEST] Found', logoutCount, 'logout buttons');

  if (logoutCount === 0) {
    console.log('[TEST] ❌ ERROR: Logout button not found!');

    // Debug: show page structure
    const pageText = await page.locator('body').textContent();
    console.log('[TEST] Page contains "Logout":', pageText?.includes('Logout'));

    const allButtons = await page.locator('button').count();
    console.log('[TEST] Total buttons:', allButtons);
    for (let i = 0; i < Math.min(allButtons, 15); i++) {
      const text = await page.locator('button').nth(i).textContent();
      console.log(`[TEST]   Button ${i}: ${text}`);
    }

    throw new Error('Logout button not found on Settings screen');
  }

  console.log('[TEST] ✅ Found Logout button, clicking...');
  await logoutButton.first().click();

  // Step 5: Handle confirmation dialog (if exists)
  console.log('[TEST] Step 5: Checking for confirmation dialog...');
  await page.waitForTimeout(1000);

  // Check if there's a confirmation button
  const confirmButtons = page.locator('button:has-text("Logout")');
  const confirmCount = await confirmButtons.count();
  console.log('[TEST] Found', confirmCount, 'buttons with "Logout" text after clicking');

  if (confirmCount > 1) {
    console.log('[TEST] Confirmation dialog detected, clicking confirm...');
    await confirmButtons.last().click();
  } else {
    console.log('[TEST] No confirmation dialog detected');
  }

  // Step 6: Wait for navigation to Auth screen
  console.log('[TEST] Step 6: Waiting for navigation to Auth screen...');
  await page.waitForTimeout(3000);

  // Step 7: Verify we're on Auth screen
  console.log('[TEST] Step 7: Verifying logout successful...');
  const currentUrl = page.url();
  console.log('[TEST] Current URL:', currentUrl);

  const emailInput = page.locator('input[type="email"]');
  const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('[TEST] Email input visible:', emailVisible);

  const passwordInput = page.locator('input[type="password"]');
  const passwordVisible = await passwordInput.isVisible().catch(() => false);
  console.log('[TEST] Password input visible:', passwordVisible);

  const loginTextCount = await page.locator('text=/login/i').count();
  console.log('[TEST] "Login" text count:', loginTextCount);

  if (emailVisible && passwordVisible && loginTextCount > 0) {
    console.log('[TEST] ✅ LOGOUT SUCCESSFUL - User redirected to Auth screen');
    console.log('[TEST] ✅ Email and password inputs are visible');
    console.log('[TEST] ✅ Login text is present');
  } else {
    console.log('[TEST] ❌ LOGOUT MAY HAVE FAILED - Not clearly on Auth screen');
    console.log('[TEST] Debug info:');
    console.log('[TEST]   - Email visible:', emailVisible);
    console.log('[TEST]   - Password visible:', passwordVisible);
    console.log('[TEST]   - Login text count:', loginTextCount);

    const allText = await page.locator('body').textContent();
    console.log('[TEST]   - Page contains "Settings":', allText?.includes('Settings'));
    console.log('[TEST]   - Page contains "Dashboard":', allText?.includes('Dashboard'));
  }

  // Final assertions
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  console.log('\n[TEST] ✅ ALL LOGOUT CHECKS PASSED\n');
});
