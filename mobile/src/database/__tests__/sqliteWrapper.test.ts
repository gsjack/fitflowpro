/**
 * Tests for Platform-Safe SQLite Wrapper
 *
 * Validates that the wrapper correctly:
 * - Detects platform (iOS/Android/Web)
 * - Loads expo-sqlite only on native platforms
 * - Provides graceful fallback for web
 * - Handles loading errors gracefully
 */

import { describe, it, expect } from 'vitest';
import { Platform } from 'react-native';
import { isSQLiteAvailable, getSQLiteLoadError, getSQLiteDiagnostics } from '../sqliteWrapper';

describe('SQLite Wrapper', () => {
  describe('Platform Detection', () => {
    it('should detect web platform and return false for availability', () => {
      // Mock web platform
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

      const available = isSQLiteAvailable();

      expect(available).toBe(false);

      // Restore original OS
      Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
    });

    it('should provide diagnostics about platform and availability', () => {
      const diagnostics = getSQLiteDiagnostics();

      expect(diagnostics).toHaveProperty('platform');
      expect(diagnostics).toHaveProperty('available');
      expect(diagnostics).toHaveProperty('loadAttempted');
      expect(diagnostics).toHaveProperty('error');

      // Platform should be one of: ios, android, web
      expect(['ios', 'android', 'web']).toContain(diagnostics.platform);

      // Available should be boolean
      expect(typeof diagnostics.available).toBe('boolean');

      // LoadAttempted should be boolean
      expect(typeof diagnostics.loadAttempted).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should return null for load error if SQLite loaded successfully', () => {
      const error = getSQLiteLoadError();

      // If on native platform and expo-sqlite is properly configured, error should be null
      // If on web platform, error should be null (web doesn't attempt to load)
      // Only if native module load fails should we have an error
      if (Platform.OS === 'web' || isSQLiteAvailable()) {
        expect(error).toBeNull();
      }
    });

    it('should provide error details if SQLite loading failed', () => {
      if (!isSQLiteAvailable() && Platform.OS !== 'web') {
        const error = getSQLiteLoadError();

        expect(error).not.toBeNull();
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toBeDefined();
      }
    });
  });

  describe('Graceful Degradation', () => {
    it('should not throw errors when checking availability', () => {
      expect(() => isSQLiteAvailable()).not.toThrow();
      expect(() => getSQLiteLoadError()).not.toThrow();
      expect(() => getSQLiteDiagnostics()).not.toThrow();
    });
  });
});
