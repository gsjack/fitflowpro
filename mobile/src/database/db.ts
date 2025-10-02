/**
 * Mobile SQLite Database Initialization
 *
 * Provides:
 * - Database connection with expo-sqlite
 * - Schema initialization on first launch
 * - Typed query functions for common operations
 * - Database migration support
 *
 * Performance targets:
 * - Write latency: p95 < 5ms, p99 < 10ms
 * - Offline-first: All writes succeed locally, sync in background
 */

import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DATABASE_SCHEMA } from './schema';

// Database configuration
const DATABASE_NAME = 'fitflow.db';
const SCHEMA_VERSION = 1;

// Type definitions for common query results
export interface User {
  id: number;
  username: string;
  password_hash: string;
  age?: number;
  weight_kg?: number;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  created_at: number;
  updated_at: number;
}

export interface Exercise {
  id: number;
  name: string;
  muscle_groups: string; // JSON array
  equipment: string;
  difficulty: string;
  default_sets: number;
  default_reps: string;
  default_rir: number;
  notes?: string;
}

export interface ProgramExercise {
  id: number;
  program_day_id: number;
  exercise_id: number;
  exercise_name: string;
  order_index: number;
  sets: number;
  reps: string;
  rir: number;
}

export interface Workout {
  id: number;
  user_id: number;
  program_day_id: number;
  date: string; // ISO format YYYY-MM-DD
  started_at?: number;
  completed_at?: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  total_volume_kg?: number;
  average_rir?: number;
  synced: number; // 0 = pending sync, 1 = synced
  day_name?: string | null; // Program day name from API (e.g., "Push A (Chest-Focused)")
  day_type?: 'strength' | 'vo2max' | null; // Program day type from API
  exercises?: ProgramExercise[]; // Exercise details from API
}

export interface Set {
  id: number;
  workout_id: number;
  exercise_id: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  rir: number; // 0-4 scale
  timestamp: number;
  notes?: string;
  synced: number;
}

export interface RecoveryAssessment {
  id: number;
  user_id: number;
  date: string;
  sleep_quality: number; // 1-5 scale
  muscle_soreness: number; // 1-5 scale
  mental_motivation: number; // 1-5 scale
  total_score: number; // 3-15 range
  volume_adjustment?: 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day';
  timestamp: number;
  synced: number;
}

export interface ActiveSession {
  user_id: number;
  workout_id: number;
  current_exercise_index: number;
  started_at: number;
  last_activity_at: number;
  state: string; // JSON blob
}

// Database instance (singleton)
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database connection and run schema if needed
 *
 * NOTE: Returns null on web platform (expo-sqlite not available on web)
 * Web uses API-only mode without local database
 *
 * @returns Promise resolving to database instance (native) or null (web)
 */
export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  // Skip database on web - expo-sqlite throws "Unimplemented" error
  if (Platform.OS === 'web') {
    console.log('[DB] Web platform - using API-only mode (no local SQLite)');
    return null;
  }

  if (db) {
    return db;
  }

  try {
    // Open database connection
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Check if schema is initialized
    const isInitialized = await checkSchemaInitialized(db);

    if (!isInitialized) {
      console.log('[DB] Initializing database schema...');
      await db.execAsync(DATABASE_SCHEMA);
      await setSchemaVersion(db, SCHEMA_VERSION);
      console.log('[DB] Database schema initialized successfully');

      // Seed exercises on first init
      const { seedExercises } = await import('./seedExercises');
      const count = await seedExercises();
      console.log(`[DB] Seeded ${count} exercises`);
    } else {
      console.log('[DB] Database already initialized');

      // Check for migrations
      const currentVersion = await getSchemaVersion(db);
      if (currentVersion < SCHEMA_VERSION) {
        console.log(`[DB] Migrating from version ${currentVersion} to ${SCHEMA_VERSION}`);
        await migrateDatabase(db, currentVersion, SCHEMA_VERSION);
      }
    }

    return db;
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    throw new Error('Database initialization failed');
  }
}

/**
 * Get the current database instance
 * @returns Database instance or null if not initialized
 */
export function getDatabase(): SQLite.SQLiteDatabase | null {
  return db;
}

/**
 * Check if the database schema has been initialized
 * @param database Database instance
 * @returns Promise resolving to true if initialized
 */
async function checkSchemaInitialized(database: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const result = await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='users'"
    );
    return (result?.count ?? 0) > 0;
  } catch (error) {
    console.error('[DB] Error checking schema initialization:', error);
    return false;
  }
}

/**
 * Get the current schema version from metadata
 * @param database Database instance
 * @returns Promise resolving to schema version number
 */
async function getSchemaVersion(database: SQLite.SQLiteDatabase): Promise<number> {
  try {
    // Create metadata table if it doesn't exist
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS _metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const result = await database.getFirstAsync<{ value: string }>(
      "SELECT value FROM _metadata WHERE key = 'schema_version'"
    );

    return result ? parseInt(result.value, 10) : 0;
  } catch (error) {
    console.error('[DB] Error getting schema version:', error);
    return 0;
  }
}

