/**
 * Mobile SQLite Schema for FitFlow Pro
 *
 * Local-first database with sync flags for offline operation.
 * All tables mirror backend schema for consistency.
 *
 * Performance optimizations:
 * - WAL mode enabled for concurrent reads
 * - Indices on foreign keys and synced flags
 * - Denormalized data to avoid JOINs
 */

export const DATABASE_SCHEMA = `
-- Enable WAL mode for better concurrency
PRAGMA journal_mode=WAL;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  age INTEGER,
  weight_kg REAL,
  experience_level TEXT CHECK(experience_level IN ('beginner', 'intermediate', 'advanced')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ============================================================================
-- EXERCISES TABLE (Pre-seeded library)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  muscle_groups TEXT NOT NULL,
  equipment TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  default_sets INTEGER NOT NULL,
  default_reps TEXT NOT NULL,
  default_rir INTEGER NOT NULL,
  notes TEXT
);

-- ============================================================================
-- PROGRAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  mesocycle_week INTEGER NOT NULL DEFAULT 1,
  mesocycle_phase TEXT NOT NULL DEFAULT 'mev' CHECK(mesocycle_phase IN ('mev', 'mav', 'mrv', 'deload')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- PROGRAM DAYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS program_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  day_type TEXT NOT NULL CHECK(day_type IN ('strength', 'vo2max')),
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

-- ============================================================================
-- PROGRAM EXERCISES TABLE (Junction table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS program_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_day_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL,
  rir INTEGER NOT NULL,
  FOREIGN KEY (program_day_id) REFERENCES program_days(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- ============================================================================
-- WORKOUTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  program_day_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  total_volume_kg REAL,
  average_rir REAL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (program_day_id) REFERENCES program_days(id)
);

-- Workouts indices (performance-critical for workout history queries)
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workouts_synced ON workouts(synced);

-- ============================================================================
-- SETS TABLE (Hot path for workout logging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  reps INTEGER NOT NULL,
  rir INTEGER NOT NULL CHECK(rir >= 0 AND rir <= 4),
  timestamp INTEGER NOT NULL,
  notes TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_id) REFERENCES workouts(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- Sets indices (performance-critical for workout logging < 5ms target)
CREATE INDEX IF NOT EXISTS idx_sets_workout ON sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_synced ON sets(synced);

-- ============================================================================
-- RECOVERY ASSESSMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS recovery_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  sleep_quality INTEGER NOT NULL CHECK(sleep_quality >= 1 AND sleep_quality <= 5),
  muscle_soreness INTEGER NOT NULL CHECK(muscle_soreness >= 1 AND muscle_soreness <= 5),
  mental_motivation INTEGER NOT NULL CHECK(mental_motivation >= 1 AND mental_motivation <= 5),
  total_score INTEGER NOT NULL,
  volume_adjustment TEXT CHECK(volume_adjustment IN ('none', 'reduce_1_set', 'reduce_2_sets', 'rest_day')),
  timestamp INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Recovery assessments index (daily lookup optimization)
CREATE INDEX IF NOT EXISTS idx_recovery_user_date ON recovery_assessments(user_id, date);

-- ============================================================================
-- VO2MAX SESSIONS TABLE (Cardio tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vo2max_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  protocol TEXT NOT NULL CHECK(protocol IN ('4x4', 'zone2')),
  duration_seconds INTEGER NOT NULL,
  intervals_completed INTEGER,
  average_hr INTEGER,
  peak_hr INTEGER,
  estimated_vo2max REAL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);

-- ============================================================================
-- ACTIVE SESSIONS TABLE (Resume functionality)
-- ============================================================================
CREATE TABLE IF NOT EXISTS active_sessions (
  user_id INTEGER PRIMARY KEY,
  workout_id INTEGER NOT NULL,
  current_exercise_index INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  state TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);
`;
