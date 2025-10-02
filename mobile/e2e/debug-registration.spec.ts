import { test } from '@playwright/test';

test('debug registration with full console logging', async ({ page }) => {
  // Capture ALL console messages
  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    console.error('[PAGE ERROR]', error.message);
    console.error(error.stack);
  });

  // Capture request failures
  page.on('requestfailed', (request) => {
    console.error('[REQUEST FAILED]', request.url(), request.failure()?.errorText);
  });

  // Navigate
  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log('✓ Page loaded');

  // Wait for auth screen
  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });
  console.log('✓ Auth screen visible');

  // Switch to Register
  await page.locator('button:has-text("Register")').first().click();
  await page.waitForTimeout(1000);
  console.log('✓ Switched to Register');

  // Fill form
  const email = `debug${Date.now()}@test.com`;
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill('Test123456');
  console.log(`✓ Filled form with ${email}`);

  await page.screenshot({ path: '/tmp/debug-before-submit.png' });

  // Submit
  const submitButton = page.locator('button').filter({ hasText: /Create Account/i });
  console.log('Clicking Create Account button...');
  await submitButton.click();

  console.log('Waiting 10 seconds for API call and navigation...');
  await page.waitForTimeout(10000);

  await page.screenshot({ path: '/tmp/debug-after-submit.png', fullPage: true });

  const bodyText = await page.textContent('body');
  console.log('\n========== PAGE CONTENT ==========');
  console.log(bodyText?.substring(0, 500));

  console.log('\n========== SUMMARY ==========');
  console.log('Email used:', email);
  console.log('Contains "Home":', bodyText?.includes('Home'));
  console.log('Contains "Workout":', bodyText?.includes('Workout'));
  console.log('Contains "Dashboard":', bodyText?.includes('Dashboard'));
  console.log('Contains "Error":', bodyText?.includes('Error') || bodyText?.includes('error'));
});
