/**
 * iOS-Specific SQLite Diagnostics
 *
 * Provides enhanced diagnostics for expo-sqlite on iOS, helping identify
 * native module loading issues and configuration problems.
 *
 * Common issues addressed:
 * - "Cannot find native module 'ExpoSQLiteNext'" error
 * - Development build vs Expo Go detection
 * - Plugin configuration validation
 * - Native module linking status
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface IOSSQLiteDiagnostics {
  platform: string;
  platformVersion: string;
  isExpoGo: boolean;
  isDevelopmentBuild: boolean;
  expoVersion: string;
  sqliteModuleAvailable: boolean;
  nativeModuleStatus: 'not_loaded' | 'loading' | 'loaded' | 'error';
  error: string | null;
  recommendations: string[];
}

/**
 * Detect if running in Expo Go vs Development Build
 *
 * Expo Go does NOT support expo-sqlite (missing native module)
 * Development Build includes all native modules
 */
function detectBuildType(): {
  isExpoGo: boolean;
  isDevelopmentBuild: boolean;
} {
  // Check for expo-dev-client indicators
  const isDevelopmentBuild =
    Constants.appOwnership === 'expo' && Boolean((Constants.expoConfig as any)?.sdkVersion);

  // Expo Go has appOwnership === 'expo' but no custom native modules
  const isExpoGo = Constants.appOwnership === 'expo' && !isDevelopmentBuild;

  return { isExpoGo, isDevelopmentBuild };
}

/**
 * Check if expo-sqlite native module can be loaded
 *
 * Tests both the module import and native bridge availability
 */
function checkSQLiteModuleAvailability(): {
  available: boolean;
  status: 'not_loaded' | 'loading' | 'loaded' | 'error';
  error: string | null;
} {
  try {
    // Attempt to require expo-sqlite
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require('expo-sqlite');

    // Check if the native module is actually available
    if (!SQLite || typeof SQLite.openDatabaseAsync !== 'function') {
      return {
        available: false,
        status: 'error',
        error: 'expo-sqlite module loaded but openDatabaseAsync not available',
      };
    }

    // Try to detect native module bridge
    // @ts-expect-error - Accessing internal module registry
    const NativeModules = require('react-native').NativeModules;

    if (!NativeModules.ExpoSQLiteNext) {
      return {
        available: false,
        status: 'error',
        error: 'Native module ExpoSQLiteNext not found in NativeModules registry',
      };
    }

    return {
      available: true,
      status: 'loaded',
      error: null,
    };
  } catch (error) {
    return {
      available: false,
      status: 'error',
      error: (error as Error).message,
    };
  }
}

/**
 * Generate actionable recommendations based on diagnostics
 */
function generateRecommendations(diagnostics: {
  isExpoGo: boolean;
  isDevelopmentBuild: boolean;
  sqliteModuleAvailable: boolean;
  nativeModuleStatus: string;
  error: string | null;
}): string[] {
  const recommendations: string[] = [];

  // Platform check
  if (Platform.OS !== 'ios') {
    recommendations.push(
      '⚠️ This diagnostic is designed for iOS. Current platform: ' + Platform.OS
    );
  }

  // Expo Go detection
  if (diagnostics.isExpoGo) {
    recommendations.push('❌ CRITICAL: Running in Expo Go - expo-sqlite is NOT supported');
    recommendations.push('✅ Solution: Build a Development Build with: npx expo run:ios');
    recommendations.push('📚 See: /mobile/IOS_SETUP.md for detailed instructions');
    return recommendations; // No point checking further
  }

  // Development build checks
  if (!diagnostics.isDevelopmentBuild) {
    recommendations.push('⚠️ Cannot detect Development Build environment');
    recommendations.push('✅ Ensure you built the app with: npx expo run:ios or EAS Build');
  }

  // Module availability checks
  if (!diagnostics.sqliteModuleAvailable) {
    if (diagnostics.error?.includes('ExpoSQLiteNext not found')) {
      recommendations.push('❌ Native module ExpoSQLiteNext not found in app binary');
      recommendations.push('✅ Solution 1: Add expo-sqlite plugin to app.json:');
      recommendations.push(
        '   "plugins": ["expo-router", ["expo-sqlite", { "useSQLCipher": false }]]'
      );
      recommendations.push('✅ Solution 2: Run npx expo prebuild to regenerate native project');
      recommendations.push('✅ Solution 3: Rebuild app with: npx expo run:ios --no-build-cache');
    } else if (diagnostics.error?.includes('openDatabaseAsync not available')) {
      recommendations.push('❌ expo-sqlite module exists but API is missing');
      recommendations.push('✅ Update expo-sqlite: npx expo install expo-sqlite@latest');
    } else {
      recommendations.push('❌ expo-sqlite failed to load: ' + diagnostics.error);
      recommendations.push('✅ Clear cache and reinstall: rm -rf node_modules && npm install');
      recommendations.push('✅ Clear Metro cache: npx expo start --clear');
    }
  } else {
    recommendations.push('✅ expo-sqlite is correctly configured and available');
  }

  return recommendations;
}

