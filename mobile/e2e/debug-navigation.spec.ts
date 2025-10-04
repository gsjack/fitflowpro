import { test, expect } from '@playwright/test';

test('debug navigation after login', async ({ page }) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    console.log(`Browser Console [${msg.type()}]:`, text);
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    console.error('Browser Error:', error.message);
  });

  // Capture network requests
  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      console.log('Request:', request.method(), request.url());
    }
  });

  page.on('response', (response) => {
    if (response.url().includes('/api/')) {
      console.log('Response:', response.status(), response.url());
    }
  });

  // Navigate to app
  console.log('\n=== Navigating to app ===');
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check what's visible
  console.log('\n=== Login screen visible ===');
  const bodyText = await page.locator('body').textContent();
  console.log('Body text:', bodyText?.substring(0, 200));

  // Fill login form
  console.log('\n=== Filling login form ===');
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill('test@fitflow.test');
  await passwordInput.fill('Password123');

  console.log('Form filled, clicking login...');
  const loginButton = page
    .locator('button')
    .filter({ hasText: /^login$/i })
    .first();
  await loginButton.click();

  // Wait and check for navigation
  console.log('\n=== Waiting for response ===');
  await page.waitForTimeout(5000);

  // Check current page state
  const afterBodyText = await page.locator('body').textContent();
  console.log('\n=== After login - Body text ===');
  console.log(afterBodyText?.substring(0, 300));

  // Check for tab bar
  const tabs = await page.locator('button, [role="tab"]').allTextContents();
  console.log('\n=== Tabs found ===');
  console.log('Tabs:', tabs);

  // Check for any error messages
  const errorElements = await page.locator('[role="alert"]').allTextContents();
  console.log('\n=== Error messages ===');
  console.log('Errors:', errorElements);

  // Take debug screenshot
  await page.screenshot({ path: '/tmp/screenshots/debug-after-login.png', fullPage: true });
  console.log('\n=== Screenshot saved to /tmp/screenshots/debug-after-login.png ===');

  // Print all console messages
  console.log('\n=== All console messages ===');
  console.log(consoleMessages.join('\n'));
});
