-- FitFlow Pro - Backend SQLite Schema
-- Identical to mobile schema for seamless synchronization
-- Performance optimizations: WAL mode, indices on hot paths

-- Enable performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA cache_size = -64000;  -- 64MB cache
PRAGMA mmap_size = 268435456;  -- 256MB memory-mapped I/O
PRAGMA foreign_keys = ON;

-- ============================================================================
-- Core Entities
-- ============================================================================

-- Users Table
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

-- Exercises Library (Pre-seeded with 100+ exercises)
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  muscle_groups TEXT NOT NULL,  -- JSON array: ["chest", "front_delts", "triceps"]
  equipment TEXT NOT NULL CHECK(equipment IN ('barbell', 'dumbbell', 'cable', 'machine', 'bodyweight')),
  difficulty TEXT NOT NULL CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
  default_sets INTEGER NOT NULL,
  default_reps TEXT NOT NULL,  -- Format: "6-8", "8-10", "10-12"
  default_rir INTEGER NOT NULL CHECK(default_rir >= 0 AND default_rir <= 4),
  notes TEXT
);

-- Training Programs
CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  mesocycle_week INTEGER NOT NULL DEFAULT 1,
  mesocycle_phase TEXT NOT NULL DEFAULT 'mev' CHECK(mesocycle_phase IN ('mev', 'mav', 'mrv', 'deload')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Program Days (e.g., Push A, Pull A, VO2max A)
CREATE TABLE IF NOT EXISTS program_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL CHECK(day_of_week >= 1 AND day_of_week <= 7),
  day_name TEXT NOT NULL,
  day_type TEXT NOT NULL CHECK(day_type IN ('strength', 'vo2max')),
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

-- Program Exercises (Junction table: program_day <-> exercise)
CREATE TABLE IF NOT EXISTS program_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_day_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL,
  rir INTEGER NOT NULL CHECK(rir >= 0 AND rir <= 4),
  FOREIGN KEY (program_day_id) REFERENCES program_days(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- ============================================================================
-- Workout Tracking
-- ============================================================================

-- Workout Sessions
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  program_day_id INTEGER NOT NULL,
  date TEXT NOT NULL,  -- ISO format: YYYY-MM-DD
  started_at INTEGER,  -- UTC milliseconds
  completed_at INTEGER,  -- UTC milliseconds
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  total_volume_kg REAL,
  average_rir REAL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (program_day_id) REFERENCES program_days(id)
);

-- Sets (Actual performance data)
CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,  -- Denormalized for read performance
  set_number INTEGER NOT NULL,
  weight_kg REAL NOT NULL CHECK(weight_kg >= 0 AND weight_kg <= 500),
  reps INTEGER NOT NULL CHECK(reps >= 1 AND reps <= 50),
  rir INTEGER NOT NULL CHECK(rir >= 0 AND rir <= 4),
  timestamp INTEGER NOT NULL,  -- UTC milliseconds (for conflict resolution)
  notes TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_id) REFERENCES workouts(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- ============================================================================
-- Recovery & Auto-Regulation
-- ============================================================================

-- Recovery Assessments (Daily check-in)
CREATE TABLE IF NOT EXISTS recovery_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,  -- ISO format: YYYY-MM-DD
  sleep_quality INTEGER NOT NULL CHECK(sleep_quality >= 1 AND sleep_quality <= 5),
  muscle_soreness INTEGER NOT NULL CHECK(muscle_soreness >= 1 AND muscle_soreness <= 5),
  mental_motivation INTEGER NOT NULL CHECK(mental_motivation >= 1 AND mental_motivation <= 5),
  total_score INTEGER NOT NULL,  -- Sum of 3 subscores (3-15)
  volume_adjustment TEXT CHECK(volume_adjustment IN ('none', 'reduce_1_set', 'reduce_2_sets', 'rest_day')),
  timestamp INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- Cardio Tracking
-- ============================================================================

-- VO2max Sessions (Norwegian 4x4 or Zone 2)
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
-- Session Management
-- ============================================================================

-- Active Sessions (Resume functionality)
CREATE TABLE IF NOT EXISTS active_sessions (
  user_id INTEGER PRIMARY KEY,
  workout_id INTEGER NOT NULL,
  current_exercise_index INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  state TEXT NOT NULL,  -- JSON blob with session state
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);

-- ============================================================================
-- Audit Logging (T056 Requirement)
-- ============================================================================

-- Audit Logs (Security events tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event_type TEXT NOT NULL CHECK(event_type IN ('auth_login', 'auth_register', 'auth_logout', 'data_export', 'account_deletion')),
  ip_address TEXT,
  timestamp INTEGER NOT NULL,
  details TEXT,  -- JSON blob with additional context
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- Performance-Critical Indices
-- ============================================================================

-- Sets table (hot path for workout logging)
CREATE INDEX IF NOT EXISTS idx_sets_workout ON sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_synced ON sets(synced);

-- Workouts table (frequent queries by user and date)
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workouts_synced ON workouts(synced);

-- Recovery assessments (daily lookup)
CREATE INDEX IF NOT EXISTS idx_recovery_user_date ON recovery_assessments(user_id, date);

-- Audit logs (security queries)
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
