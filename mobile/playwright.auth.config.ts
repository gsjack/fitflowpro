import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Authentication E2E Tests
 *
 * Optimized for comprehensive auth flow testing with:
 * - Single worker to avoid race conditions
 * - Longer timeouts for auth operations
 * - Detailed reporting with screenshots
 * - Web platform focus
 *
 * Usage:
 *   npx playwright test --config=playwright.auth.config.ts
 *   npx playwright test --config=playwright.auth.config.ts --headed
 *   npx playwright test --config=playwright.auth.config.ts --debug
 *   npx playwright test --config=playwright.auth.config.ts --ui
 */

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/auth-comprehensive.spec.ts',

  // Run tests sequentially to avoid token/session conflicts
  fullyParallel: false,
  workers: 1,

  // Retry on failure (useful for flaky network tests)
  retries: process.env.CI ? 2 : 1,

  // Fail fast in CI
  forbidOnly: !!process.env.CI,

  // Reporting
  reporter: [
    ['html', { outputFolder: 'playwright-report/auth', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/auth/results.json' }],
  ],

  // Global timeout for each test
  timeout: 90000, // 90 seconds (auth flows can be slow)

  // Global settings
  use: {
    baseURL: 'http://localhost:8081',

    // Tracing and debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Timeouts
    actionTimeout: 15000, // 15 seconds for actions
    navigationTimeout: 60000, // 60 seconds for navigation (Expo bundling)

    // Browser settings
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  // Test projects
  projects: [
    {
      name: 'chromium-web',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Web server (assumes Expo already running)
  // Uncomment to auto-start Expo server
  // webServer: {
  //   command: 'npm run web',
  //   port: 8081,
  //   reuseExistingServer: true,
  //   timeout: 120000,
  // },
});
