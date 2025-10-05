import { test, expect } from '@playwright/test';

test('Body weight chart simple test', async ({ page }) => {
  // Go to login page (assume already has session from previous test)
  await page.goto('http://localhost:8081');
  await page.waitForTimeout(1000);

  // Check if already logged in by looking for Home tab
  const homeTab = page.locator('text=Home');
  const isLoggedIn = await homeTab.isVisible({ timeout: 2000 }).catch(() => false);

  if (!isLoggedIn) {
    // Need to login
    const usernameInput = page.locator('input').nth(0);
    const passwordInput = page.locator('input[type="password"]').first();

    await usernameInput.click();
    await usernameInput.fill('bodyweight-test-123@example.com');
    await passwordInput.click();
    await passwordInput.fill('Test123!');

    const loginButton = page.locator('button:has-text("Login")');
    await loginButton.click();
    await page.waitForTimeout(3000);
  }

  // Navigate to Analytics by clicking the bottom tab
  const analyticsTab = page
    .locator('[aria-label="Analytics"], button:has-text("Analytics")')
    .first();
  await analyticsTab.click();
  await page.waitForTimeout(2000);

  // Wait for Body Weight text to appear
  await page.waitForSelector('text=Body Weight', { timeout: 5000 });

  // Take fullpage screenshot
  await page.screenshot({ path: '/tmp/bodyweight-final.png', fullPage: true });

  // Check if BodyWeightChart component rendered
  const bodyWeightText = await page.locator('text=Body Weight Progression').count();
  console.log(`Found ${bodyWeightText} "Body Weight Progression" elements`);

  // Get page content to analyze
  const textContent = await page.locator('text=Body Weight').allTextContents();
  console.log('Body Weight sections:', textContent);

  expect(bodyWeightText).toBeGreaterThan(0);
});
