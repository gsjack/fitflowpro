/**
 * Comprehensive E2E Authentication Flow Tests for FitFlow Pro
 *
 * Uses Page Object Pattern for maintainability and reusability.
 *
 * Test Coverage:
 * 1. Registration flow (valid credentials, validation errors, duplicate username)
 * 2. Login flow (valid, invalid password, non-existent user)
 * 3. Logout flow
 * 4. Token persistence across sessions
 * 5. Protected route redirection
 * 6. Unauthenticated access attempts
 *
 * Platform: Web (Playwright)
 * Backend: http://localhost:3000 (must be running)
 * Frontend: http://localhost:8081 (Expo web)
 *
 * Usage:
 *   npx playwright test e2e/auth-comprehensive.spec.ts
 *   npx playwright test e2e/auth-comprehensive.spec.ts --headed
 *   npx playwright test e2e/auth-comprehensive.spec.ts --debug
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================
// Configuration
// ============================================================

const APP_URL = 'http://localhost:8081';
const API_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = '/tmp/screenshots/auth-comprehensive';

// ============================================================
// Page Object: Base Page
// ============================================================

class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string = '') {
    await this.page.goto(`${APP_URL}${path}`);
    await this.page.waitForLoadState('networkidle');
  }

  async clearStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  async getStoredToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('@fitflow/auth_token');
    });
  }

  async waitForToken(timeout: number = 5000): Promise<string | null> {
    return await this.page.evaluate((timeoutMs) => {
      return new Promise<string | null>((resolve) => {
        let attempts = 0;
        const maxAttempts = timeoutMs / 100;

        const checkToken = () => {
          const token = localStorage.getItem('@fitflow/auth_token');
          if (token || attempts >= maxAttempts) {
            resolve(token);
          } else {
            attempts++;
            setTimeout(checkToken, 100);
          }
        };

        checkToken();
      });
    }, timeout);
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: `${SCREENSHOTS_DIR}/${name}.png`,
      fullPage: true,
    });
  }

  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await this.page.evaluate(async (url) => {
        const res = await fetch(url);
        return res.ok;
      }, `${API_URL}/health`);
      return response;
    } catch {
      return false;
    }
  }
}

// ============================================================
// Page Object: Login Page
// ============================================================

class LoginPage extends BasePage {
  // Locators
  private emailInput = () => this.page.locator('input[type="email"]');
  private passwordInput = () => this.page.locator('input[type="password"]');
  private loginButton = () => this.page.locator('button:has-text("Login")');
  private registerLink = () => this.page.locator('text=Register');
  private showPasswordButton = () => this.page.locator('[aria-label*="password"]');
  private errorMessage = () => this.page.locator('text=Invalid email or password');
  private emailValidationError = () => this.page.locator('text=Please enter a valid email address');
  private passwordValidationError = () =>
    this.page.locator('text=Password must be at least 8 characters');

  async goto() {
    await super.goto('/(auth)/login');
  }

  async fillEmail(email: string) {
    await this.emailInput().fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput().fill(password);
  }

  async blurEmail() {
    await this.emailInput().blur();
  }

  async blurPassword() {
    await this.passwordInput().blur();
  }

  async clickLogin() {
    const loginPromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    await this.loginButton().click();

    return loginPromise;
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    return await this.clickLogin();
  }

  async togglePasswordVisibility() {
    await this.showPasswordButton().click();
  }

  async clickRegisterLink() {
    await this.registerLink().click();
  }

  async expectOnPage() {
    await expect(this.loginButton()).toBeVisible();
    await expect(this.page).toHaveURL(/.*\(auth\)\/login.*/);
  }

  async expectLoginError() {
    await expect(this.errorMessage()).toBeVisible({ timeout: 5000 });
  }

  async expectEmailValidationError() {
    await expect(this.emailValidationError()).toBeVisible();
  }

  async expectPasswordValidationError() {
    await expect(this.passwordValidationError()).toBeVisible();
  }

  async expectPasswordFieldType(type: 'password' | 'text') {
    if (type === 'password') {
      await expect(this.passwordInput()).toBeVisible();
    } else {
      await expect(this.page.locator('input[type="text"][aria-label*="Password"]')).toBeVisible();
    }
  }
}

