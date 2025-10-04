import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Visual Regression Testing Configuration
 *
 * This config is specifically for visual regression tests using screenshot comparison.
 * It uses Playwright's built-in `toHaveScreenshot()` assertion with pixel diff detection.
 *
 * Usage:
 *   npm run test:visual          # Run visual regression tests
 *   npm run test:visual:update   # Update baseline screenshots
 */
export default defineConfig({
  testDir: './e2e/visual',
  fullyParallel: false, // Run sequentially to avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid race conditions

  // Visual regression reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report/visual' }],
    ['list'],
    ['json', { outputFile: 'test-results/visual-results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Visual regression expect configuration
  expect: {
    toHaveScreenshot: {
      // Allow minor rendering differences (anti-aliasing, font rendering)
      maxDiffPixels: 100,
      threshold: 0.2, // 20% tolerance for pixel color difference

      // Screenshot options
      animations: 'disabled', // Disable animations for consistent screenshots
      scale: 'css', // Use CSS pixels (not device pixels)
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Rely on already running Expo server
  // Start with: npm run dev
});
