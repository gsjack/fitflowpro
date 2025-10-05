/**
 * Web shim for expo-sqlite
 * This file prevents expo-sqlite from being bundled on web platform
 * SQLite functionality is not available in browser environments
 */

// Export empty object to satisfy imports
export default {};

// Export common expo-sqlite functions as no-ops
export const openDatabaseAsync = () => {
  throw new Error('SQLite is not available on web platform');
};

export const openDatabaseSync = () => {
  throw new Error('SQLite is not available on web platform');
};

export const deleteDatabaseAsync = () => {
  throw new Error('SQLite is not available on web platform');
};

export const deleteDatabaseSync = () => {
  throw new Error('SQLite is not available on web platform');
};
