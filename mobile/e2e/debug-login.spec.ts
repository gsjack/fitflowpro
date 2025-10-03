import { test, expect } from '@playwright/test';

test('debug login flow - comprehensive investigation', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[BROWSER ${type.toUpperCase()}]:`, text);
  });

  // Listen to network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('3000')) {
      console.log('[REQUEST]:', request.method(), url);
      const postData = request.postData();
      if (postData) {
        console.log('[REQUEST BODY]:', postData);
      }
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('api') || url.includes('3000')) {
      console.log('[RESPONSE]:', response.status(), url);
      try {
        const body = await response.text();
        if (body.length < 500) {
          console.log('[RESPONSE BODY]:', body);
        }
      } catch (e) {
        // Ignore if can't read body
      }
    }
  });

  // Listen to page errors
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]:', error.message);
  });

  console.log('\n=== NAVIGATING TO APP ===\n');
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  console.log('\n=== PAGE LOADED ===\n');

  // Take screenshot of initial state
  await page.screenshot({ path: '/tmp/screenshots/debug-01-initial.png', fullPage: true });
  console.log('Screenshot saved: debug-01-initial.png');

  // Check if login form is visible
  const emailInput = page.locator('input[type="email"]').or(page.locator('input[placeholder*="mail" i]'));
  const passwordInput = page.locator('input[type="password"]');

  await expect(emailInput).toBeVisible({ timeout: 5000 });
  await expect(passwordInput).toBeVisible({ timeout: 5000 });
  console.log('\n=== LOGIN FORM FOUND ===\n');

  // Fill login form
  console.log('\n=== FILLING LOGIN FORM ===\n');
  await emailInput.fill('demo@fitflow.test');
  await passwordInput.fill('Password123');

  await page.screenshot({ path: '/tmp/screenshots/debug-02-form-filled.png', fullPage: true });
  console.log('Screenshot saved: debug-02-form-filled.png');

  // Find login button - try multiple strategies
  console.log('\n=== LOOKING FOR LOGIN BUTTON ===\n');
  const loginButtonSelectors = [
    'button:has-text("Login")',
    'button:text-is("Login")',
    'button >> text="Login"',
    '[role="button"]:has-text("Login")',
    'button',
  ];

  let loginButton = null;
  for (const selector of loginButtonSelectors) {
    const buttons = page.locator(selector);
    const count = await buttons.count();
    console.log(`Selector "${selector}" found ${count} elements`);

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await buttons.nth(i).textContent();
        console.log(`  Button ${i}: "${text}"`);
        if (text?.toLowerCase().includes('login')) {
          loginButton = buttons.nth(i);
          console.log(`  ✓ Found Login button at index ${i}`);
          break;
        }
      }
    }
    if (loginButton) break;
  }

  if (!loginButton) {
    console.error('\n❌ LOGIN BUTTON NOT FOUND\n');
    await page.screenshot({ path: '/tmp/screenshots/debug-03-button-not-found.png', fullPage: true });
    throw new Error('Login button not found');
  }

  // Check if button is enabled
  const isEnabled = await loginButton.isEnabled();
  console.log(`Login button enabled: ${isEnabled}`);

  // Click login button and watch what happens
  console.log('\n=== CLICKING LOGIN BUTTON ===\n');
  await loginButton.click();

  // Wait and observe network activity
  console.log('\n=== WAITING FOR RESPONSE (5 seconds) ===\n');
  await page.waitForTimeout(5000);

  // Take screenshot after click
  await page.screenshot({ path: '/tmp/screenshots/debug-04-after-click.png', fullPage: true });
  console.log('Screenshot saved: debug-04-after-click.png');

  // Check page state
  const currentUrl = page.url();
  console.log('\n=== CURRENT STATE ===');
  console.log('URL:', currentUrl);

  // Try to find any error messages
  const errorSelectors = [
    'text=/error/i',
    'text=/invalid/i',
    'text=/failed/i',
    '[role="alert"]',
    '.error',
  ];

  for (const selector of errorSelectors) {
    const errors = await page.locator(selector).allTextContents();
    if (errors.length > 0) {
      console.log(`Errors (${selector}):`, errors);
    }
  }

  // Check if we see dashboard
  const hasDashboard = await page.locator('text=/dashboard/i').count() > 0;
  const hasWorkout = await page.locator('text=/workout/i').count() > 0;
  console.log('Has Dashboard text:', hasDashboard);
  console.log('Has Workout text:', hasWorkout);

  // Check AsyncStorage (if accessible)
  const token = await page.evaluate(() => {
    return localStorage.getItem('@fitflow/auth_token');
  });
  console.log('Token in localStorage:', token ? 'EXISTS' : 'NONE');

  console.log('\n=== DEBUG TEST COMPLETE ===\n');
});