/**
 * Run comprehensive iOS SQLite diagnostics
 *
 * Use this to troubleshoot "Cannot find native module ExpoSQLiteNext" errors
 *
 * @returns Detailed diagnostic report with actionable recommendations
 */
export function runIOSSQLiteDiagnostics(): IOSSQLiteDiagnostics {
  const { isExpoGo, isDevelopmentBuild } = detectBuildType();
  const { available, status, error } = checkSQLiteModuleAvailability();

  const diagnostics = {
    platform: Platform.OS,
    platformVersion: Platform.Version.toString(),
    isExpoGo,
    isDevelopmentBuild,
    expoVersion: Constants.expoVersion || 'unknown',
    sqliteModuleAvailable: available,
    nativeModuleStatus: status,
    error,
    recommendations: [],
  };

  diagnostics.recommendations = generateRecommendations(diagnostics);

  return diagnostics;
}

/**
 * Print diagnostics to console in readable format
 */
export function printIOSSQLiteDiagnostics(): void {
  const diagnostics = runIOSSQLiteDiagnostics();

  console.log('\n========================================');
  console.log('iOS SQLite Diagnostics Report');
  console.log('========================================\n');

  console.log('Environment:');
  console.log(`  Platform: ${diagnostics.platform} ${diagnostics.platformVersion}`);
  console.log(`  Expo Version: ${diagnostics.expoVersion}`);
  console.log(
    `  Build Type: ${diagnostics.isExpoGo ? 'Expo Go' : diagnostics.isDevelopmentBuild ? 'Development Build' : 'Unknown'}`
  );

  console.log('\nSQLite Status:');
  console.log(`  Module Available: ${diagnostics.sqliteModuleAvailable ? '✅ Yes' : '❌ No'}`);
  console.log(`  Native Module: ${diagnostics.nativeModuleStatus}`);
  if (diagnostics.error) {
    console.log(`  Error: ${diagnostics.error}`);
  }

  console.log('\nRecommendations:');
  diagnostics.recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. ${rec}`);
  });

  console.log('\n========================================\n');
}

/**
 * Async wrapper to check if SQLite can actually open a database
 *
 * This goes beyond module detection to test actual functionality
 */
export async function testSQLiteConnection(): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require('expo-sqlite');

    // Try to open a test database
    const db = await SQLite.openDatabaseAsync(':memory:');

    // Try to execute a simple query
    await db.execAsync('CREATE TABLE test (id INTEGER PRIMARY KEY);');

    // Clean up
    await db.closeAsync();

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Run full diagnostic suite including connection test
 */
export async function runFullDiagnostics(): Promise<void> {
  printIOSSQLiteDiagnostics();

  console.log('Running SQLite connection test...\n');

  const { success, error } = await testSQLiteConnection();

  if (success) {
    console.log('✅ SQLite connection test PASSED');
    console.log('   Database can be opened and queried successfully\n');
  } else {
    console.log('❌ SQLite connection test FAILED');
    console.log(`   Error: ${error}\n`);
  }
}