// ============================================================
// Page Object: Register Page
// ============================================================

class RegisterPage extends BasePage {
  // Locators
  private emailInput = () => this.page.locator('input[type="email"]');
  private passwordInput = () => this.page.locator('input[type="password"]');
  private createAccountButton = () => this.page.locator('button:has-text("Create Account")');
  private loginLink = () => this.page.locator('text=Login');
  private _showPasswordButton = () => this.page.locator('[aria-label*="password"]');
  private experienceLevel = (level: 'beginner' | 'intermediate' | 'advanced') =>
    this.page.locator(`button:has-text("${level.charAt(0).toUpperCase() + level.slice(1)}")`);
  private _errorMessage = (message: string) => this.page.locator(`text=${message}`);
  private emailValidationError = () => this.page.locator('text=Please enter a valid email address');
  private passwordValidationError = () =>
    this.page.locator('text=Password must be at least 8 characters');
  private duplicateEmailError = () =>
    this.page.locator('text=An account with this email already exists');

  async goto() {
    await super.goto('/(auth)/register');
  }

  async fillEmail(email: string) {
    await this.emailInput().fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput().fill(password);
  }

  async blurEmail() {
    await this.emailInput().blur();
  }

  async blurPassword() {
    await this.passwordInput().blur();
  }

  async selectExperienceLevel(level: 'beginner' | 'intermediate' | 'advanced') {
    await this.experienceLevel(level).click();
  }

  async clickCreateAccount() {
    const registerPromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/register') && response.request().method() === 'POST',
      { timeout: 10000 }
    );

    await this.createAccountButton().click();

    return registerPromise;
  }

  async register(
    email: string,
    password: string,
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.selectExperienceLevel(experienceLevel);
    return await this.clickCreateAccount();
  }

  async clickLoginLink() {
    await this.loginLink().click();
  }

  async expectOnPage() {
    await expect(this.createAccountButton()).toBeVisible();
    await expect(this.page).toHaveURL(/.*\(auth\)\/register.*/);
  }

  async expectEmailValidationError() {
    await expect(this.emailValidationError()).toBeVisible();
  }

  async expectPasswordValidationError() {
    await expect(this.passwordValidationError()).toBeVisible();
  }

  async expectDuplicateEmailError() {
    await expect(this.duplicateEmailError()).toBeVisible({ timeout: 5000 });
  }
}

// ============================================================
// Page Object: Dashboard Page
// ============================================================

class DashboardPage extends BasePage {
  // Locators
  private dashboardHeader = () => this.page.locator("text=/Dashboard|Today's Workout/i");
  private settingsTab = () => this.page.locator('text=Settings');
  private workoutTab = () => this.page.locator('text=Workout');
  private analyticsTab = () => this.page.locator('text=Analytics');
  private plannerTab = () => this.page.locator('text=Planner');

  async goto() {
    await super.goto('/(tabs)');
  }

  async expectOnPage() {
    await expect(this.page).toHaveURL(/.*\(tabs\).*/);
    await expect(this.dashboardHeader()).toBeVisible({ timeout: 10000 });
  }

  async navigateToSettings() {
    await this.settingsTab().click();
    await this.page.waitForTimeout(1000);
  }

  async navigateToWorkout() {
    await this.workoutTab().click();
    await this.page.waitForTimeout(1000);
  }

  async navigateToAnalytics() {
    await this.analyticsTab().click();
    await this.page.waitForTimeout(1000);
  }

  async navigateToPlanner() {
    await this.plannerTab().click();
    await this.page.waitForTimeout(1000);
  }
}

// ============================================================
// Page Object: Settings Page
// ============================================================

