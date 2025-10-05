/**
 * E2E Test Helpers for Expo Router v6 + React Native Paper
 *
 * Shared utilities for Playwright tests with Expo Router file-based routing.
 * These helpers abstract away platform-specific selectors and navigation patterns.
 */

import { Page, expect } from '@playwright/test';

// ============================================================================
// Configuration
// ============================================================================

export const APP_URL = 'http://localhost:8081';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
export const DEFAULT_TIMEOUT = 10000;

// ============================================================================
// Navigation Helpers (Expo Router v6)
// ============================================================================

/**
 * Navigate to login screen using Expo Router URL
 */
export async function navigateToLogin(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/(auth)/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Verify we're on login screen
  await expect(page.locator('text=FitFlow Pro')).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await expect(page.locator('text=Login').first()).toBeVisible();
}

/**
 * Navigate to register screen using Expo Router URL
 */
export async function navigateToRegister(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/(auth)/register`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Verify we're on register screen
  await expect(page.locator('text=FitFlow Pro')).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  await expect(page.locator('text=Create Account').first()).toBeVisible();
}

/**
 * Navigate to dashboard (after authentication)
 */
export async function navigateToDashboard(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/(tabs)`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to specific tab screen
 */
export async function navigateToTab(
  page: Page,
  tab: 'workout' | 'analytics' | 'planner' | 'settings'
): Promise<void> {
  await page.goto(`${APP_URL}/(tabs)/${tab}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
}

/**
 * Click "Register" link from login screen (Expo Router Link)
 */
export async function clickRegisterLink(page: Page): Promise<void> {
  // The register link is inside a Pressable with text "Register"
  const registerLink = page.locator('text=Register').last();
  await registerLink.click();
  await page.waitForURL(/.*\(auth\)\/register/, { timeout: DEFAULT_TIMEOUT });
  await page.waitForLoadState('networkidle');
}

/**
 * Click "Login" link from register screen (Expo Router Link)
 */
export async function clickLoginLink(page: Page): Promise<void> {
  // The login link is inside a Pressable with text "Login"
  const loginLink = page.locator('text=Login').last();
  await loginLink.click();
  await page.waitForURL(/.*\(auth\)\/login/, { timeout: DEFAULT_TIMEOUT });
  await page.waitForLoadState('networkidle');
}

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Generate unique test user credentials
 */
export function generateTestUser() {
  return {
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@fitflow.test`,
    password: 'TestPass123!',
    age: 28,
    weight_kg: 75,
  };
}

/**
 * Fill login form (works on web and native)
 */
export async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  // Email input
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.clear();
  await emailInput.fill(email);

  // Password input
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.clear();
  await passwordInput.fill(password);

  await page.waitForTimeout(300);
}

/**
 * Fill registration form (works on web and native)
 */
export async function fillRegisterForm(
  page: Page,
  email: string,
  password: string,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): Promise<void> {
  // Email input
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.clear();
  await emailInput.fill(email);

  // Password input
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.clear();
  await passwordInput.fill(password);

  // Experience level (React Native Paper SegmentedButtons)
  if (experienceLevel !== 'beginner') {
    const expButton = page.locator(
      `button:has-text("${experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)}")`
    );
    await expButton.click();
  }

  await page.waitForTimeout(300);
}

/**
 * Submit login form (platform-specific button selector)
 */
export async function submitLoginForm(page: Page): Promise<void> {
  // Web uses native <button>, text="Login"
  // Native uses Pressable with Text child
  const loginButton = page.locator('button:has-text("Login")').last();
  await loginButton.click();

  // Wait for navigation to dashboard
  await page.waitForURL(/.*\(tabs\)/, { timeout: DEFAULT_TIMEOUT });
  await page.waitForLoadState('networkidle');
}

/**
 * Submit registration form (platform-specific button selector)
 */
export async function submitRegisterForm(page: Page): Promise<void> {
  // Web uses native <button>, text="Create Account"
  // Native uses Pressable with Text child
  const registerButton = page.locator('button:has-text("Create Account")').last();
  await registerButton.click();

  // Wait for navigation to dashboard
  await page.waitForURL(/.*\(tabs\)/, { timeout: DEFAULT_TIMEOUT });
  await page.waitForLoadState('networkidle');
}

/**
 * Complete login flow (navigate, fill, submit)
 */
export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await navigateToLogin(page);
  await fillLoginForm(page, email, password);
  await submitLoginForm(page);
}

