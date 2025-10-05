import { test, expect } from '@playwright/test';

test.describe('Final E2E Auth Verification', () => {
  const timestamp = Date.now();
  const testEmail = `test-final-${timestamp}@example.com`;
  const testPassword = 'Test1234';

  test('Test 1: Registration Flow', async ({ page }) => {
    console.log('[Test 1] Starting registration flow...');
    
    // Navigate to registration page
    await page.goto('http://localhost:8081/register');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of registration page
    await page.screenshot({ path: 'e2e-results/01-registration-page.png', fullPage: true });
    console.log('[Test 1] On registration page');

    // Fill form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Select experience level (look for beginner option)
    const experienceButtons = page.locator('text=/beginner/i').first();
    await experienceButtons.click();
    
    await page.screenshot({ path: 'e2e-results/02-registration-filled.png', fullPage: true });
    console.log('[Test 1] Form filled with:', testEmail);

    // Click Create Account button
    const createAccountButton = page.locator('text=/create account/i').first();
    await createAccountButton.click();
    console.log('[Test 1] Clicked Create Account');

    // Wait for navigation
    await page.waitForURL('http://localhost:8081/', { timeout: 10000 });
    console.log('[Test 1] ✅ VERIFY: URL is http://localhost:8081/ (dashboard)');

    // Wait for dashboard content to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of dashboard
    await page.screenshot({ path: 'e2e-results/03-dashboard-after-registration.png', fullPage: true });

    // Verify we're on dashboard (not login page)
    const currentUrl = page.url();
    expect(currentUrl).toBe('http://localhost:8081/');
    
    // Check for dashboard content (not login form)
    const hasLoginForm = await page.locator('text=/login/i').count() === 0;
    expect(hasLoginForm).toBeTruthy();
    
    console.log('[Test 1] ✅ VERIFY: Dashboard shows user content (not login page)');
    console.log('[Test 1] ✅ TEST 1 PASSED - Registration flow works!');
  });

  test('Test 2: Logout and Login', async ({ page }) => {
    console.log('[Test 2] Starting logout/login flow...');
    
    // First register the user
    await page.goto('http://localhost:8081/register');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    const experienceButtons = page.locator('text=/beginner/i').first();
    await experienceButtons.click();
    const createAccountButton = page.locator('text=/create account/i').first();
    await createAccountButton.click();
    await page.waitForURL('http://localhost:8081/', { timeout: 10000 });
    
    console.log('[Test 2] User registered, now navigating to settings...');

    // Navigate to settings
    await page.goto('http://localhost:8081/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'e2e-results/04-settings-page.png', fullPage: true });
    console.log('[Test 2] On settings page');

    // Click Logout button
    const logoutButton = page.locator('text=/logout/i').first();
    await logoutButton.click();
    console.log('[Test 2] Clicked Logout');

    // Wait for redirect to login
    await page.waitForURL(/login/, { timeout: 10000 });
    console.log('[Test 2] ✅ VERIFY: Redirected to /login');
    
    await page.screenshot({ path: 'e2e-results/05-login-after-logout.png', fullPage: true });

    // Now login with same credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    const loginButton = page.locator('text=/^login$/i').first();
    await loginButton.click();
    console.log('[Test 2] Clicked Login');

    // Wait for dashboard
    await page.waitForURL('http://localhost:8081/', { timeout: 10000 });
    console.log('[Test 2] ✅ VERIFY: Dashboard loads again');
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e-results/06-dashboard-after-login.png', fullPage: true });
    
    const currentUrl = page.url();
    expect(currentUrl).toBe('http://localhost:8081/');
    
    console.log('[Test 2] ✅ TEST 2 PASSED - Logout and login flow works!');
  });

  test('Test 3: Protected Routes', async ({ page }) => {
    console.log('[Test 3] Starting protected routes test...');
    
    // First register and login
    await page.goto('http://localhost:8081/register');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    const experienceButtons = page.locator('text=/beginner/i').first();
    await experienceButtons.click();
    const createAccountButton = page.locator('text=/create account/i').first();
    await createAccountButton.click();
    await page.waitForURL('http://localhost:8081/', { timeout: 10000 });
    
    console.log('[Test 3] User authenticated, testing protected routes...');

    // Test analytics route
    await page.goto('http://localhost:8081/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const analyticsUrl = page.url();
    expect(analyticsUrl).toBe('http://localhost:8081/analytics');
    console.log('[Test 3] ✅ VERIFY: Analytics page loads (not login redirect)');
    
    await page.screenshot({ path: 'e2e-results/07-analytics-page.png', fullPage: true });

    // Test planner route
    await page.goto('http://localhost:8081/planner');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const plannerUrl = page.url();
    expect(plannerUrl).toBe('http://localhost:8081/planner');
    console.log('[Test 3] ✅ VERIFY: Planner page loads');
    
    await page.screenshot({ path: 'e2e-results/08-planner-page.png', fullPage: true });
    
    console.log('[Test 3] ✅ TEST 3 PASSED - Protected routes accessible when authenticated!');
  });
});
