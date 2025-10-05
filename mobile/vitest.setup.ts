/**
 * Vitest setup file
 * Runs before all tests
 */

import { vi } from 'vitest';

// Mock expo-sqlite module globally to prevent import errors
vi.mock('expo-sqlite', () => {
  return {
    openDatabaseAsync: vi.fn(),
    SQLiteDatabase: class {},
    SQLiteStatement: class {},
    SQLiteSession: class {},
    bundledExtensions: {},
  };
});