class SettingsPage extends BasePage {
  // Locators
  private settingsHeader = () => this.page.locator('text=/Settings|Profile/i');
  private logoutButton = () => this.page.locator('button:has-text("Logout")').first();
  private logoutConfirmButton = () => this.page.locator('button:has-text("Logout")').last();

  async expectOnPage() {
    await expect(this.settingsHeader()).toBeVisible({ timeout: 5000 });
  }

  async clickLogout() {
    await this.logoutButton().click();
  }

  async confirmLogout() {
    await this.page.waitForTimeout(500);

    const confirmButton = this.logoutConfirmButton();
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    await this.page.waitForTimeout(2000);
  }

  async logout() {
    await this.clickLogout();
    await this.confirmLogout();
  }
}

// ============================================================
// Test Helpers
// ============================================================

function generateTestUser() {
  return {
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@fitflow.test`,
    password: 'TestPass123!',
  };
}

// ============================================================
// Test Suite
// ============================================================

test.describe('Comprehensive Authentication Tests', () => {
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let dashboardPage: DashboardPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);
    settingsPage = new SettingsPage(page);

    // Clear storage
    await loginPage.goto();
    await loginPage.clearStorage();

    // Verify backend is running
    const apiHealthy = await loginPage.checkApiHealth();
    if (!apiHealthy) {
      throw new Error(
        'Backend API is not responding. Please start backend: cd backend && npm run dev'
      );
    }
  });

  // ============================================================
  // 1. Registration Flow Tests
  // ============================================================

  test.describe('1. Registration Flow', () => {
    test('should successfully register with valid credentials', async () => {
      const user = generateTestUser();

      await registerPage.goto();
      await registerPage.expectOnPage();

      const response = await registerPage.register(user.email, user.password);

      // Verify API response
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('user_id');
      expect(data).toHaveProperty('token');

      // Verify token stored
      const token = await registerPage.waitForToken();
      expect(token).toBeTruthy();
      expect(token).toBe(data.token);

      // Verify redirect to dashboard
      await dashboardPage.expectOnPage();

      await registerPage.screenshot('01-register-success');
    });

    test('should show validation error for invalid email', async () => {
      await registerPage.goto();
      await registerPage.expectOnPage();

      await registerPage.fillEmail('invalid-email');
      await registerPage.fillPassword('TestPass123!');
      await registerPage.blurEmail();

      await registerPage.expectEmailValidationError();

      await registerPage.screenshot('02-register-invalid-email');
    });

    test('should show validation error for short password', async () => {
      await registerPage.goto();
      await registerPage.expectOnPage();

      await registerPage.fillEmail('test@example.com');
      await registerPage.fillPassword('short');
      await registerPage.blurPassword();

      await registerPage.expectPasswordValidationError();

      await registerPage.screenshot('03-register-short-password');
    });

    test('should show error for duplicate email', async () => {
      const user = generateTestUser();

      // Register first time
      await registerPage.goto();
      const firstResponse = await registerPage.register(user.email, user.password);
      expect(firstResponse.status()).toBe(201);

      await dashboardPage.expectOnPage();

      // Logout
      await loginPage.clearStorage();

      // Try to register again with same email
      await registerPage.goto();
      const secondResponse = await registerPage.register(user.email, user.password);

      expect(secondResponse.status()).toBe(409); // Conflict
      await registerPage.expectDuplicateEmailError();

      await registerPage.screenshot('04-register-duplicate-email');
    });

    test('should allow selecting different experience levels', async () => {
      const user = generateTestUser();

      await registerPage.goto();
      await registerPage.expectOnPage();

      // Test selecting intermediate
      await registerPage.selectExperienceLevel('intermediate');

      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword(user.password);

      const response = await registerPage.clickCreateAccount();
      expect(response.status()).toBe(201);

      await dashboardPage.expectOnPage();

      await registerPage.screenshot('05-register-intermediate-level');
    });
  });

  // ============================================================
  // 2. Login Flow Tests
  // ============================================================

  test.describe('2. Login Flow', () => {
    test('should successfully login with valid credentials', async () => {
      const user = generateTestUser();

      // Register first
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Logout
      await loginPage.clearStorage();

      // Login
      await loginPage.goto();
      await loginPage.expectOnPage();

      const response = await loginPage.login(user.email, user.password);

      // Verify API response
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.username).toBe(user.email);

      // Verify token stored
      const token = await loginPage.waitForToken();
      expect(token).toBeTruthy();

      // Verify redirect to dashboard
      await dashboardPage.expectOnPage();

      await loginPage.screenshot('06-login-success');
    });

    test('should show error for invalid credentials', async () => {
      await loginPage.goto();
      await loginPage.expectOnPage();

      const response = await loginPage.login('nonexistent@example.com', 'WrongPassword123!');

      expect(response.status()).toBe(401);
      await loginPage.expectLoginError();

      // No token should be stored
      const token = await loginPage.getStoredToken();
      expect(token).toBeNull();

      await loginPage.screenshot('07-login-invalid-credentials');
    });

    test('should show error for wrong password', async () => {
      const user = generateTestUser();

      // Register first
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Logout
      await loginPage.clearStorage();

      // Try login with wrong password
      await loginPage.goto();
      const response = await loginPage.login(user.email, 'WrongPassword123!');

      expect(response.status()).toBe(401);
      await loginPage.expectLoginError();

      await loginPage.screenshot('08-login-wrong-password');
    });

    test('should toggle password visibility', async ({ _page }) => {
      await loginPage.goto();
      await loginPage.expectOnPage();

      // Initially password type
      await loginPage.expectPasswordFieldType('password');

      // Click to show
      await loginPage.togglePasswordVisibility();
      await loginPage.expectPasswordFieldType('text');

      // Click to hide
      await loginPage.togglePasswordVisibility();
      await loginPage.expectPasswordFieldType('password');

      await loginPage.screenshot('09-login-password-toggle');
    });

    test('should show validation errors on login form', async () => {
      await loginPage.goto();
      await loginPage.expectOnPage();

      // Test invalid email
      await loginPage.fillEmail('not-an-email');
      await loginPage.fillPassword('TestPass123!');
      await loginPage.blurEmail();

      await loginPage.expectEmailValidationError();

      await loginPage.screenshot('10-login-validation-errors');
    });
  });

  // ============================================================
  // 3. Logout Flow Tests
  // ============================================================

  test.describe('3. Logout Flow', () => {
    test('should successfully logout and redirect to login', async () => {
      const user = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Navigate to settings
      await dashboardPage.navigateToSettings();
      await settingsPage.expectOnPage();

      // Logout
      await settingsPage.logout();

      // Verify redirect to login
      await loginPage.expectOnPage();

      // Verify token cleared
      const token = await loginPage.getStoredToken();
      expect(token).toBeNull();

      await loginPage.screenshot('11-logout-success');
    });

    test('should not access protected routes after logout', async () => {
      const user = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Logout by clearing storage
      await loginPage.clearStorage();

      // Try to access protected route
      await dashboardPage.goto();

      // Should redirect to login
      await loginPage.expectOnPage();

      await loginPage.screenshot('12-logout-protected-route-blocked');
    });
  });

  // ============================================================
  // 4. Token Persistence Tests
  // ============================================================

  test.describe('4. Token Persistence', () => {
    test('should persist login after page refresh', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Get token before refresh
      const tokenBefore = await loginPage.getStoredToken();
      expect(tokenBefore).toBeTruthy();

      // Refresh page
      await page.reload({ waitUntil: 'networkidle' });

      // Should still be on dashboard
      await dashboardPage.expectOnPage();

      // Token should still be present
      const tokenAfter = await loginPage.getStoredToken();
      expect(tokenAfter).toBe(tokenBefore);

      await loginPage.screenshot('13-persistence-refresh');
    });

    test('should redirect to login if token is cleared', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Clear token
      await loginPage.clearStorage();

      // Refresh page
      await page.reload({ waitUntil: 'networkidle' });

      // Should redirect to login
      await loginPage.expectOnPage();

      await loginPage.screenshot('14-persistence-token-cleared');
    });

    test('should maintain auth across multiple page navigations', async () => {
      const user = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Navigate through all tabs
      await dashboardPage.navigateToWorkout();
      await dashboardPage.navigateToAnalytics();
      await dashboardPage.navigateToPlanner();
      await dashboardPage.navigateToSettings();

      // Token should still be present
      const token = await loginPage.getStoredToken();
      expect(token).toBeTruthy();

      await loginPage.screenshot('15-persistence-navigation');
    });
  });

  // ============================================================
  // 5. Protected Routes Tests
  // ============================================================

  test.describe('5. Protected Routes', () => {
    test('should redirect unauthenticated users to login', async () => {
      await loginPage.clearStorage();

      const protectedRoutes = [
        '/(tabs)',
        '/(tabs)/workout',
        '/(tabs)/analytics',
        '/(tabs)/planner',
        '/(tabs)/settings',
      ];

      for (const route of protectedRoutes) {
        await loginPage.goto(route);
        await loginPage.expectOnPage();
      }

      await loginPage.screenshot('16-protected-routes-blocked');
    });

    test('should allow authenticated users to access all routes', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Test navigation to each route
      const routes = [
        { path: '/(tabs)', content: /Dashboard|Today's Workout/i },
        { path: '/(tabs)/workout', content: /Workout|No Active Workout/i },
        { path: '/(tabs)/analytics', content: /Analytics|Progress/i },
        { path: '/(tabs)/planner', content: /Planner|Program/i },
        { path: '/(tabs)/settings', content: /Settings|Profile/i },
      ];

      for (const route of routes) {
        await page.goto(`${APP_URL}${route.path}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator(`text=${route.content}`).first()).toBeVisible({ timeout: 5000 });
      }

      await loginPage.screenshot('17-protected-routes-allowed');
    });

    test('should redirect authenticated users from auth routes to dashboard', async () => {
      const user = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Try to access login page
      await loginPage.goto();

      // Should redirect to dashboard
      await dashboardPage.expectOnPage();

      await loginPage.screenshot('18-auth-routes-redirect');
    });
  });

  // ============================================================
  // 6. Unauthenticated Access Tests
  // ============================================================

  test.describe('6. Unauthenticated Access Attempts', () => {
    test('should handle direct URL access to protected routes', async ({ page }) => {
      await loginPage.clearStorage();

      // Try direct navigation to workout
      await page.goto(`${APP_URL}/(tabs)/workout`);
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      await loginPage.expectOnPage();

      await loginPage.screenshot('19-direct-url-blocked');
    });

    test('should handle invalid token gracefully', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Set invalid token
      await page.evaluate(() => {
        localStorage.setItem('@fitflow/auth_token', 'invalid.token.here');
      });

      // Refresh to trigger auth check
      await page.reload({ waitUntil: 'networkidle' });

      // Should redirect to login
      await loginPage.expectOnPage();

      await loginPage.screenshot('20-invalid-token-handled');
    });

    test('should handle expired token (simulated)', async ({ page }) => {
      const user = generateTestUser();

      // Register and login
      await registerPage.goto();
      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();

      // Simulate expired token by setting malformed JWT
      await page.evaluate(() => {
        localStorage.setItem(
          '@fitflow/auth_token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
        );
      });

      // Try to navigate to protected route
      await dashboardPage.goto();

      // Should redirect to login (invalid token detected)
      await loginPage.expectOnPage();

      await loginPage.screenshot('21-expired-token-handled');
    });

    test('should handle network errors during login', async ({ page }) => {
      await loginPage.goto();
      await loginPage.expectOnPage();

      // Block API requests
      await page.route('**/api/auth/login', (route) => route.abort());

      await loginPage.fillEmail('test@example.com');
      await loginPage.fillPassword('TestPass123!');
      await loginPage.clickLogin().catch(() => {
        // Expected to fail
      });

      await page.waitForTimeout(2000);

      // Should still be on login page
      await loginPage.expectOnPage();

      await loginPage.screenshot('22-network-error-login');
    });

    test('should handle network errors during registration', async ({ page }) => {
      await registerPage.goto();
      await registerPage.expectOnPage();

      // Block API requests
      await page.route('**/api/auth/register', (route) => route.abort());

      await registerPage.fillEmail('test@example.com');
      await registerPage.fillPassword('TestPass123!');
      await registerPage.clickCreateAccount().catch(() => {
        // Expected to fail
      });

      await page.waitForTimeout(2000);

      // Should still be on register page
      await registerPage.expectOnPage();

      await loginPage.screenshot('23-network-error-register');
    });

    test('should handle malformed email addresses', async () => {
      await loginPage.goto();
      await loginPage.expectOnPage();

      const malformedEmails = ['not-an-email', '@example.com', 'test@', 'test @example.com'];

      for (const email of malformedEmails) {
        await loginPage.fillEmail(email);
        await loginPage.fillPassword('TestPass123!');
        await loginPage.blurEmail();

        await loginPage.expectEmailValidationError();

        // Clear for next iteration
        await loginPage.fillEmail('');
      }

      await loginPage.screenshot('24-malformed-emails');
    });
  });

  // ============================================================
  // 7. Full Journey Test
  // ============================================================

  test.describe('7. Complete Authentication Journey', () => {
    test('should complete full register → logout → login journey', async () => {
      const user = generateTestUser();

      // 1. Register
      await registerPage.goto();
      await registerPage.expectOnPage();
      await loginPage.screenshot('journey-01-register-page');

      await registerPage.register(user.email, user.password);
      await dashboardPage.expectOnPage();
      await loginPage.screenshot('journey-02-dashboard-after-register');

      // 2. Navigate to settings
      await dashboardPage.navigateToSettings();
      await settingsPage.expectOnPage();
      await loginPage.screenshot('journey-03-settings-page');

      // 3. Logout
      await settingsPage.logout();
      await loginPage.expectOnPage();
      await loginPage.screenshot('journey-04-login-after-logout');

      // 4. Login again
      await loginPage.login(user.email, user.password);
      await dashboardPage.expectOnPage();
      await loginPage.screenshot('journey-05-dashboard-after-login');

      // 5. Verify token persists
      const token = await loginPage.getStoredToken();
      expect(token).toBeTruthy();

      // 6. Navigate through all tabs
      await dashboardPage.navigateToWorkout();
      await loginPage.screenshot('journey-06-workout-tab');

      await dashboardPage.navigateToAnalytics();
      await loginPage.screenshot('journey-07-analytics-tab');

      await dashboardPage.navigateToPlanner();
      await loginPage.screenshot('journey-08-planner-tab');

      console.log('\n✅ Complete authentication journey captured!\n');
    });
  });
});

// ============================================================
// Test Summary Reporter
// ============================================================

test.afterAll(async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Authentication E2E Test Summary');
  console.log('='.repeat(60));
  console.log('Test Categories:');
  console.log('  1. Registration Flow - 5 tests');
  console.log('  2. Login Flow - 5 tests');
  console.log('  3. Logout Flow - 2 tests');
  console.log('  4. Token Persistence - 3 tests');
  console.log('  5. Protected Routes - 3 tests');
  console.log('  6. Unauthenticated Access - 6 tests');
  console.log('  7. Complete Journey - 1 test');
  console.log('='.repeat(60));
  console.log('Total Tests: 25');
  console.log('Screenshots: ' + SCREENSHOTS_DIR);
  console.log('='.repeat(60) + '\n');
});