/**
 * Set the schema version in metadata
 * @param database Database instance
 * @param version Schema version number
 */
async function setSchemaVersion(database: SQLite.SQLiteDatabase, version: number): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS _metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await database.runAsync('INSERT OR REPLACE INTO _metadata (key, value) VALUES (?, ?)', [
    'schema_version',
    version.toString(),
  ]);
}

/**
 * Migrate database from one version to another
 * @param database Database instance
 * @param fromVersion Current version
 * @param toVersion Target version
 */
async function migrateDatabase(
  database: SQLite.SQLiteDatabase,
  fromVersion: number,
  toVersion: number
): Promise<void> {
  console.log(`[DB] Running migrations from v${fromVersion} to v${toVersion}`);

  // Migration logic will be added here as schema evolves
  // Example:
  // if (fromVersion < 2) {
  //   await database.execAsync('ALTER TABLE users ADD COLUMN new_field TEXT;');
  // }

  await setSchemaVersion(database, toVersion);
  console.log('[DB] Migrations completed successfully');
}

/**
 * Execute a query and return all results
 * @param query SQL query string
 * @param params Query parameters
 * @returns Promise resolving to array of result rows
 */
export async function getAllAsync<T>(query: string, params?: any[]): Promise<T[]> {
  const database = await initializeDatabase();
  if (!database) {
    console.log('[DB] getAllAsync called on web - returning empty array');
    return [];
  }
  return database.getAllAsync<T>(query, params ?? []);
}

/**
 * Execute a query and return the first result
 * @param query SQL query string
 * @param params Query parameters
 * @returns Promise resolving to first result row or null
 */
export async function getFirstAsync<T>(query: string, params?: any[]): Promise<T | null> {
  const database = await initializeDatabase();
  if (!database) {
    console.log('[DB] getFirstAsync called on web - returning null');
    return null;
  }
  return database.getFirstAsync<T>(query, params ?? []);
}

/**
 * Execute a write query (INSERT, UPDATE, DELETE)
 * @param query SQL query string
 * @param params Query parameters
 * @returns Promise resolving to result with lastInsertRowId and changes
 */
export async function runAsync(query: string, params?: any[]): Promise<SQLite.SQLiteRunResult> {
  const database = await initializeDatabase();

  if (!database) {
    console.log('[DB] runAsync called on web - skipping database write');
    return { lastInsertRowId: 0, changes: 0 };
  }

  // Performance monitoring for write operations
  const startTime = Date.now();
  const result = await database.runAsync(query, params ?? []);
  const duration = Date.now() - startTime;

  // Warn if write exceeds performance target
  if (duration > 5) {
    console.warn(`[DB] Slow query detected: ${duration}ms (target: < 5ms)`);
    console.warn(`[DB] Query: ${query.substring(0, 100)}...`);
  }

  return result;
}

/**
 * Execute raw SQL (use with caution)
 * @param sql SQL statements to execute
 */
export async function execAsync(sql: string): Promise<void> {
  const database = await initializeDatabase();
  if (!database) {
    console.log('[DB] execAsync called on web - skipping database operation');
    return;
  }
  await database.execAsync(sql);
}

/**
 * Execute a transaction with multiple queries
 * @param callback Transaction callback function
 */
export async function withTransactionAsync(
  callback: (tx: SQLite.SQLiteDatabase) => Promise<void>
): Promise<void> {
  const database = await initializeDatabase();

  if (!database) {
    console.log('[DB] withTransactionAsync called on web - skipping transaction');
    return;
  }

  try {
    await database.execAsync('BEGIN TRANSACTION;');
    await callback(database);
    await database.execAsync('COMMIT;');
  } catch (error) {
    await database.execAsync('ROLLBACK;');
    throw error;
  }
}

/**
 * Get all unsynced records for background sync
 * @returns Promise resolving to object with unsynced records by type
 */
export async function getUnsyncedRecords(): Promise<{
  workouts: Workout[];
  sets: Set[];
  recoveryAssessments: RecoveryAssessment[];
}> {
  const [workouts, sets, recoveryAssessments] = await Promise.all([
    getAllAsync<Workout>('SELECT * FROM workouts WHERE synced = 0'),
    getAllAsync<Set>('SELECT * FROM sets WHERE synced = 0'),
    getAllAsync<RecoveryAssessment>('SELECT * FROM recovery_assessments WHERE synced = 0'),
  ]);

  return { workouts, sets, recoveryAssessments };
}

/**
 * Mark a record as synced
 * @param table Table name
 * @param id Record ID
 */
export async function markAsSynced(table: string, id: number): Promise<void> {
  await runAsync(`UPDATE ${table} SET synced = 1 WHERE id = ?`, [id]);
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('[DB] Database connection closed');
  }
}

// Export initialized database for direct use if needed
export { db };
