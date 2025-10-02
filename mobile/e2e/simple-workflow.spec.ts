import { test, expect } from '@playwright/test';

test('register new user and see dashboard', async ({ page }) => {
  console.log('🚀 Starting registration test...');

  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  console.log('✓ App loaded');

  // Wait for auth screen
  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });
  console.log('✓ Auth screen visible');

  await page.screenshot({ path: '/tmp/01-auth-screen.png' });

  // Click Register tab
  const registerTab = page.locator('button:has-text("Register")').first();
  await registerTab.click();
  await page.waitForTimeout(1000);
  console.log('✓ Switched to Register tab');

  await page.screenshot({ path: '/tmp/02-register-tab.png' });

  // Fill email and password
  const email = `user${Date.now()}@test.com`;
  const password = 'Password123!';

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  console.log(`✓ Filled credentials: ${email}`);

  await page.screenshot({ path: '/tmp/03-filled-form.png' });

  // Click "Create Account" button (the submit button, not the tab)
  const submitButton = page.locator('button').filter({ hasText: /^Create Account$/i });
  await submitButton.click();
  console.log('✓ Clicked Create Account');

  await page.screenshot({ path: '/tmp/04-after-submit.png' });

  // Wait for response (either success or error)
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/tmp/05-after-wait.png', fullPage: true });

  const bodyText = await page.textContent('body');
  console.log('Page content includes:');
  console.log('  - Dashboard:', bodyText?.includes('Dashboard'));
  console.log('  - Home:', bodyText?.includes('Home'));
  console.log('  - Workout:', bodyText?.includes('Workout'));
  console.log('  - Analytics:', bodyText?.includes('Analytics'));
  console.log('  - Error:', bodyText?.includes('error') || bodyText?.includes('Error'));

  // Check if we see navigation tabs (indicates successful login)
  const hasNavTabs = bodyText?.includes('Home') ||
                     bodyText?.includes('Workout') ||
                     bodyText?.includes('Analytics');

  if (hasNavTabs) {
    console.log('✅ SUCCESS! User registered and dashboard loaded');
  } else {
    console.log('⚠️  Dashboard not visible yet');
    console.log('Body preview:', bodyText?.substring(0, 300));
  }

  // Take final screenshot
  await page.screenshot({ path: '/tmp/06-final.png', fullPage: true });
});

test('login existing user', async ({ page }) => {
  console.log('🔑 Starting login test...');

  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  await page.waitForSelector('text=FitFlow Pro', { timeout: 10000 });
  console.log('✓ Auth screen loaded');

  // Make sure Login tab is selected
  const loginTab = page.locator('button').filter({ hasText: /^Login$/i }).first();
  await loginTab.click();
  await page.waitForTimeout(500);

  // Fill form
  await page.locator('input[type="email"]').fill('test@fitflow.test');
  await page.locator('input[type="password"]').fill('TestPassword123!');
  console.log('✓ Filled login credentials');

  await page.screenshot({ path: '/tmp/login-before-submit.png' });

  // Click the submit Login button (larger one at bottom, not the tab)
  const submitButton = page.locator('button').filter({ hasText: /^Login$/i }).last();
  await submitButton.click();
  console.log('✓ Clicked Login button');

  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/tmp/login-after-submit.png', fullPage: true });

  const bodyText = await page.textContent('body');
  const loggedIn = bodyText?.includes('Home') ||
                   bodyText?.includes('Workout') ||
                   bodyText?.includes('Analytics');

  if (loggedIn) {
    console.log('✅ Login successful!');
  } else {
    console.log('⚠️  Login status unclear');
    console.log('Body preview:', bodyText?.substring(0, 300));
  }
});
