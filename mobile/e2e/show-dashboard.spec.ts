import { test } from '@playwright/test';

test("show dashboard with today's workout details", async ({ page }) => {
  test.setTimeout(300000); // 5 minutes

  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Login
  const loginTab = page
    .locator('button')
    .filter({ hasText: /^Login$/i })
    .first();
  await loginTab.click();
  await page.waitForTimeout(1000);

  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');

  const loginButton = page
    .locator('button')
    .filter({ hasText: /^Login$/i })
    .last();
  await loginButton.click();

  console.log('✓ Logging in...');
  await page.waitForTimeout(5000);

  // Take screenshot after dashboard loads
  await page.screenshot({ path: '/tmp/dashboard-current.png', fullPage: true });

  console.log('\n========================================');
  console.log("✅ DASHBOARD WITH TODAY'S WORKOUT");
  console.log('========================================');
  console.log('URL: http://localhost:8081');
  console.log('Browser: Firefox (headed mode)');
  console.log('Expected: Push B (Shoulder-Focused)');
  console.log('Screenshot: /tmp/dashboard-current.png');
  console.log('Keep this window open to view');
  console.log('========================================\n');

  // Keep browser open
  await page.waitForTimeout(300000);
});
