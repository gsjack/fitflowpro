/**
 * Quick Registration Navigation Test
 *
 * Simplified test to verify registration → dashboard navigation
 */

import { test, expect } from '@playwright/test';

const testEmail = `test${Date.now()}@example.com`;
const testPassword = 'TestPassword123';

test('registration navigates to dashboard', async ({ page }) => {
  // Enable console logging
  page.on('console', (msg) => console.log(`[Browser] ${msg.text()}`));

  // Navigate to app
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });

  // Wait for auth screen to load
  await page.waitForSelector('text=FitFlow Pro', { timeout: 30000 });

  console.log('Auth screen loaded');

  // Fill registration form
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);

  console.log('Form filled, submitting...');

  // Click register button
  await page.click('button:has-text("Register")');

  console.log('Waiting for navigation to dashboard...');

  // Wait for dashboard to appear (increased timeout)
  await page.waitForSelector('text=Dashboard', { timeout: 10000 }).catch(() => {
    console.log('Dashboard not found, checking page content...');
  });

  // Check if we're still on auth screen or on dashboard
  const pageContent = await page.textContent('body');

  console.log('Page content preview:', pageContent?.substring(0, 200));

  // Verify we're on dashboard
  const isDashboard =
    pageContent?.includes('Dashboard') ||
    pageContent?.includes('Start Workout') ||
    pageContent?.includes('Home');

  expect(isDashboard).toBe(true);
});
