import { test } from '@playwright/test';

test('debug delete user functionality', async ({ page }) => {
  // Listen to everything
  page.on('console', msg => console.log('[BROWSER]', msg.text()));
  page.on('request', req => console.log('[REQUEST]', req.method(), req.url()));
  page.on('response', res => console.log('[RESPONSE]', res.status(), res.url()));

  // Create a test user first (not demo user)
  console.log('[TEST] Creating test user...');
  const testEmail = `test-delete-${Date.now()}@fitflow.test`;
  console.log('[TEST] Test email:', testEmail);

  await page.goto('http://localhost:8081');
  await page.waitForTimeout(2000);

  // Register new user
  const registerTab = page.locator('button').filter({ hasText: /register|sign.*up/i });
  const registerCount = await registerTab.count();
  console.log('[TEST] Found', registerCount, 'register tabs');

  if (registerCount > 0) {
    console.log('[TEST] Clicking register tab...');
    await registerTab.first().click();
    await page.waitForTimeout(500);
  }

  console.log('[TEST] Filling registration form...');
  await page.locator('input[type="email"]').fill(testEmail);
  await page.locator('input[type="password"]').fill('Password123');

  // Try to find and fill age/weight fields
  const ageInput = page.locator('input[placeholder*="age" i]');
  if (await ageInput.count() > 0) {
    await ageInput.fill('30');
    console.log('[TEST] Filled age field');
  }

  const weightInput = page.locator('input[placeholder*="weight" i]');
  if (await weightInput.count() > 0) {
    await weightInput.fill('75');
    console.log('[TEST] Filled weight field');
  }

  const registerButton = page.locator('button').filter({ hasText: /create.*account|register|sign.*up/i });
  console.log('[TEST] Clicking register button...');
  await registerButton.first().click();
  await page.waitForTimeout(3000);

  // Navigate to Settings
  console.log('[TEST] Looking for settings...');
  const settingsNav = page.locator('button,div,a').filter({ hasText: /settings/i });
  const settingsCount = await settingsNav.count();
  console.log('[TEST] Found', settingsCount, 'settings elements');

  if (settingsCount > 0) {
    console.log('[TEST] Clicking settings...');
    await settingsNav.first().click();
    await page.waitForTimeout(2000);
  }

  // Find delete button
  console.log('[TEST] Looking for delete user button...');
  const deleteButton = page.locator('button').filter({ hasText: /delete.*account/i });
  const count = await deleteButton.count();
  console.log('[TEST] Found', count, 'delete buttons');

  if (count > 0) {
    console.log('[TEST] Clicking delete button...');
    await deleteButton.first().click();

    // Wait for modal
    await page.waitForTimeout(1000);

    // Look for confirmation input (type "DELETE")
    const confirmInput = page.locator('input[placeholder*="DELETE"]');
    const confirmInputCount = await confirmInput.count();
    console.log('[TEST] Found', confirmInputCount, 'DELETE confirmation inputs');

    if (confirmInputCount > 0) {
      console.log('[TEST] Typing DELETE confirmation...');
      await confirmInput.fill('DELETE');
      await page.waitForTimeout(500);
    }

    // Look for confirm button in dialog
    const confirmButton = page.locator('button').filter({ hasText: /delete.*forever|confirm|delete/i });
    const confirmCount = await confirmButton.count();
    console.log('[TEST] Found', confirmCount, 'confirmation buttons');

    if (confirmCount > 0) {
      console.log('[TEST] Confirming deletion (clicking last button)...');
      await confirmButton.last().click();
    }

    // Wait and observe
    await page.waitForTimeout(3000);

    // Should redirect to login
    const currentUrl = page.url();
    console.log('[TEST] Current URL:', currentUrl);

    const emailVisible = await page.locator('input[type="email"]').isVisible().catch(() => false);
    console.log('[TEST] Email input visible:', emailVisible);

    if (emailVisible) {
      console.log('[TEST] ✅ Redirected to login screen');

      // Try to login with deleted account (should fail)
      console.log('[TEST] Attempting to login with deleted account...');
      await page.locator('input[type="email"]').fill(testEmail);
      await page.locator('input[type="password"]').fill('Password123');
      await page.locator('button').filter({ hasText: /login/i }).first().click();
      await page.waitForTimeout(2000);

      // Should show error or stay on login screen
      const stillOnLogin = await page.locator('input[type="email"]').isVisible();
      console.log('[TEST] Still on login screen:', stillOnLogin);

      if (stillOnLogin) {
        console.log('[TEST] ✅ Delete user successful - account cannot login');
      } else {
        console.log('[TEST] ❌ Deleted account was able to login!');
      }
    } else {
      console.log('[TEST] ❌ Not redirected to login screen after deletion');
    }
  } else {
    console.log('[TEST] ❌ ERROR: Delete button not found!');

    // Debug: show all buttons
    const allButtons = await page.locator('button').count();
    console.log('[TEST] Total buttons on page:', allButtons);

    for (let i = 0; i < Math.min(allButtons, 10); i++) {
      const buttonText = await page.locator('button').nth(i).textContent();
      console.log('[TEST] Button', i, ':', buttonText);
    }
  }
});
