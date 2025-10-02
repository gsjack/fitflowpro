import { test } from '@playwright/test';

test('check today\'s workout after program seed', async ({ page }) => {
  // Enable console logging
  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
  });

  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log('✓ Page loaded');

  // Wait for auth screen
  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });

  // Login with demo account
  const loginTab = page.locator('button').filter({ hasText: /^Login$/i }).first();
  await loginTab.click();
  await page.waitForTimeout(1000);

  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');

  const loginButton = page.locator('button').filter({ hasText: /^Login$/i }).last();
  await loginButton.click();

  console.log('✓ Submitted login');
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/dashboard-with-workout.png', fullPage: true });

  const bodyText = await page.textContent('body');

  console.log('\n========== DASHBOARD CONTENT ==========');
  console.log('Recovery Assessment:', bodyText?.includes('Recovery Assessment') ? '✓' : '✗');
  console.log('Today\'s Workout:', bodyText?.includes('Today\'s Workout') ? '✓' : '✗');
  console.log('Push B:', bodyText?.includes('Push B') ? '✓' : '✗');
  console.log('Overhead Press:', bodyText?.includes('Overhead Press') ? '✓' : '✗');
  console.log('Leg Press:', bodyText?.includes('Leg Press') ? '✓' : '✗');
  console.log('No workout scheduled:', bodyText?.includes('No workout scheduled') ? '✗ (BAD)' : '✓ (GOOD)');
  console.log('=======================================\n');

  // Keep browser open
  console.log('Browser window will remain open. Press Ctrl+C to close.');
  await page.waitForTimeout(300000); // 5 minutes
});