/**
 * Complete registration flow (navigate, fill, submit)
 */
export async function registerUser(
  page: Page,
  email: string,
  password: string,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): Promise<void> {
  await navigateToRegister(page);
  await fillRegisterForm(page, email, password, experienceLevel);
  await submitRegisterForm(page);
}

/**
 * Register and login a new test user (returns credentials)
 */
export async function registerAndLogin(page: Page) {
  const user = generateTestUser();
  await registerUser(page, user.email, user.password);
  return user;
}

// ============================================================================
// Storage Helpers (AsyncStorage on Web = localStorage)
// ============================================================================

/**
 * Wait for AsyncStorage token to be set (Web: localStorage)
 */
export async function waitForTokenInStorage(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return new Promise<string | null>((resolve) => {
      let attempts = 0;
      const maxAttempts = 20; // 2 seconds total

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
  });
}

/**
 * Clear AsyncStorage (Web: localStorage)
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

/**
 * Get token from AsyncStorage
 */
export async function getStoredToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('@fitflow/auth_token'));
}

// ============================================================================
// API Helpers
// ============================================================================

/**
 * Check if backend API is healthy
 */
export async function checkApiHealth(page: Page): Promise<boolean> {
  try {
    const response = await page.evaluate(async (url) => {
      const res = await fetch(url);
      return res.ok;
    }, `${API_URL}/health`);
    return response;
  } catch {
    return false;
  }
}

/**
 * Wait for specific API call and return response
 */
export async function waitForApiCall(
  page: Page,
  urlPattern: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'POST'
): Promise<any> {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(urlPattern) && response.request().method() === method
  );

  const response = await responsePromise;
  return await response.json();
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Verify user is on dashboard (authenticated)
 */
export async function verifyOnDashboard(page: Page): Promise<void> {
  await expect(page).toHaveURL(/.*\(tabs\)/, { timeout: DEFAULT_TIMEOUT });
  // Dashboard should have "Today's Workout" or "Dashboard" text
  await expect(page.locator("text=/Dashboard|Today's Workout/i").first()).toBeVisible({
    timeout: DEFAULT_TIMEOUT,
  });
}

/**
 * Verify user is on login screen (unauthenticated)
 */
export async function verifyOnLoginScreen(page: Page): Promise<void> {
  await expect(page).toHaveURL(/.*\(auth\)\/login/, { timeout: DEFAULT_TIMEOUT });
  await expect(page.locator('text=FitFlow Pro')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
}

/**
 * Verify validation error is displayed
 */
export async function verifyValidationError(page: Page, errorText: string): Promise<void> {
  await expect(page.locator(`text=${errorText}`)).toBeVisible({ timeout: 5000 });
}

/**
 * Verify API error is displayed
 */
export async function verifyApiError(page: Page, errorPattern: RegExp): Promise<void> {
  await expect(page.locator(`text=${errorPattern}`)).toBeVisible({ timeout: 5000 });
}

// ============================================================================
// Screenshot Helpers
// ============================================================================

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  dir: string = '/tmp/screenshots'
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  await page.screenshot({
    path: `${dir}/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for app to be fully loaded and interactive
 */
export async function waitForAppReady(page: Page, timeout: number = 5000): Promise<void> {
  // Wait for root element
  await page.waitForSelector('#root', { timeout });

  // Wait for React to render
  await page.waitForTimeout(1000);

  // Check that content is visible
  const hasContent = await page.evaluate(() => {
    const body = document.querySelector('body');
    return body && body.textContent && body.textContent.trim().length > 0;
  });

  expect(hasContent).toBe(true);
}

/**
 * Wait for network to be idle (no pending requests)
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

// ============================================================================
// Logout Helper
// ============================================================================

/**
 * Logout user from settings page
 */
export async function logoutUser(page: Page): Promise<void> {
  // Navigate to settings
  await navigateToTab(page, 'settings');
  await page.waitForTimeout(1000);

  // Click logout button (first instance)
  const logoutButton = page.locator('button:has-text("Logout")').first();
  await expect(logoutButton).toBeVisible();
  await logoutButton.click();

  // Wait for confirmation dialog
  await page.waitForTimeout(500);

  // Confirm logout (second instance in dialog)
  const confirmButton = page.locator('button:has-text("Logout")').last();
  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }

  // Wait for redirect to login
  await page.waitForURL(/.*\(auth\)\/login/, { timeout: DEFAULT_TIMEOUT });
  await verifyOnLoginScreen(page);
}
