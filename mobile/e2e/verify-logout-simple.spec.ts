import { test, expect } from '@playwright/test';

test.setTimeout(30000); // 30 seconds timeout

test('verify logout redirects to auth screen', async ({ page }) => {
  console.log('\n=== SIMPLE LOGOUT VERIFICATION ===\n');

  // Navigate and wait for app to load
  console.log('[1/5] Loading app...');
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');

  // Fill login form
  console.log('[2/5] Filling login form...');
  await page.fill('input[type="email"]', 'demo@fitflow.test');
  await page.fill('input[type="password"]', 'Password123');

  // Submit login
  console.log('[3/5] Submitting login...');
  await page.click('button:has-text("Login")');

  // Wait for app to load after login
  await page.waitForTimeout(5000);

  // Check if we're logged in by looking for Settings tab
  const settingsTab = page.locator('text=Settings');
  if (await settingsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('[4/5] ✅ Login successful - Settings tab visible');

    // Click Settings
    await settingsTab.click();
    await page.waitForTimeout(1000);

    // Find and click Logout
    const logoutBtn = page.locator('button:has-text("Logout")').first();
    if (await logoutBtn.isVisible()) {
      console.log('[5/5] Clicking Logout button...');
      await logoutBtn.click();

      // Wait for confirmation dialog or redirect
      await page.waitForTimeout(2000);

      // Click confirm if dialog appears
      const confirmBtn = page.locator('button:has-text("Logout")').last();
      if (await confirmBtn.isVisible()) {
        console.log('Confirming logout...');
        await confirmBtn.click();
      }

      await page.waitForTimeout(2000);

      // Verify we're back on auth screen
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible({ timeout: 5000 });

      console.log('\n✅ LOGOUT TEST PASSED - User redirected to auth screen\n');
    } else {
      console.log('❌ Logout button not found on Settings screen');
      throw new Error('Logout button not visible');
    }
  } else {
    console.log('❌ Login failed - Settings tab not visible after login');
    throw new Error('Login did not succeed');
  }
});
