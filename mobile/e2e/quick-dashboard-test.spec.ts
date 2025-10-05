import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8081';
const TIMESTAMP = Date.now();
const TEST_EMAIL = `quick-test-${TIMESTAMP}@example.com`;
const TEST_PASSWORD = 'Test1234!';

test('Quick Dashboard Test - Registration and Login', async ({ page }) => {
  console.log('\n=== QUICK DASHBOARD TEST ===');

  // Clear storage
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Navigate to registration
  await page.goto(`${BASE_URL}/register`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Fill registration form
  const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
  await emailInput.fill(TEST_EMAIL);

  const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
  await passwordInput.fill(TEST_PASSWORD);

  // Select experience if dropdown exists
  try {
    const experienceDropdown = page.locator('text=/experience/i').first();
    if (await experienceDropdown.isVisible({ timeout: 2000 })) {
      await experienceDropdown.click();
      await page.locator('text=/beginner/i').first().click();
    }
  } catch (e) {
    // Optional field
  }

  // Listen for console messages
  const errors: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('error')) {
      errors.push(text);
    }
    console.log(`[Browser] ${text}`);
  });

  // Take screenshot before registration
  await page.screenshot({
    path: '/home/asigator/fitness2025/mobile/test-results/01-before-register.png',
    fullPage: true
  });

  // Click register
  const registerButton = page.locator('button:has-text("Create Account"), button:has-text("Register"), button:has-text("Sign Up")').first();
  await registerButton.click();
  console.log('[Test] Clicked Create Account');

  // Wait for navigation
  await page.waitForTimeout(5000);

  // Take screenshot after registration
  await page.screenshot({
    path: '/home/asigator/fitness2025/mobile/test-results/02-after-register.png',
    fullPage: true
  });

  // Check URL
  const currentUrl = page.url();
  console.log(`[Test] Current URL: ${currentUrl}`);

  // Check for React errors
  const hasReactError = errors.some(e => e.includes('Rendered more hooks'));
  console.log(`[Test] React hooks error: ${hasReactError}`);

  // Check if we're on dashboard
  const isDashboard = currentUrl === `${BASE_URL}/` || currentUrl === BASE_URL;
  console.log(`[Test] Is dashboard: ${isDashboard}`);

  // Get page content
  const bodyText = await page.locator('body').textContent();
  const hasContent = bodyText && bodyText.length > 100;
  const isNotLoginPage = !currentUrl.includes('/login');

  console.log(`[Test] Has content: ${hasContent}`);
  console.log(`[Test] Not login page: ${isNotLoginPage}`);

  // Report results
  if (hasReactError) {
    console.log('❌ FAILED: React hooks error detected');
  } else if (!isDashboard) {
    console.log(`❌ FAILED: Not on dashboard (${currentUrl})`);
  } else if (!hasContent) {
    console.log('❌ FAILED: Dashboard is blank');
  } else {
    console.log('✅ SUCCESS: Registration works, dashboard loaded, no React errors');
  }

  // Assertions
  expect(hasReactError, 'Should not have React hooks error').toBe(false);
  expect(isDashboard, `Expected dashboard, got ${currentUrl}`).toBe(true);
  expect(hasContent, 'Dashboard should have content').toBe(true);
});
