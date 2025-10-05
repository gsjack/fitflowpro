/**
 * Platform-Safe SQLite Wrapper
 *
 * Handles conditional loading of expo-sqlite based on platform:
 * - Native (iOS/Android): Loads expo-sqlite with native bindings
 * - Web: Returns null (no SQLite support)
 *
 * This wrapper prevents bundler errors and runtime crashes when expo-sqlite
 * native modules are unavailable or misconfigured.
 */

import { Platform } from 'react-native';

// Type-only imports (no runtime code)
import type { SQLiteDatabase as SQLiteDB, SQLiteRunResult as SQLiteResult } from 'expo-sqlite';

// Re-export types for consumers
export type SQLiteDatabase = SQLiteDB;
export type SQLiteRunResult = SQLiteResult;

/**
 * Type for the entire expo-sqlite module
 */
type SQLiteModule = {
  openDatabaseAsync: (databaseName: string) => Promise<SQLiteDatabase>;
  // Other module exports
  [key: string]: any;
};

/**
 * Lazy-loaded SQLite module
 * Only loaded on native platforms when actually needed
 */
let sqliteModule: SQLiteModule | null = null;
let loadAttempted = false;
let loadError: Error | null = null;

/**
 * Load expo-sqlite module dynamically
 *
 * Uses require() instead of import to avoid static analysis issues
 * Catches errors gracefully for platforms where native modules don't load
 *
 * @returns expo-sqlite module or null if unavailable
 */
function loadSQLiteModule(): SQLiteModule | null {
  // Skip on web platform
  if (Platform.OS === 'web') {
    console.log('[SQLiteWrapper] Web platform detected - SQLite not available');
    return null;
  }

  // Return cached module if already loaded
  if (loadAttempted) {
    return sqliteModule;
  }

  loadAttempted = true;

  try {
    // Dynamic require to avoid bundler static analysis
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sqliteModule = require('expo-sqlite') as SQLiteModule;

    // iOS-specific validation: Check if native module is actually available
    if (Platform.OS === 'ios') {
      const { NativeModules } = require('react-native');

      // Check for both PascalCase and lowercase variants
      const nativeModule = NativeModules.ExpoSQLiteNext || NativeModules.exposqlitenext;

      if (!nativeModule) {
        const availableModules = Object.keys(NativeModules).filter((key) =>
          key.toLowerCase().includes('sqlite')
        );

        const error = new Error(
          'Native module ExpoSQLiteNext not found in iOS app binary. ' +
            'This means the module was not compiled into the app. ' +
            'See diagnostics below for solutions.'
        );
        loadError = error;
        sqliteModule = null;

        console.error('[SQLiteWrapper] ❌ iOS Native Module Missing');
        console.error('[SQLiteWrapper] Platform:', Platform.OS);
        console.error('[SQLiteWrapper] Error:', error.message);
        console.error(
          '[SQLiteWrapper] Available SQLite modules:',
          availableModules.length > 0 ? availableModules.join(', ') : 'None'
        );
        console.error(
          '[SQLiteWrapper] Total native modules loaded:',
          Object.keys(NativeModules).length
        );
        printIOSSpecificDiagnostics();

        return null;
      }

      // Verify the module has required methods
      if (typeof nativeModule.openDatabaseAsync !== 'function') {
        const error = new Error(
          'ExpoSQLiteNext module found but missing required methods. ' +
            'The module may be incompletely initialized.'
        );
        loadError = error;
        sqliteModule = null;

        console.error('[SQLiteWrapper] ❌ iOS Native Module Incomplete');
        console.error('[SQLiteWrapper] Module object:', Object.keys(nativeModule).join(', '));
        printIOSSpecificDiagnostics();

        return null;
      }

      console.log('[SQLiteWrapper] ✅ iOS Native Module Validated');
      console.log(
        '[SQLiteWrapper] Module name:',
        NativeModules.ExpoSQLiteNext ? 'ExpoSQLiteNext' : 'exposqlitenext'
      );
    }

    console.log('[SQLiteWrapper] ✅ expo-sqlite loaded successfully');
    console.log('[SQLiteWrapper] Platform:', Platform.OS);
    return sqliteModule;
  } catch (error) {
    loadError = error as Error;
    const errorMessage = (error as Error).message || '';

    console.error('[SQLiteWrapper] ❌ Failed to load expo-sqlite');
    console.error('[SQLiteWrapper] Platform:', Platform.OS);
    console.error('[SQLiteWrapper] Error:', errorMessage);

    // Detect specific error patterns for better diagnostics
    const isNativeModuleError =
      errorMessage.includes('exposqlitenext') ||
      errorMessage.includes('ExpoSQLiteNext') ||
      errorMessage.includes('native module');

    // Provide platform-specific diagnostic information
    if (Platform.OS === 'ios') {
      printIOSSpecificDiagnostics();
    } else if (Platform.OS === 'android' && isNativeModuleError) {
      console.error('\n[SQLiteWrapper] Android Native Module Error Detected');
      console.error('[SQLiteWrapper] This usually means:');
      console.error('[SQLiteWrapper]   1. expo-sqlite not properly linked (requires native build)');
      console.error('[SQLiteWrapper]   2. Running in Expo Go (not supported - needs dev build)');
      console.error('[SQLiteWrapper]   3. Native dependencies need rebuilding');
      console.error('[SQLiteWrapper]');
      console.error('[SQLiteWrapper] Solutions:');
      console.error('[SQLiteWrapper]   - Build development build: npx expo run:android');
      console.error('[SQLiteWrapper]   - Clean rebuild: npx expo run:android --no-build-cache');
      console.error('[SQLiteWrapper]   - Check app.json has expo-sqlite plugin configured\n');
    } else if (isNativeModuleError) {
      console.error('\n[SQLiteWrapper] Native module "exposqlitenext" not found.');
      console.error('[SQLiteWrapper] This usually means:');
      console.error('[SQLiteWrapper]   1. Expo modules are not properly configured');
      console.error(
        "[SQLiteWrapper]   2. Native build is required (expo-sqlite doesn't work in Expo Go)"
      );
      console.error(
        '[SQLiteWrapper]   3. Development build needs to be rebuilt after adding expo-sqlite'
      );
      console.error('[SQLiteWrapper]');
      console.error('[SQLiteWrapper] Solution: Run `npx expo prebuild` and rebuild the app\n');
    }

    return null;
  }
}

