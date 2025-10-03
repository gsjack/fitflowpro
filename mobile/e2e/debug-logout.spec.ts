import { test } from '@playwright/test';

test('debug logout functionality', async ({ page }) => {
  // Listen to console
  page.on('console', msg => console.log('[BROWSER]', msg.text()));

  // Listen to network
  page.on('request', req => {
    console.log('[REQUEST]', req.method(), req.url());
  });
  page.on('response', res => {
    console.log('[RESPONSE]', res.status(), res.url());
  });

  // Login
  console.log('[TEST] Navigating to app...');
  await page.goto('http://localhost:8081');
  await page.waitForTimeout(2000);

  console.log('[TEST] Filling login form...');
  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');

  console.log('[TEST] Clicking login button...');
  await page.locator('button').filter({ hasText: /login/i }).first().click();
  await page.waitForTimeout(3000);

  // Navigate to Settings
  console.log('[TEST] Looking for settings navigation...');
  const settingsNav = page.locator('button,div,a').filter({ hasText: /settings/i });
  const settingsCount = await settingsNav.count();
  console.log('[TEST] Found', settingsCount, 'settings elements');

  if (settingsCount > 0) {
    console.log('[TEST] Clicking settings...');
    await settingsNav.first().click();
    await page.waitForTimeout(2000);
  }

  // Find and click logout button
  console.log('[TEST] Looking for logout button...');
  const logoutButton = page.locator('button').filter({ hasText: /logout/i });
  const count = await logoutButton.count();
  console.log('[TEST] Found', count, 'logout buttons');

  if (count > 0) {
    console.log('[TEST] Clicking logout button...');
    await logoutButton.first().click();

    // Check for confirmation dialog
    await page.waitForTimeout(1000);

    // Look for confirmation button in Alert
    const confirmButton = page.locator('button').filter({ hasText: /logout|confirm/i });
    const confirmCount = await confirmButton.count();
    console.log('[TEST] Found', confirmCount, 'confirmation buttons');

    // Click confirmation if exists (Alert might have multiple logout buttons)
    if (confirmCount > 1) {
      console.log('[TEST] Confirming logout...');
      await confirmButton.last().click();
    }

    // Wait and observe
    await page.waitForTimeout(3000);

    // Check if redirected to login
    const currentUrl = page.url();
    console.log('[TEST] Current URL:', currentUrl);

    // Check if login screen visible
    const emailInput = page.locator('input[type="email"]');
    const emailVisible = await emailInput.isVisible().catch(() => false);
    console.log('[TEST] Email input visible:', emailVisible);

    // Try to find login text
    const loginText = await page.locator('text=/login/i').count();
    console.log('[TEST] Login text count:', loginText);

    if (emailVisible && loginText > 0) {
      console.log('[TEST] ✅ Logout successful - redirected to login screen');
    } else {
      console.log('[TEST] ❌ Logout may have failed - not on login screen');
    }
  } else {
    console.log('[TEST] ❌ ERROR: Logout button not found!');

    // Debug: show all buttons
    const allButtons = await page.locator('button').count();
    console.log('[TEST] Total buttons on page:', allButtons);

    for (let i = 0; i < Math.min(allButtons, 10); i++) {
      const buttonText = await page.locator('button').nth(i).textContent();
      console.log('[TEST] Button', i, ':', buttonText);
    }
  }

  await page.waitForTimeout(2000);
});
