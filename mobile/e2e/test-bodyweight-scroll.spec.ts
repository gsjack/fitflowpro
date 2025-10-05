import { test } from '@playwright/test';

test('Body weight chart scroll verification', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:8081');
  await page.waitForTimeout(2000);

  const usernameInput = page
    .locator(
      'input[placeholder*="Email"], input[type="email"], input[id*="username"], input[id*="email"]'
    )
    .first();
  const passwordInput = page.locator('input[type="password"]').first();

  await usernameInput.fill('bodyweight-test-123@example.com');
  await passwordInput.fill('Test123!');

  const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
  await loginButton.click();
  await page.waitForTimeout(3000);

  // Navigate to Analytics
  await page.click('text=Analytics');
  await page.waitForTimeout(2000);

  // Scroll to Body Weight section
  const bodyWeightSection = page.locator('text=Body Weight').first();
  await bodyWeightSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Scroll down more to see the chart
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/analytics-bodyweight-scrolled.png', fullPage: true });

  // Also check network requests
  const requests = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/body-weight')) {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
      });
    }
  });

  // Reload page to capture network
  await page.reload();
  await page.waitForTimeout(3000);

  console.log('Network requests for body-weight:', JSON.stringify(requests, null, 2));
  console.log('Screenshot saved to /tmp/analytics-bodyweight-scrolled.png');
});
