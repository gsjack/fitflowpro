/**
 * Backend Database Initialization
 *
 * Initializes better-sqlite3 with performance optimizations:
 * - WAL mode for concurrent reads
 * - 64MB cache for query performance
 * - 256MB memory-mapped I/O
 * - Prepared statements for common queries
 */

import Database, { Statement } from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this module file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path - from dist/database to backend root
const DB_PATH = join(__dirname, '../../data/fitflow.db');
const SCHEMA_PATH = join(__dirname, '../../src/database/schema.sql');

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize database
export const db: Database.Database = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Apply performance optimizations
db.pragma('journal_mode = WAL');
db.pragma('cache_size = -64000'); // 64MB cache
db.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O
db.pragma('foreign_keys = ON');

// Initialize schema on first run
const initializeSchema = (): void => {
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('Database schema initialized');
};

// Check if database is initialized (check for users table)
const isInitialized = (): boolean => {
  try {
    const result = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      )
      .get();
    return !!result;
  } catch {
    return false;
  }
};

// Initialize if needed
if (!isInitialized()) {
  initializeSchema();
}

// ============================================================================
// Prepared Statements (Common Queries)
// ============================================================================

// User Operations
export const stmtGetUserByUsername: Statement = db.prepare(
  'SELECT * FROM users WHERE username = ?'
);

export const stmtGetUserById: Statement = db.prepare('SELECT * FROM users WHERE id = ?');

export const stmtCreateUser: Statement = db.prepare(`
  INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

export const stmtDeleteUser: Statement = db.prepare('DELETE FROM users WHERE id = ?');

// Workout Operations
export const stmtCreateWorkout: Statement = db.prepare(`
  INSERT INTO workouts (user_id, program_day_id, date, status, synced)
  VALUES (?, ?, ?, 'not_started', 1)
`);

export const stmtGetWorkoutsByUser: Statement = db.prepare(`
  SELECT w.*, pd.day_name, pd.day_type
  FROM workouts w
  LEFT JOIN program_days pd ON w.program_day_id = pd.id
  WHERE w.user_id = ?
  ORDER BY w.date DESC
`);

export const stmtGetWorkoutsByUserDateRange: Statement = db.prepare(`
  SELECT w.*, pd.day_name, pd.day_type
  FROM workouts w
  LEFT JOIN program_days pd ON w.program_day_id = pd.id
  WHERE w.user_id = ? AND w.date >= ? AND w.date <= ?
  ORDER BY w.date DESC
`);

export const stmtUpdateWorkoutStatus: Statement = db.prepare(`
  UPDATE workouts
  SET status = ?, completed_at = ?, total_volume_kg = ?, average_rir = ?
  WHERE id = ?
`);

// Set Operations
export const stmtLogSet: Statement = db.prepare(`
  INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, notes, synced)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
`);

export const stmtGetSetsByWorkout: Statement = db.prepare(`
  SELECT s.*, e.name as exercise_name
  FROM sets s
  JOIN exercises e ON s.exercise_id = e.id
  WHERE s.workout_id = ?
  ORDER BY s.set_number
`);

export const stmtGetSetByLocalId: Statement = db.prepare(`
  SELECT * FROM sets WHERE id = ? AND workout_id = ?
`);

export const stmtGetUnsyncedSets: Statement = db.prepare(`
  SELECT * FROM sets WHERE synced = 0 LIMIT ?
`);

export const stmtMarkSetSynced: Statement = db.prepare(`
  UPDATE sets SET synced = 1 WHERE id = ?