/**
 * Print iOS-specific diagnostics when native module fails to load
 *
 * Helps developers quickly identify and fix common iOS issues
 */
function printIOSSpecificDiagnostics(): void {
  console.error('\n========================================');
  console.error('iOS expo-sqlite Troubleshooting Guide');
  console.error('========================================\n');

  console.error('Common causes and solutions:\n');

  console.error('1. ❌ Missing expo-sqlite plugin in app.json');
  console.error('   ✅ Solution: Add to app.json:');
  console.error('   {');
  console.error('     "expo": {');
  console.error('       "plugins": [');
  console.error('         "expo-router",');
  console.error('         ["expo-sqlite", { "useSQLCipher": false }]');
  console.error('       ]');
  console.error('     }');
  console.error('   }\n');

  console.error('2. ❌ Running in Expo Go (not supported)');
  console.error('   ✅ Solution: Build a Development Build:');
  console.error('   npx expo run:ios\n');

  console.error('3. ❌ Native project not generated');
  console.error('   ✅ Solution: Run prebuild:');
  console.error('   npx expo prebuild --clean');
  console.error('   npx expo run:ios\n');

  console.error('4. ❌ Stale build cache');
  console.error('   ✅ Solution: Clean rebuild:');
  console.error('   npx expo run:ios --no-build-cache\n');

  console.error('5. ❌ CocoaPods dependencies not installed');
  console.error('   ✅ Solution: Reinstall pods:');
  console.error('   cd ios && pod install && cd ..');
  console.error('   npx expo run:ios\n');

  console.error('For detailed diagnostics, import and run:');
  console.error('  import { printIOSSQLiteDiagnostics } from "@/utils/iosSQLiteDiagnostics";');
  console.error('  printIOSSQLiteDiagnostics();\n');

  console.error('Documentation:');
  console.error('  - /mobile/IOS_SETUP.md');
  console.error('  - /mobile/scripts/README.md');
  console.error('  - https://docs.expo.dev/versions/latest/sdk/sqlite/\n');

  console.error('========================================\n');
}

/**
 * Open a SQLite database
 *
 * @param databaseName Name of the database file
 * @returns Promise resolving to database instance or null if unavailable
 */
export async function openDatabaseAsync(databaseName: string): Promise<SQLiteDatabase | null> {
  const sqlite = loadSQLiteModule();

  if (!sqlite) {
    console.log(`[SQLiteWrapper] Cannot open database "${databaseName}" - SQLite not available`);
    return null;
  }

  try {
    const db = await sqlite.openDatabaseAsync(databaseName);
    console.log(`[SQLiteWrapper] Database "${databaseName}" opened successfully`);
    return db;
  } catch (error) {
    console.error(`[SQLiteWrapper] Failed to open database "${databaseName}":`, error);
    throw error;
  }
}

/**
 * Check if SQLite is available on current platform
 *
 * @returns true if expo-sqlite loaded successfully
 */
export function isSQLiteAvailable(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  if (!loadAttempted) {
    loadSQLiteModule();
  }

  return sqliteModule !== null;
}

/**
 * Get the error that occurred during SQLite module loading (if any)
 *
 * @returns Error object or null if no error
 */
export function getSQLiteLoadError(): Error | null {
  if (!loadAttempted) {
    loadSQLiteModule();
  }

  return loadError;
}

/**
 * Get detailed diagnostic information about SQLite availability
 *
 * @returns Object with platform info and availability status
 */
export function getSQLiteDiagnostics(): {
  platform: string;
  available: boolean;
  loadAttempted: boolean;
  error: string | null;
} {
  return {
    platform: Platform.OS,
    available: isSQLiteAvailable(),
    loadAttempted,
    error: loadError ? loadError.message : null,
  };
}
