import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../data/fitflow.db');
const SCHEMA_PATH = join(__dirname, '../../src/database/schema.sql');
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
}
export const db = new Database(DB_PATH, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});
db.pragma('journal_mode = WAL');
db.pragma('cache_size = -64000');
db.pragma('mmap_size = 268435456');
db.pragma('foreign_keys = ON');
const initializeSchema = () => {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    console.log('Database schema initialized');
};
const isInitialized = () => {
    try {
        const result = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            .get();
        return !!result;
    }
    catch {
        return false;
    }
};
if (!isInitialized()) {
    initializeSchema();
}
export const stmtGetUserByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
export const stmtGetUserById = db.prepare('SELECT * FROM users WHERE id = ?');
export const stmtCreateUser = db.prepare(`
  INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
export const stmtDeleteUser = db.prepare('DELETE FROM users WHERE id = ?');
export const stmtCreateWorkout = db.prepare(`
  INSERT INTO workouts (user_id, program_day_id, date, status, synced)
  VALUES (?, ?, ?, 'not_started', 1)
`);
export const stmtGetWorkoutsByUser = db.prepare(`
  SELECT w.*, pd.day_name, pd.day_type
  FROM workouts w
  LEFT JOIN program_days pd ON w.program_day_id = pd.id
  WHERE w.user_id = ?
  ORDER BY w.date DESC
`);
export const stmtGetWorkoutsByUserDateRange = db.prepare(`
  SELECT w.*, pd.day_name, pd.day_type
  FROM workouts w
  LEFT JOIN program_days pd ON w.program_day_id = pd.id
  WHERE w.user_id = ? AND w.date >= ? AND w.date <= ?
  ORDER BY w.date DESC
`);
export const stmtUpdateWorkoutStatus = db.prepare(`
  UPDATE workouts
  SET status = ?, completed_at = ?, total_volume_kg = ?, average_rir = ?
  WHERE id = ?
`);
export const stmtLogSet = db.prepare(`
  INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, notes, synced)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
`);
export const stmtGetSetsByWorkout = db.prepare(`
  SELECT s.*, e.name as exercise_name
  FROM sets s
  JOIN exercises e ON s.exercise_id = e.id
  WHERE s.workout_id = ?
  ORDER BY s.set_number
`);
export const stmtGetSetByLocalId = db.prepare(`
  SELECT * FROM sets WHERE id = ? AND workout_id = ?
`);
export const stmtGetUnsyncedSets = db.prepare(`
  SELECT * FROM sets WHERE synced = 0 LIMIT ?
`);
export const stmtMarkSetSynced = db.prepare(`
  UPDATE sets SET synced = 1 WHERE id = ?
`);
export const stmtCreateRecoveryAssessment = db.prepare(`
  INSERT INTO recovery_assessments (
    user_id, date, sleep_quality, muscle_soreness, mental_motivation,
    total_score, volume_adjustment, timestamp, synced
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
`);
export const stmtGetRecoveryAssessmentByDate = db.prepare(`
  SELECT * FROM recovery_assessments
  WHERE user_id = ? AND date = ?
`);
export const stmtCreateVO2maxSession = db.prepare(`
  INSERT INTO vo2max_sessions (
    workout_id, protocol, duration_seconds, intervals_completed,
    average_hr, peak_hr, estimated_vo2max, synced
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
`);
export const stmtGetVO2maxSessionByWorkout = db.prepare(`
  SELECT * FROM vo2max_sessions WHERE workout_id = ?
`);
export const stmt1RMProgression = db.prepare(`
  SELECT
    w.date,
    MAX(s.weight_kg * (1 + (s.reps - s.rir) / 30.0)) as estimated_1rm
  FROM sets s
  JOIN workouts w ON s.workout_id = w.id
  WHERE w.user_id = ? AND s.exercise_id = ? AND w.date >= ? AND w.date <= ?
  GROUP BY w.date
  ORDER BY w.date
`);
export const stmtVolumeTrends = db.prepare(`
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
export const stmtConsistencyMetrics = db.prepare(`
  SELECT
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_workouts,
    COUNT(*) as total_workouts,
    AVG(CASE WHEN completed_at IS NOT NULL THEN completed_at - started_at END) as avg_session_duration
  FROM workouts
  WHERE user_id = ?
`);
export const stmtGetActiveSession = db.prepare(`
  SELECT * FROM active_sessions WHERE user_id = ?
`);
export const stmtCreateActiveSession = db.prepare(`
  INSERT OR REPLACE INTO active_sessions (
    user_id, workout_id, current_exercise_index, started_at, last_activity_at, state
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);
export const stmtUpdateActiveSession = db.prepare(`
  UPDATE active_sessions
  SET current_exercise_index = ?, last_activity_at = ?, state = ?
  WHERE user_id = ?
`);
export const stmtDeleteActiveSession = db.prepare(`
  DELETE FROM active_sessions WHERE user_id = ?
`);
export const stmtCreateAuditLog = db.prepare(`
  INSERT INTO audit_logs (user_id, event_type, ip_address, timestamp, details)
  VALUES (?, ?, ?, ?, ?)
`);
export const stmtGetAuditLogsByUser = db.prepare(`
  SELECT * FROM audit_logs
  WHERE user_id = ?
  ORDER BY timestamp DESC
  LIMIT ?
`);
export const calculateOneRepMax = (weight, reps, rir) => {
    return weight * (1 + (reps - rir) / 30);
};
export const calculateVolumeAdjustment = (totalScore) => {
    if (totalScore >= 12)
        return 'none';
    if (totalScore >= 9)
        return 'reduce_1_set';
    if (totalScore >= 6)
        return 'reduce_2_sets';
    return 'rest_day';
};
export const executeWithTiming = (name, fn) => {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    if (duration > 5) {
        console.warn(`[PERFORMANCE WARNING] Query "${name}" took ${duration}ms (target: <5ms)`);
    }
    return result;
};
export const transaction = (fn) => {
    return db.transaction(fn)();
};
export const batchInsert = (stmt, records) => {
    const insert = db.transaction((items) => {
        for (const item of items) {
            stmt.run(item);
        }
    });
    insert(records);
};
export const closeDatabase = () => {
    db.close();
    console.log('Database connection closed');
};
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
//# sourceMappingURL=db.js.map