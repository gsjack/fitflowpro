import { test } from '@playwright/test';

test('Body weight chart verification', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:8081');

  // Wait for app to load
  await page.waitForTimeout(2000);

  // Login with our test user
  const usernameInput = page
    .locator(
      'input[placeholder*="Email"], input[type="email"], input[id*="username"], input[id*="email"]'
    )
    .first();
  const passwordInput = page.locator('input[type="password"]').first();

  await usernameInput.fill('bodyweight-test-123@example.com');
  await passwordInput.fill('Test123!');

  // Click login button
  const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
  await loginButton.click();

  // Wait for navigation
  await page.waitForTimeout(3000);

  // Take screenshot of dashboard
  await page.screenshot({ path: '/tmp/dashboard-bodyweight.png', fullPage: true });

  // Navigate to Analytics
  await page.click('text=Analytics');
  await page.waitForTimeout(2000);

  // Take screenshot of analytics page
  await page.screenshot({ path: '/tmp/analytics-initial.png', fullPage: true });

  // Look for tabs and click Strength tab if exists
  const strengthTab = page.locator('text=Strength, button:has-text("Strength")').first();
  if (await strengthTab.isVisible({ timeout: 1000 }).catch(() => false)) {
    await strengthTab.click();
    await page.waitForTimeout(1000);
  }

  // Take final screenshot
  await page.screenshot({ path: '/tmp/analytics-bodyweight.png', fullPage: true });

  console.log('Screenshots saved to /tmp/');
  console.log('- /tmp/dashboard-bodyweight.png');
  console.log('- /tmp/analytics-initial.png');
  console.log('- /tmp/analytics-bodyweight.png');
});