`);

// Recovery Assessment Operations
export const stmtCreateRecoveryAssessment: Statement = db.prepare(`
  INSERT INTO recovery_assessments (
    user_id, date, sleep_quality, muscle_soreness, mental_motivation,
    total_score, volume_adjustment, timestamp, synced
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
`);

export const stmtGetRecoveryAssessmentByDate: Statement = db.prepare(`
  SELECT * FROM recovery_assessments
  WHERE user_id = ? AND date = ?
`);

// VO2max Session Operations
export const stmtCreateVO2maxSession: Statement = db.prepare(`
  INSERT INTO vo2max_sessions (
    workout_id, protocol, duration_seconds, intervals_completed,
    average_hr, peak_hr, estimated_vo2max, synced
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
`);

export const stmtGetVO2maxSessionByWorkout: Statement = db.prepare(`
  SELECT * FROM vo2max_sessions WHERE workout_id = ?
`);

// Analytics Queries
export const stmt1RMProgression: Statement = db.prepare(`
  SELECT
    w.date,
    MAX(s.weight_kg * (1 + (s.reps - s.rir) / 30.0)) as estimated_1rm
  FROM sets s
  JOIN workouts w ON s.workout_id = w.id
  WHERE w.user_id = ? AND s.exercise_id = ? AND w.date >= ? AND w.date <= ?
  GROUP BY w.date
  ORDER BY w.date
`);

export const stmtVolumeTrends: Statement = db.prepare(`
  SELECT
    strftime('%Y-%W', w.date) as week,
    COUNT(s.id) as total_sets
  FROM sets s
  JOIN workouts w ON s.workout_id = w.id
  JOIN exercises e ON s.exercise_id = e.id
  WHERE w.user_id = ?
    AND w.date >= ? AND w.date <= ?
    AND e.muscle_groups LIKE '%' || ? || '%'
  GROUP BY week
  ORDER BY week
`);

export const stmtConsistencyMetrics: Statement = db.prepare(`
  SELECT
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_workouts,
    COUNT(*) as total_workouts,
    AVG(CASE WHEN completed_at IS NOT NULL THEN completed_at - started_at END) as avg_session_duration
  FROM workouts
  WHERE user_id = ?
`);

// Active Session Operations
export const stmtGetActiveSession: Statement = db.prepare(`
  SELECT * FROM active_sessions WHERE user_id = ?
`);

export const stmtCreateActiveSession: Statement = db.prepare(`
  INSERT OR REPLACE INTO active_sessions (
    user_id, workout_id, current_exercise_index, started_at, last_activity_at, state
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

export const stmtUpdateActiveSession: Statement = db.prepare(`
  UPDATE active_sessions
  SET current_exercise_index = ?, last_activity_at = ?, state = ?
  WHERE user_id = ?
`);

export const stmtDeleteActiveSession: Statement = db.prepare(`
  DELETE FROM active_sessions WHERE user_id = ?
`);

// Audit Log Operations
export const stmtCreateAuditLog: Statement = db.prepare(`
  INSERT INTO audit_logs (user_id, event_type, ip_address, timestamp, details)
  VALUES (?, ?, ?, ?, ?)
`);

export const stmtGetAuditLogsByUser: Statement = db.prepare(`
  SELECT * FROM audit_logs
  WHERE user_id = ?
  ORDER BY timestamp DESC
  LIMIT ?
`);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate estimated 1RM using Epley formula with RIR adjustment
 * Formula: 1RM = weight × (1 + (reps - rir) / 30)
 */
export const calculateOneRepMax = (
  weight: number,
  reps: number,
  rir: number
): number => {
  return weight * (1 + (reps - rir) / 30);
};

/**
 * Calculate recovery score auto-regulation adjustment
 * Ranges: 12-15 = none, 9-11 = reduce_1_set, 6-8 = reduce_2_sets, 3-5 = rest_day
 */
export const calculateVolumeAdjustment = (
  totalScore: number
): 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day' => {
  if (totalScore >= 12) return 'none';
  if (totalScore >= 9) return 'reduce_1_set';
  if (totalScore >= 6) return 'reduce_2_sets';
  return 'rest_day';
};

/**
 * Execute query with performance timing
 */
export const executeWithTiming = <T>(
  name: string,
  fn: () => T
): T => {
  const start = Date.now();
  const result = fn();
  const duration = Date.now() - start;

  if (duration > 5) {
    console.warn(
      `[PERFORMANCE WARNING] Query "${name}" took ${duration}ms (target: <5ms)`
    );
  }

  return result;
};

// ============================================================================
// Transaction Helpers
// ============================================================================

/**
 * Execute function within transaction
 */
export const transaction = <T>(fn: () => T): T => {
  return db.transaction(fn)();
};

/**
 * Batch insert with transaction
 */
export const batchInsert = <T>(
  stmt: Database.Statement,
  records: T[]
): void => {
  const insert = db.transaction((items: T[]) => {
    for (const item of items) {
      stmt.run(item);
    }
  });

  insert(records);
};

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Close database connection
 */
export const closeDatabase = (): void => {
  db.close();
  console.log('Database connection closed');
};

// Handle process termination
process.on('exit', () => {
  closeDatabase();
});

process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

export default db;
