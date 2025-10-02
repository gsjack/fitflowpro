import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for contract tests
 *
 * Contract tests verify API contracts between mobile app and backend:
 * - Request/response schemas
 * - HTTP status codes
 * - Error handling
 * - Authentication flows
 *
 * These tests mock the backend API responses.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/contract/**/*.test.ts'],
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
    testTimeout: 5000,
    hookTimeout: 5000,
    // Contract tests can run in parallel
    threads: true,
    // Clear mocks between tests
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});
