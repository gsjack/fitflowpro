import { test, expect } from '@playwright/test';

test('manual login test with extended wait', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');

  console.log('Page loaded, waiting for Auth screen...');
  await page.waitForTimeout(3000);

  // Take screenshot of initial state
  await page.screenshot({ path: '/tmp/screenshots/manual-01-initial.png', fullPage: true });

  // Fill credentials
  console.log('Filling email...');
  await page.locator('input[type="email"]').fill('demo@fitflow.test');

  console.log('Filling password...');
  await page.locator('input[type="password"]').fill('Password123');

  await page.screenshot({ path: '/tmp/screenshots/manual-02-filled.png', fullPage: true });

  // Find and click the Login button using text content
  // There are 2 buttons with "Login" text:
  // 1. The segmented button (tab selector)
  // 2. The submit button (what we want)
  console.log('Looking for Login submit button...');
  const loginButtons = page.getByRole('button', { name: /^login$/i });
  const count = await loginButtons.count();
  console.log(`Found ${count} Login buttons`);

  // Click the last one (the submit button)
  const loginButton = loginButtons.last();
  await expect(loginButton).toBeVisible({ timeout: 5000 });
  console.log('Login submit button is visible');

  // Take screenshot before click
  await page.screenshot({ path: '/tmp/screenshots/manual-03-before-click.png', fullPage: true });

  // Click the button
  console.log('Clicking Login button...');
  await loginButton.click();

  // Wait for potential navigation or error
  console.log('Waiting for response...');
  await page.waitForTimeout(5000);

  // Take screenshot after click
  await page.screenshot({ path: '/tmp/screenshots/manual-04-after-click.png', fullPage: true });

  // Check URL
  const url = page.url();
  console.log('Current URL:', url);

  // Check if we see dashboard or error
  const pageText = await page.textContent('body');
  console.log('Page contains "Dashboard":', pageText?.includes('Dashboard') || false);
  console.log('Page contains "error":', pageText?.toLowerCase().includes('error') || false);
  console.log('Page contains "Invalid":', pageText?.includes('Invalid') || false);

  // Try to find dashboard elements
  const dashboardElements = await page.locator('text=/dashboard|workout|analytics/i').count();
  console.log('Found dashboard-related elements:', dashboardElements);
});
