import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for integration tests
 *
 * Integration tests verify end-to-end scenarios:
 * - Complete workout sessions (T074)
 * - Auto-regulation based on recovery (T075)
 * - Progression tracking (T076)
 * - Program customization (T077)
 * - VO2max cardio protocol (T078)
 *
 * These tests use real SQLite database instances and mock timers/notifications.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.expo', 'android', 'ios'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.expo/',
        '**/*.config.*',
        '**/*.test.*',
        '**/types/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    testTimeout: 10000, // Integration tests may take longer
    hookTimeout: 10000,
    // Run tests serially to avoid database conflicts
    // @ts-expect-error - threads may not be in latest vitest types
    threads: false,
    // Clear mocks between tests
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});
