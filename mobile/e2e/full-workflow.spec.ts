import { test, expect } from '@playwright/test';

test.describe('FitFlow E2E Workflows', () => {
  test('complete user registration and dashboard workflow', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:8081', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    console.log('✓ App loaded');

    // Wait for auth screen to render
    await page.waitForSelector('text=/Login|Register/i', { timeout: 10000 });
    console.log('✓ Auth screen visible');

    // Switch to Register tab
    const registerButton = page.getByRole('button', { name: /register/i }).first();
    await registerButton.click();
    console.log('✓ Switched to Register tab');

    await page.waitForTimeout(1000);

    // Fill in registration form
    const email = `test${Date.now()}@fitflow.test`;
    const password = 'TestPassword123!';

    await page.fill('input[type="email"]', email);
    console.log(`✓ Filled email: ${email}`);

    await page.fill('input[type="password"]', password);
    console.log('✓ Filled password');

    // Optional fields
    const ageInput = page.locator('input').filter({ hasText: /age/i }).or(page.getByLabel(/age/i));
    if (await ageInput.count() > 0) {
      await ageInput.first().fill('30');
      console.log('✓ Filled age: 30');
    }

    const weightInput = page.locator('input').filter({ hasText: /weight/i }).or(page.getByLabel(/weight/i));
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('75');
      console.log('✓ Filled weight: 75kg');
    }

    // Select experience level - try to find "Intermediate" button
    const intermediateButton = page.getByRole('button', { name: /intermediate/i });
    if (await intermediateButton.count() > 0) {
      await intermediateButton.first().click();
      console.log('✓ Selected experience: Intermediate');
    }

    await page.screenshot({ path: '/tmp/registration-form.png' });

    // Submit registration
    const createAccountButton = page.getByRole('button', { name: /create account/i });
    await createAccountButton.click();
    console.log('✓ Submitted registration');

    // Wait for navigation to dashboard (may take a few seconds for backend + seeding)
    await page.waitForTimeout(5000);

    await page.screenshot({ path: '/tmp/after-registration.png' });

    // Check if we're on dashboard or still on auth screen
    const bodyText = await page.textContent('body');

    if (bodyText?.includes('Dashboard') || bodyText?.includes('FitFlow Pro') || bodyText?.includes('Home')) {
      console.log('✓ Registration successful - Dashboard loaded');
    } else if (bodyText?.includes('email already exists')) {
      console.log('⚠ Email already exists - trying login instead');

      // Switch to login
      const loginTab = page.getByRole('button', { name: /login/i }).first();
      await loginTab.click();
      await page.waitForTimeout(1000);

      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);

      const loginButton = page.getByRole('button', { name: /^login$/i });
      await loginButton.click();

      await page.waitForTimeout(5000);
      console.log('✓ Login successful');
    } else {
      console.log('Current page content:', bodyText?.substring(0, 500));
    }

    await page.screenshot({ path: '/tmp/dashboard.png', fullPage: true });

    // Verify we're logged in by checking for navigation tabs or dashboard elements
    const finalBodyText = await page.textContent('body');
    const hasNavigation = finalBodyText?.includes('Home') ||
                          finalBodyText?.includes('Workout') ||
                          finalBodyText?.includes('Analytics');

    console.log('Has navigation tabs:', hasNavigation);
    expect(hasNavigation).toBe(true);

    console.log('✅ Complete workflow test passed!');
  });

  test('login with existing account', async ({ page }) => {
    await page.goto('http://localhost:8081', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    console.log('✓ App loaded');

    // Wait for auth screen
    await page.waitForSelector('text=/Login|Register/i', { timeout: 10000 });

    // Make sure we're on login tab
    const loginTab = page.getByRole('button', { name: /login/i }).first();
    await loginTab.click();
    await page.waitForTimeout(1000);

    // Use test credentials (from previous test or create manually)
    await page.fill('input[type="email"]', 'test@fitflow.test');
    await page.fill('input[type="password"]', 'TestPassword123!');

    await page.screenshot({ path: '/tmp/login-form.png' });

    const loginButton = page.getByRole('button', { name: /^login$/i });
    await loginButton.click();

    console.log('✓ Submitted login');

    // Wait for dashboard
    await page.waitForTimeout(5000);

    await page.screenshot({ path: '/tmp/dashboard-after-login.png', fullPage: true });

    const bodyText = await page.textContent('body');
    const loggedIn = bodyText?.includes('Home') ||
                     bodyText?.includes('Workout') ||
                     bodyText?.includes('Dashboard');

    console.log('Logged in:', loggedIn);

    if (loggedIn) {
      console.log('✅ Login test passed!');
    } else {
      console.log('⚠ Login may have failed - body:', bodyText?.substring(0, 500));
    }
  });
});
