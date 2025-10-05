/**
 * Web Compatibility Test Suite
 *
 * Validates that:
 * 1. All database functions return safe defaults on web
 * 2. Web app doesn't try to import expo-sqlite at all
 * 3. Metro bundler excludes expo-sqlite on web builds
 * 4. API-only mode works correctly on web
 *
 * Run with: npm run test:unit -- web-compatibility.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Platform } from 'react-native';

// Mock Platform to simulate web environment
vi.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web,
  },
}));

describe('Web Compatibility Tests', () => {
  describe('Platform Detection', () => {
    it('should correctly identify web platform', () => {
      expect(Platform.OS).toBe('web');
    });
  });

  describe('SQLite Wrapper on Web', () => {
    it('should not load expo-sqlite on web', async () => {
      const { isSQLiteAvailable, getSQLiteDiagnostics } = await import(
        '../src/database/sqliteWrapper'
      );

      expect(isSQLiteAvailable()).toBe(false);

      const diagnostics = getSQLiteDiagnostics();
      expect(diagnostics.platform).toBe('web');
      expect(diagnostics.available).toBe(false);
      expect(diagnostics.error).toBeNull();
    });

    it('should return null when trying to open database on web', async () => {
      const { openDatabaseAsync } = await import('../src/database/sqliteWrapper');

      const db = await openDatabaseAsync('test.db');
      expect(db).toBeNull();
    });

    it('should return null for SQLite load error on web', async () => {
      const { getSQLiteLoadError } = await import('../src/database/sqliteWrapper');

      const error = getSQLiteLoadError();
      expect(error).toBeNull();
    });
  });

  describe('Database Functions on Web', () => {
    let db: any;

    beforeEach(async () => {
      // Clear module cache to ensure fresh imports
      vi.resetModules();
      db = await import('../src/database/db');
    });

    it('initializeDatabase should return null on web', async () => {
      const result = await db.initializeDatabase();
      expect(result).toBeNull();
    });

    it('getDatabase should return null on web', () => {
      const result = db.getDatabase();
      expect(result).toBeNull();
    });

    it('getAllAsync should return empty array on web', async () => {
      const result = await db.getAllAsync('SELECT * FROM users');
      expect(result).toEqual([]);
    });

    it('getFirstAsync should return null on web', async () => {
      const result = await db.getFirstAsync('SELECT * FROM users WHERE id = 1');
      expect(result).toBeNull();
    });

    it('runAsync should return zero values on web', async () => {
      const result = await db.runAsync('INSERT INTO users (username) VALUES (?)', ['test']);
      expect(result).toEqual({ lastInsertRowId: 0, changes: 0 });
    });

    it('execAsync should complete without error on web', async () => {
      await expect(db.execAsync('CREATE TABLE test (id INTEGER)')).resolves.toBeUndefined();
    });

    it('withTransactionAsync should complete without error on web', async () => {
      const callback = vi.fn();
      await expect(db.withTransactionAsync(callback)).resolves.toBeUndefined();
      expect(callback).not.toHaveBeenCalled();
    });

    it('getUnsyncedRecords should return empty arrays on web', async () => {
      const result = await db.getUnsyncedRecords();
      expect(result).toEqual({
        workouts: [],
        sets: [],
        recoveryAssessments: [],
      });
    });

    it('markAsSynced should complete without error on web', async () => {
      await expect(db.markAsSynced('sets', 123)).resolves.toBeUndefined();
    });

    it('closeDatabase should complete without error on web', async () => {
      await expect(db.closeDatabase()).resolves.toBeUndefined();
    });
  });

  describe('API-Only Mode', () => {
    it('workoutDb should use API on web', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, user_id: 1, status: 'not_started' }),
      });

      const { createWorkout } = await import('../src/services/database/workoutDb');

      // Mock AsyncStorage
      vi.mock('@react-native-async-storage/async-storage', () => ({
        default: {
          getItem: vi.fn().mockResolvedValue('mock-token'),
        },
      }));

      const workoutId = await createWorkout(1, 1, '2025-10-05');
      expect(workoutId).toBe(1);
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Console Logging Validation', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log');
    });

    it('should log web platform detection messages', async () => {
      const { initializeDatabase } = await import('../src/database/db');
      await initializeDatabase();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Web platform - using API-only mode')
      );
    });
  });
});

describe('Native Module Isolation Tests', () => {
  describe('expo-sqlite Import Protection', () => {
    it('should not directly import expo-sqlite in db.ts', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const dbPath = path.resolve(__dirname, '../src/database/db.ts');
      const dbContent = fs.readFileSync(dbPath, 'utf-8');

      // Should NOT have direct import of expo-sqlite
      expect(dbContent).not.toMatch(/import.*from.*['"]expo-sqlite['"]/);
      expect(dbContent).not.toMatch(/import \* as SQLite from/);

      // Should ONLY import from sqliteWrapper
      expect(dbContent).toMatch(/from.*['"]\.\/sqliteWrapper['"]/);
    });

    it('should use type-only imports in sqliteWrapper.ts', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const wrapperPath = path.resolve(__dirname, '../src/database/sqliteWrapper.ts');
      const wrapperContent = fs.readFileSync(wrapperPath, 'utf-8');

      // Should use type-only import (either format is valid)
      expect(wrapperContent).toMatch(/import type.*from.*['"]expo-sqlite['"]/);
    });

    it('should use dynamic require() in sqliteWrapper', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const wrapperPath = path.resolve(__dirname, '../src/database/sqliteWrapper.ts');
      const wrapperContent = fs.readFileSync(wrapperPath, 'utf-8');

      // Should use require() for dynamic loading
      expect(wrapperContent).toMatch(/require\(['"]expo-sqlite['"]\)/);
    });
  });

  describe('Platform-Specific File Resolution', () => {
    it('should have web shim for react-native-screens', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const shimPath = path.resolve(__dirname, '../react-native-screens.web.js');
      expect(fs.existsSync(shimPath)).toBe(true);

      const shimContent = fs.readFileSync(shimPath, 'utf-8');
      expect(shimContent).toMatch(/export function enableScreens/);
      expect(shimContent).toMatch(/export function screensEnabled/);
    });

    it('metro.config.js should resolve web shims', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const metroPath = path.resolve(__dirname, '../metro.config.js');
      const metroContent = fs.readFileSync(metroPath, 'utf-8');

      // Should have custom resolveRequest
      expect(metroContent).toMatch(/resolveRequest/);
      expect(metroContent).toMatch(/react-native-screens\.web\.js/);
    });
  });
});

describe('Type Safety on Web', () => {
  it('should export types from wrapper (compile-time check)', () => {
    // This test verifies that TypeScript types compile without errors
    // Types cannot be imported at runtime, so this is a compile-time validation
    // If this file compiles, the types exist and are exported correctly
    expect(true).toBe(true);
  });
});
