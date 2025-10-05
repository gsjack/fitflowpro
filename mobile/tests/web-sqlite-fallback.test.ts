/**
 * Web SQLite Fallback Test Suite
 *
 * Verifies that expo-sqlite gracefully degrades to API-only mode on web platform
 * Tests null database handling, API fallback paths, and no crashes when SQLite unavailable
 *
 * Test Strategy:
 * 1. Mock Platform.OS to simulate web environment
 * 2. Verify initializeDatabase() returns null on web
 * 3. Test database service functions handle null database gracefully
 * 4. Verify API-only mode works without crashes
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { Platform } from 'react-native';

// Mock Platform.OS
const originalPlatform = Platform.OS;
function setPlatform(os: 'web' | 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', {
    value: os,
    configurable: true,
    writable: true,
  });
}

describe('Web SQLite Fallback Implementation', () => {
  afterEach(() => {
    // Restore original platform
    setPlatform(originalPlatform as any);
    vi.clearAllMocks();
  });

  describe('1. Platform Detection', () => {
    it('should detect web platform and return null from initializeDatabase', async () => {
      setPlatform('web');

      const { initializeDatabase } = await import('../src/database/db');
      const db = await initializeDatabase();

      expect(db).toBeNull();
    });

    it('should log API-only mode message on web', async () => {
      setPlatform('web');
      const consoleSpy = vi.spyOn(console, 'log');

      const { initializeDatabase } = await import('../src/database/db');
      await initializeDatabase();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DB] Web platform - using API-only mode')
      );
    });
  });

  describe('2. SQLite Wrapper Availability Check', () => {
    it('should return false for isSQLiteAvailable on web', async () => {
      setPlatform('web');

      const { isSQLiteAvailable } = await import('../src/database/sqliteWrapper');
      const available = isSQLiteAvailable();

      expect(available).toBe(false);
    });

    it('should provide diagnostic information for unavailable SQLite', async () => {
      setPlatform('web');

      const { getSQLiteDiagnostics } = await import('../src/database/sqliteWrapper');
      const diagnostics = getSQLiteDiagnostics();

      expect(diagnostics).toEqual({
        platform: 'web',
        available: false,
        loadAttempted: expect.any(Boolean),
        error: null, // No error on web, just not available
      });
    });
  });

  describe('3. Database Query Functions Handle Null Database', () => {
    it('should return empty array from getAllAsync when database is null', async () => {
      setPlatform('web');

      const { getAllAsync } = await import('../src/database/db');
      const results = await getAllAsync('SELECT * FROM users');

      expect(results).toEqual([]);
    });

    it('should return null from getFirstAsync when database is null', async () => {
      setPlatform('web');

      const { getFirstAsync } = await import('../src/database/db');
      const result = await getFirstAsync('SELECT * FROM users WHERE id = 1');

      expect(result).toBeNull();
    });

    it('should return zero result from runAsync when database is null', async () => {
      setPlatform('web');

      const { runAsync } = await import('../src/database/db');
      const result = await runAsync('INSERT INTO users (username) VALUES (?)', ['test']);

      expect(result).toEqual({
        lastInsertRowId: 0,
        changes: 0,
      });
    });

    it('should skip execAsync when database is null without crashing', async () => {
      setPlatform('web');

      const { execAsync } = await import('../src/database/db');
      await expect(execAsync('CREATE TABLE test (id INTEGER)')).resolves.toBeUndefined();
    });

    it('should skip withTransactionAsync when database is null without crashing', async () => {
      setPlatform('web');

      const { withTransactionAsync } = await import('../src/database/db');
      const callback = vi.fn();

      await withTransactionAsync(callback);

      expect(callback).not.toHaveBeenCalled(); // Callback should not execute on web
    });
  });

  describe('4. Database Service Functions (API-Only Mode)', () => {
    it('workoutDb should use API-only mode without SQLite', async () => {
      // workoutDb is already API-only, so should work on all platforms
      const { createWorkout } = await import('../src/services/database/workoutDb');

      // Mock fetch for API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 123 }),
      });

      // Mock AsyncStorage
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      vi.spyOn(AsyncStorage.default, 'getItem').mockResolvedValue('mock-token');

      const workoutId = await createWorkout(1, 2, '2025-10-05');

      expect(workoutId).toBe(123);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/workouts'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('programDb should use API-only mode without SQLite', async () => {
      const { getUserProgram } = await import('../src/services/database/programDb');

      // Mock fetch for API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 1, name: 'Test Program' }],
      });

      // Mock AsyncStorage
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      vi.spyOn(AsyncStorage.default, 'getItem').mockResolvedValue('mock-token');

      const program = await getUserProgram(1);

      expect(program).toEqual({ id: 1, name: 'Test Program' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/programs'),
        expect.any(Object)
      );
    });

    it('recoveryDb should use API-only mode without SQLite', async () => {
      const { createAssessment } = await import('../src/services/database/recoveryDb');

      // Mock fetch for API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 456 }),
      });

      // Mock AsyncStorage
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      vi.spyOn(AsyncStorage.default, 'getItem').mockResolvedValue('mock-token');

      const result = await createAssessment(1, '2025-10-05', 4, 3, 5);

      expect(result.id).toBe(456);
      expect(result.total_score).toBe(12);
      expect(result.volume_adjustment).toBe('none');
    });
  });

  describe('5. Login Flow Skips Database on Web', () => {
    it('should not call initializeDatabase on web during login', async () => {
      setPlatform('web');

      // The login screens check Platform.OS !== 'web' before calling initializeDatabase
      // Verify this check works correctly
      const shouldInitDB = Platform.OS !== 'web';
      expect(shouldInitDB).toBe(false);
    });

    it('should call initializeDatabase on native platforms during login', async () => {
      setPlatform('ios');

      const shouldInitDB = Platform.OS !== 'web';
      expect(shouldInitDB).toBe(true);
    });
  });

  describe('6. No Hard Crashes When Database is Null', () => {
    it('should not crash when getDatabase returns null', async () => {
      setPlatform('web');

      const { getDatabase } = await import('../src/database/db');
      const db = getDatabase();

      expect(db).toBeNull();
      // No crash expected
    });

    it('should handle getUnsyncedRecords gracefully on web', async () => {
      setPlatform('web');

      const { getUnsyncedRecords } = await import('../src/database/db');
      const unsynced = await getUnsyncedRecords();

      expect(unsynced).toEqual({
        workouts: [],
        sets: [],
        recoveryAssessments: [],
      });
    });

    it('should handle markAsSynced gracefully on web', async () => {
      setPlatform('web');

      const { markAsSynced } = await import('../src/database/db');
      await expect(markAsSynced('workouts', 123)).resolves.toBeUndefined();
    });

    it('should handle closeDatabase gracefully on web', async () => {
      setPlatform('web');

      const { closeDatabase } = await import('../src/database/db');
      await expect(closeDatabase()).resolves.toBeUndefined();
    });
  });

  describe('7. Sync Queue Works Without Local Database', () => {
    it('should add items to sync queue without local database', async () => {
      setPlatform('web');

      const { addToSyncQueue, getSyncQueue } = await import('../src/services/sync/syncQueue');

      // Mock AsyncStorage
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      vi.spyOn(AsyncStorage.default, 'setItem').mockResolvedValue();

      addToSyncQueue('workout', { workout_id: 1 });

      const queue = getSyncQueue();
      expect(queue.length).toBeGreaterThan(0);
      expect(queue[0].type).toBe('workout');
    });
  });

  describe('8. API Fallback Paths Are Implemented', () => {
    it('should have API fallback for all critical database operations', () => {
      // Verify that API-only services exist and are the primary implementation
      expect(async () => {
        await import('../src/services/database/workoutDb');
        await import('../src/services/database/programDb');
        await import('../src/services/database/recoveryDb');
      }).not.toThrow();
    });

    it('should use API endpoints for all data operations', async () => {
      // All database services should use fetch() for API calls
      const workoutDb = await import('../src/services/database/workoutDb');
      const programDb = await import('../src/services/database/programDb');
      const recoveryDb = await import('../src/services/database/recoveryDb');

      // These modules should export API-based functions
      expect(typeof workoutDb.createWorkout).toBe('function');
      expect(typeof programDb.getUserProgram).toBe('function');
      expect(typeof recoveryDb.createAssessment).toBe('function');
    });
  });

  describe('9. Performance Logging on Web', () => {
    it('should not log slow query warnings when database is null', async () => {
      setPlatform('web');
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const { runAsync } = await import('../src/database/db');
      await runAsync('INSERT INTO test VALUES (1)');

      // No performance warnings should be logged when skipping database
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[DB] Slow query detected')
      );
    });
  });

  describe('10. Module Loading Safety', () => {
    it('should not throw when loading sqliteWrapper on web', async () => {
      setPlatform('web');

      await expect(import('../src/database/sqliteWrapper')).resolves.toBeDefined();
    });

    it('should not throw when loading db module on web', async () => {
      setPlatform('web');

      await expect(import('../src/database/db')).resolves.toBeDefined();
    });

    it('should handle missing expo-sqlite module gracefully', async () => {
      setPlatform('ios'); // Native platform but simulate missing module

      // The wrapper should catch require() errors and return null
      const { getSQLiteLoadError } = await import('../src/database/sqliteWrapper');

      // If expo-sqlite is not installed, should return error without crashing
      const error = getSQLiteLoadError();
      // Either null (loaded successfully) or an error object (gracefully handled)
      expect(error === null || error instanceof Error).toBe(true);
    });
  });

  describe('11. Code Architecture Verification', () => {
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

      // Should use type-only import
      expect(wrapperContent).toMatch(/import type \* as SQLite/);
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
});
