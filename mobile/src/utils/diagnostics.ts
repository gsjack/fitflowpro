/**
 * Application Diagnostics Utilities
 *
 * Helper functions to check system status and diagnose issues
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSQLiteDiagnostics, isSQLiteAvailable } from '../database/sqliteWrapper';

export interface SystemDiagnostics {
  platform: {
    os: string;
    version: string;
  };
  expo: {
    version: string;
    appVersion: string;
    buildNumber: string;
  };
  database: {
    available: boolean;
    platform: string;
    loadAttempted: boolean;
    error: string | null;
  };
  features: {
    offlineMode: boolean;
    backgroundSync: boolean;
    localStorage: boolean;
  };
}

/**
 * Get comprehensive system diagnostics
 *
 * Useful for troubleshooting and support
 */
export function getSystemDiagnostics(): SystemDiagnostics {
  const sqliteDiagnostics = getSQLiteDiagnostics();
  const sqliteAvailable = isSQLiteAvailable();

  return {
    platform: {
      os: Platform.OS,
      version: Platform.Version?.toString() || 'unknown',
    },
    expo: {
      version: Constants.expoConfig?.sdkVersion || 'unknown',
      appVersion: Constants.expoConfig?.version || '1.0.0',
      buildNumber:
        Constants.expoConfig?.ios?.buildNumber ||
        Constants.expoConfig?.android?.versionCode?.toString() ||
        '1',
    },
    database: {
      available: sqliteAvailable,
      platform: sqliteDiagnostics.platform,
      loadAttempted: sqliteDiagnostics.loadAttempted,
      error: sqliteDiagnostics.error,
    },
    features: {
      offlineMode: sqliteAvailable,
      backgroundSync: sqliteAvailable,
      localStorage: sqliteAvailable,
    },
  };
}

/**
 * Log system diagnostics to console
 *
 * Formatted output for debugging
 */
export function logSystemDiagnostics(): void {
  const diagnostics = getSystemDiagnostics();

  console.log('=== FitFlow System Diagnostics ===');
  console.log('');
  console.log('Platform:');
  console.log(`  OS: ${diagnostics.platform.os} ${diagnostics.platform.version}`);
  console.log('');
  console.log('Expo:');
  console.log(`  SDK Version: ${diagnostics.expo.version}`);
  console.log(`  App Version: ${diagnostics.expo.appVersion} (${diagnostics.expo.buildNumber})`);
  console.log('');
  console.log('Database:');
  console.log(`  SQLite Available: ${diagnostics.database.available ? '✅ YES' : '❌ NO'}`);
  console.log(`  Platform: ${diagnostics.database.platform}`);
  console.log(`  Load Attempted: ${diagnostics.database.loadAttempted}`);
  if (diagnostics.database.error) {
    console.log(`  Error: ${diagnostics.database.error}`);
  }
  console.log('');
  console.log('Features:');
  console.log(
    `  Offline Mode: ${diagnostics.features.offlineMode ? '✅ Enabled' : '❌ Disabled (API-only)'}`
  );
  console.log(
    `  Background Sync: ${diagnostics.features.backgroundSync ? '✅ Enabled' : '❌ Disabled'}`
  );
  console.log(
    `  Local Storage: ${diagnostics.features.localStorage ? '✅ Enabled' : '❌ Disabled'}`
  );
  console.log('');
  console.log('==================================');
}

/**
 * Get user-friendly status message
 *
 * Provides actionable information about app capabilities
 */
export function getStatusMessage(): string {
  const diagnostics = getSystemDiagnostics();

  if (diagnostics.database.available) {
    return '✅ Full offline mode enabled. All features available.';
  }

  if (diagnostics.platform.os === 'web') {
    return 'ℹ️  Running in web mode. Using API-only (no offline storage).';
  }

  if (diagnostics.database.error?.includes('exposqlitenext')) {
    return '⚠️  Native modules not found. Rebuild app with: npx expo prebuild && npx expo run:ios';
  }

  return '⚠️  Running in API-only mode. Offline features disabled.';
}

/**
 * Check if app is running in development build
 */
export function isDevelopmentBuild(): boolean {
  return Constants.appOwnership === 'expo' || __DEV__;
}

/**
 * Check if app is running in Expo Go
 */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Get recommended actions for current configuration
 */
export function getRecommendedActions(): string[] {
  const diagnostics = getSystemDiagnostics();
  const actions: string[] = [];

  if (!diagnostics.database.available && diagnostics.platform.os !== 'web') {
    if (isExpoGo()) {
      actions.push('Create a development build for full offline support:');
      actions.push('  1. Run: npx expo prebuild');
      actions.push('  2. Run: npx expo run:ios (or run:android)');
    } else if (diagnostics.database.error) {
      actions.push('Rebuild the app to fix SQLite native module:');
      actions.push('  1. Run: npx expo prebuild --clean');
      actions.push('  2. Run: npx expo run:ios (or run:android)');
    }
  }

  if (diagnostics.platform.os === 'web') {
    actions.push('Web platform does not support offline mode (by design)');
    actions.push('For offline features, use the mobile app');
  }

  if (actions.length === 0) {
    actions.push('No actions needed - all features working correctly');
  }

  return actions;
}
