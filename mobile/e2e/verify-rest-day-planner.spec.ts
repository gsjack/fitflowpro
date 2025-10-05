import { test } from '@playwright/test';

test.describe('Dashboard and Planner Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://192.168.178.48:8081');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if already logged in by looking for auth token
    const hasToken = await page.evaluate(() => {
      return localStorage.getItem('authToken') !== null;
    });

    // If not logged in, perform login
    if (!hasToken) {
      console.log('Not logged in, attempting login...');

      // Wait for login page to load
      await page.waitForSelector('text=/login|sign in/i', { timeout: 10000 });

      // Fill in login form
      await page.fill(
        'input[type="email"], input[placeholder*="email" i], input[name="username"]',
        'asigator@gmail.com'
      );
      await page.fill('input[type="password"], input[placeholder*="password" i]', 'Test123!');

      // Click login button
      await page.click('button:has-text("Login"), button:has-text("Sign In")');

      // Wait for navigation to dashboard
      await page.waitForURL(/\/(tabs)?/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      console.log('Login successful');
    } else {
      console.log('Already logged in');
    }
  });

  test('Dashboard - Rest Day Card Display', async ({ page }) => {
    console.log('Testing Dashboard Rest Day Card...');

    // Ensure we're on the dashboard
    await page.goto('http://192.168.178.48:8081/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give React time to render

    // Take a screenshot of the entire dashboard
    await page.screenshot({
      path: 'test-screenshots/dashboard-full-view.png',
      fullPage: true,
    });

    // Look for Rest Day card indicators
    const restDayVisible = await page
      .locator('text=/rest day/i')
      .isVisible()
      .catch(() => false);

    if (restDayVisible) {
      console.log('✅ Rest Day card found');

      // Check for specific elements in the Rest Day card
      const hasRelaxIcon = (await page.locator('[role="img"], svg').count()) > 0;
      const hasTitle = (await page.locator('text=/rest day/i').count()) > 0;
      const hasButton = await page
        .locator('button:has-text("Start Workout Anyway"), button:has-text("start workout" i)')
        .isVisible()
        .catch(() => false);

      console.log(`  - Relaxation icon: ${hasRelaxIcon ? '✅' : '❌'}`);
      console.log(`  - "Rest Day" title: ${hasTitle ? '✅' : '❌'}`);
      console.log(`  - "Start Workout Anyway" button: ${hasButton ? '✅' : '❌'}`);

      // Take a focused screenshot of the rest day area
      const restDayCard = page.locator('text=/rest day/i').first();
      await restDayCard
        .screenshot({
          path: 'test-screenshots/dashboard-rest-day-card.png',
        })
        .catch(() => {
          console.log('Could not take focused screenshot of rest day card');
        });

      // Verify button is clickable (but don't click it)
      if (hasButton) {
        const button = page
          .locator('button:has-text("Start Workout Anyway"), button:has-text("start workout" i)')
          .first();
        const isEnabled = await button.isEnabled();
        console.log(`  - Button is enabled: ${isEnabled ? '✅' : '❌'}`);
      }
    } else {
      console.log('❌ Rest Day card not found on dashboard');
      console.log('Page content:', await page.content());
    }
  });

  test('Planner Page - Load Without Errors', async ({ page }) => {
    console.log('Testing Planner Page...');

    // Navigate to planner
    await page.goto('http://192.168.178.48:8081/planner');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give React time to render

    // Take a screenshot of the planner page
    await page.screenshot({
      path: 'test-screenshots/planner-full-view.png',
      fullPage: true,
    });

    // Check for error messages
    const hasError = await page
      .locator('text=/error/i, text=/crash/i, text=/something went wrong/i')
      .isVisible()
      .catch(() => false);
    console.log(`  - Error message present: ${hasError ? '❌ YES' : '✅ NO'}`);

    // Check for blank screen (no content)
    const bodyText = await page.locator('body').textContent();
    const isBlank = bodyText?.trim().length === 0;
    console.log(`  - Blank screen: ${isBlank ? '❌ YES' : '✅ NO'}`);

    // Check for planner-specific content
    const hasPlannerContent =
      (await page.locator('text=/program/i, text=/exercise/i, text=/day/i').count()) > 0;
    console.log(`  - Planner content present: ${hasPlannerContent ? '✅ YES' : '❌ NO'}`);

    // Look for "no day selected" state
    const hasNoDaySelected = await page
      .locator('text=/select/i, text=/choose/i, text=/no.*selected/i')
      .isVisible()
      .catch(() => false);
    if (hasNoDaySelected) {
      console.log('  - Shows "no day selected" UI: ✅ YES');
    }

    // Check console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`  ⚠️ Console error: ${msg.text()}`);
      }
    });
  });

  test('Navigation - Tab Bar', async ({ page }) => {
    console.log('Testing Tab Bar Navigation...');

    await page.goto('http://192.168.178.48:8081/');
    await page.waitForLoadState('networkidle');

    // Check if tab bar is visible
    const tabBarVisible = await page
      .locator('[role="navigation"], nav')
      .isVisible()
      .catch(() => false);
    console.log(`  - Tab bar visible: ${tabBarVisible ? '✅' : '❌'}`);

    // Take screenshot showing navigation
    await page.screenshot({
      path: 'test-screenshots/navigation-tab-bar.png',
      fullPage: false,
    });
  });
});
