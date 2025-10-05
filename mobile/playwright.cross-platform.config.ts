import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-Platform Compatibility Test Configuration
 *
 * Comprehensive test setup for validating FitFlow Pro across:
 * - Multiple browsers (Chromium, Firefox, WebKit)
 * - Multiple device sizes (mobile, tablet, desktop)
 * - Different network conditions
 * - Various orientations
 *
 * Usage:
 *   npx playwright test --config=playwright.cross-platform.config.ts
 *   npx playwright test --config=playwright.cross-platform.config.ts --project=chromium-mobile
 *   npx playwright test --config=playwright.cross-platform.config.ts --grep="@performance"
 */

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/cross-platform.spec.ts',
  fullyParallel: false, // Run sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once on failure
  workers: 1, // Single worker to avoid race conditions
  reporter: [
    ['html', { outputFolder: 'playwright-report/cross-platform', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/cross-platform/results.json' }],
  ],

  // Global timeout for each test
  timeout: 60000, // 60 seconds (Expo web bundling can be slow)

  // Global settings for all tests
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Navigation timeouts
    actionTimeout: 15000,
    navigationTimeout: 60000,
  },

  // Test projects covering different platforms and browsers
  projects: [
    // ========================================
    // Desktop Browsers
    // ========================================
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // ========================================
    // Mobile Devices
    // ========================================
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'webkit-mobile',
      use: {
        ...devices['iPhone 12'],
      },
    },
    {
      name: 'chromium-mobile-landscape',
      use: {
        ...devices['Pixel 5 landscape'],
      },
    },

    // ========================================
    // Tablets
    // ========================================
    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad Pro'],
      },
    },
    {
      name: 'chromium-tablet-landscape',
      use: {
        ...devices['iPad Pro landscape'],
      },
    },

    // ========================================
    // Network Conditions
    // ========================================
    {
      name: 'chromium-slow-network',
      use: {
        ...devices['Desktop Chrome'],
        // Slow network simulation applied in tests
      },
    },

    // ========================================
    // Small Screens
    // ========================================
    {
      name: 'chromium-small-mobile',
      use: {
        ...devices['iPhone SE'],
      },
    },

    // ========================================
    // Large Screens
    // ========================================
    {
      name: 'chromium-large-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
      },
    },
  ],

  // Web server configuration (assumes Expo already running)
  // Uncomment to auto-start Expo server
  // webServer: {
  //   command: 'npm run web',
  //   port: 8081,
  //   reuseExistingServer: true,
  //   timeout: 120000,
  // },
});
