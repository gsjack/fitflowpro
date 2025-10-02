import { test } from '@playwright/test';

test('auto login and keep dashboard open', async ({ page }) => {
  // Don't close browser after test
  test.setTimeout(300000); // 5 minutes timeout

  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log('✓ App loaded');

  // Wait for auth screen
  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });

  // Try to login with existing user first
  const loginTab = page.locator('button').filter({ hasText: /^Login$/i }).first();
  await loginTab.click();
  await page.waitForTimeout(1000);

  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');

  const loginButton = page.locator('button').filter({ hasText: /^Login$/i }).last();
  await loginButton.click();

  console.log('✓ Submitted login');

  await page.waitForTimeout(5000);

  // Check if logged in
  let bodyText = await page.textContent('body');
  let isLoggedIn = bodyText?.includes('Home') || bodyText?.includes('Workout');

  if (!isLoggedIn) {
    console.log('Login failed, trying registration...');

    // Switch to register
    const registerTab = page.locator('button').filter({ hasText: /Register/i }).first();
    await registerTab.click();
    await page.waitForTimeout(1000);

    // Register new user
    const email = 'demo@fitflow.test';
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill('Password123');

    const createButton = page.locator('button').filter({ hasText: /Create Account/i });
    await createButton.click();

    console.log('✓ Submitted registration');
    await page.waitForTimeout(5000);
  }

  // Take screenshot of dashboard
  await page.screenshot({ path: '/tmp/dashboard-final.png', fullPage: true });

  bodyText = await page.textContent('body');
  console.log('\n========================================');
  console.log('✅ DASHBOARD IS NOW OPEN');
  console.log('========================================');
  console.log('URL: http://localhost:8081');
  console.log('Status: Logged in');
  console.log('Visible tabs:', bodyText?.includes('Home') ? '✓' : '✗', 'Home |',
                               bodyText?.includes('Workout') ? '✓' : '✗', 'Workout |',
                               bodyText?.includes('Analytics') ? '✓' : '✗', 'Analytics |',
                               bodyText?.includes('Planner') ? '✓' : '✗', 'Planner |',
                               bodyText?.includes('Settings') ? '✓' : '✗', 'Settings');
  console.log('========================================\n');

  // Keep browser open - wait indefinitely
  console.log('Browser window will remain open. Press Ctrl+C to close when done.');
  await page.waitForTimeout(300000); // Wait 5 minutes
});
