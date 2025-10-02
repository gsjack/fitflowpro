# Data Model: FitFlow Pro

**Date**: 2025-10-02
**Feature**: FitFlow Pro - Evidence-Based Training Application
**Database**: SQLite (expo-sqlite for mobile, better-sqlite3 for backend)

## Overview

FitFlow Pro uses a local-first data model with denormalized schemas optimized for read performance and < 5ms write latency. Both mobile and backend use identical SQLite schemas with synchronization flags (`synced`) to track pending server sync.

**Design Principles**:
1. **Denormalization**: Duplicate frequently accessed data to avoid JOINs
2. **Timestamps**: All temporal data in UTC milliseconds for precision
3. **Foreign Keys**: Enforced for data integrity
4. **Indices**: Created on all foreign keys, `synced` flags, and common query patterns
5. **State Machines**: Explicit status enums for workflow tracking (workout status, mesocycle phase)

---

## Core Entities

### 1. User

Represents an authenticated user of the application.

**Schema**:
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  age INTEGER,
  weight_kg REAL,
  experience_level TEXT CHECK(experience_level IN ('beginner', 'intermediate', 'advanced')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `username`: Unique email address for authentication
- `password_hash`: Bcrypt hashed password (cost ≥ 12)
- `age`: User's age in years (optional; used for age-based training adjustments)
- `weight_kg`: Current body weight in kilograms (optional; used for bodyweight exercise scaling)
- `experience_level`: Training experience tier affecting default volume recommendations
  - `beginner`: < 1 year training (start at MEV)
  - `intermediate`: 1-3 years (start at MEV-MAV midpoint)
  - `advanced`: 3+ years (start near MAV)
- `created_at`: Account creation timestamp (UTC milliseconds)
- `updated_at`: Last profile update timestamp (UTC milliseconds)

**Validation Rules**:
- `username`: Must be valid email format (validated at API layer)
- `password_hash`: Bcrypt hash with salt (60 characters)
- `age`: If provided, must be 13-100 years
- `weight_kg`: If provided, must be 30-300 kg
- `experience_level`: Defaults to 'beginner' if not specified

**Relationships**:
- One-to-many with `programs` (user creates training programs)
- One-to-many with `workouts` (user logs workout sessions)
- One-to-many with `recovery_assessments` (user submits daily assessments)

---

### 2. Exercise

Represents a movement in the exercise library (pre-seeded with 100+ exercises).

**Schema**:
```sql
CREATE TABLE exercises (
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
```

**Fields**:
- `id`: Auto-incrementing primary key
- `name`: Exercise name (e.g., "Barbell Bench Press", "Romanian Deadlift")
- `muscle_groups`: JSON array of primary muscles (e.g., `["chest", "front_delts", "triceps"]`)
- `equipment`: Required equipment
  - Values: `"barbell"`, `"dumbbell"`, `"cable"`, `"machine"`, `"bodyweight"`
- `difficulty`: Skill level required
  - Values: `"beginner"`, `"intermediate"`, `"advanced"`
- `default_sets`: Recommended set count (typically 3-4)
- `default_reps`: Target rep range (e.g., `"6-8"`, `"8-10"`, `"10-12"`)
- `default_rir`: Default Reps in Reserve (typically 2-3 for hypertrophy)
- `notes`: Optional technique cues or form notes

**Validation Rules**:
- `name`: 3-100 characters, unique
- `muscle_groups`: Non-empty JSON array; values from predefined muscle list
- `equipment`: Must be one of 5 valid types
- `difficulty`: Must be one of 3 valid levels
- `default_sets`: 1-10 sets
- `default_reps`: Format `"X-Y"` where X < Y and both ∈ [1, 50]
- `default_rir`: 0-4 (0 = failure, 4 = very easy)

**Relationships**:
- Many-to-many with `program_days` (via `program_exercises`)
- One-to-many with `sets` (exercise performed in workout)

**Sample Data**:
```sql
INSERT INTO exercises (name, muscle_groups, equipment, difficulty, default_sets, default_reps, default_rir, notes)
VALUES
  ('Barbell Bench Press', '["chest", "front_delts", "triceps"]', 'barbell', 'intermediate', 4, '6-8', 2, 'Arch back, retract scapula, bar to mid-chest'),
  ('Romanian Deadlift', '["hamstrings", "glutes", "lower_back"]', 'barbell', 'intermediate', 3, '8-10', 2, 'Hinge at hips, maintain neutral spine, knees slightly bent');
```

---

### 3. Training Program

Represents a user's structured training program (typically the 6-day Push/Pull split).

**Schema**:
```sql
CREATE TABLE programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  mesocycle_week INTEGER NOT NULL DEFAULT 1,
  mesocycle_phase TEXT NOT NULL DEFAULT 'mev',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `user_id`: Owner of this program
- `name`: Program name (e.g., "RP 6-Day Push/Pull Split")
- `mesocycle_week`: Current week within accumulation phase (1-6)
- `mesocycle_phase`: Current training phase
  - `mev`: Minimum Effective Volume (week 1-2)
  - `mav`: Maximum Adaptive Volume (week 3-4)
  - `mrv`: Maximum Recoverable Volume (week 5-6)
  - `deload`: Deload week (reduced volume for recovery)
- `created_at`: Program creation timestamp

**Validation Rules**:
- `user_id`: Must reference existing user
- `name`: 3-100 characters
- `mesocycle_week`: 1-6 for accumulation, N/A during deload
- `mesocycle_phase`: Must be one of 4 valid phases

**State Transitions**:
```
mev (week 1-2) → mav (week 3-4) → mrv (week 5-6) → deload → mev (new cycle)
```

**Relationships**:
- Many-to-one with `users`
- One-to-many with `program_days` (program has 6 days: Mon-Sat)

---

### 4. Program Day

Represents a single day within a training program (e.g., Monday = Push A).

**Schema**:
```sql
CREATE TABLE program_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  day_type TEXT NOT NULL,
  FOREIGN KEY (program_id) REFERENCES programs(id)
);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `program_id`: Parent program
- `day_of_week`: ISO day number (1 = Monday, 6 = Saturday, 7 = Sunday/rest)
- `day_name`: Descriptive name (e.g., "Push A", "Pull A", "VO2max A", "Push B", "Pull B", "Zone 2")
- `day_type`: Workout category
  - `strength`: Resistance training day (Push/Pull)
  - `vo2max`: High-intensity cardio (Norwegian 4x4 protocol)

**Validation Rules**:
- `program_id`: Must reference existing program
- `day_of_week`: 1-7 (1 = Monday, 7 = Sunday)
- `day_name`: 3-50 characters
- `day_type`: Must be `strength` or `vo2max`

**Relationships**:
- Many-to-one with `programs`
- One-to-many with `program_exercises` (day contains multiple exercises)
- One-to-many with `workouts` (day is executed as workout session)

**Default 6-Day Split**:
```sql
INSERT INTO program_days (program_id, day_of_week, day_name, day_type) VALUES
  (1, 1, 'Push A', 'strength'),
  (1, 2, 'Pull A', 'strength'),
  (1, 3, 'VO2max A', 'vo2max'),
  (1, 4, 'Push B', 'strength'),
  (1, 5, 'Pull B', 'strength'),
  (1, 6, 'Zone 2', 'vo2max');
```

---

### 5. Program Exercise

Represents an exercise assigned to a program day (many-to-many junction table).

**Schema**:
```sql
CREATE TABLE program_exercises (
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
```

**Fields**:
- `id`: Auto-incrementing primary key
- `program_day_id`: Day this exercise belongs to
- `exercise_id`: Reference to exercise library
- `order_index`: Exercise execution order within day (0-indexed)
- `sets`: Number of working sets (excluding warm-up)
- `reps`: Target rep range (e.g., "6-8", "10-12")
- `rir`: Target Reps in Reserve (0-4)

**Validation Rules**:
- `program_day_id`: Must reference existing program day
- `exercise_id`: Must reference existing exercise
- `order_index`: 0-20 (max 20 exercises per day)
- `sets`: 1-10 working sets
- `reps`: Format `"X-Y"` where X < Y
- `rir`: 0-4

**Relationships**:
- Many-to-one with `program_days`
- Many-to-one with `exercises`

**Example: Push A Day**:
```sql
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir) VALUES
  (1, 1, 0, 4, '6-8', 2),   -- Barbell Bench Press
  (1, 5, 1, 4, '8-10', 2),  -- Incline Dumbbell Press
  (1, 8, 2, 3, '10-12', 2), -- Cable Flyes
  (1, 12, 3, 4, '8-10', 2), -- Overhead Press
  (1, 15, 4, 3, '10-12', 2), -- Lateral Raises
  (1, 18, 5, 3, '10-12', 2); -- Tricep Pushdowns
```

---

### 6. Workout Session

Represents an actual training session (execution of a program day).

**Schema**:
```sql
CREATE TABLE workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  program_day_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'not_started',
  total_volume_kg REAL,
  average_rir REAL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (program_day_id) REFERENCES program_days(id)
);

CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX idx_workouts_synced ON workouts(synced);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `user_id`: User performing the workout
- `program_day_id`: Which program day is being executed
- `date`: Workout date in ISO format (`YYYY-MM-DD`)
- `started_at`: Timestamp when workout began (UTC milliseconds)
- `completed_at`: Timestamp when workout ended (UTC milliseconds)
- `status`: Workflow state
  - `not_started`: Scheduled but not begun
  - `in_progress`: Currently active
  - `completed`: Finished successfully
  - `cancelled`: User cancelled mid-workout
- `total_volume_kg`: Sum of (weight × reps) across all sets
- `average_rir`: Mean RIR across all sets (indicator of exertion)
- `synced`: Boolean flag (0 = pending sync, 1 = synced to server)

**Validation Rules**:
- `user_id`: Must reference existing user
- `program_day_id`: Must reference existing program day
- `date`: ISO 8601 format, must not be future date
- `started_at`: Must be ≥ date at 00:00:00
- `completed_at`: Must be > `started_at` if present
- `status`: Must be one of 4 valid states
- `total_volume_kg`: ≥ 0 if present
- `average_rir`: 0.0-4.0 if present

**State Transitions**:
```
not_started → in_progress → completed
                        ↘ cancelled
```

**Relationships**:
- Many-to-one with `users`
- Many-to-one with `program_days`
- One-to-many with `sets` (workout contains multiple sets)
- One-to-one with `vo2max_sessions` (if cardio day)

---

### 7. Set

Represents a single set of an exercise performed during a workout.

**Schema**:
```sql
CREATE TABLE sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  reps INTEGER NOT NULL,
  rir INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  notes TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_id) REFERENCES workouts(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE INDEX idx_sets_workout ON sets(workout_id);
CREATE INDEX idx_sets_synced ON sets(synced);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `workout_id`: Parent workout session
- `exercise_id`: Which exercise was performed (denormalized for read performance)
- `set_number`: Set number within exercise (1-indexed)
- `weight_kg`: Load lifted in kilograms (bodyweight exercises use 0 or body weight)
- `reps`: Repetitions completed
- `rir`: Reps in Reserve (0-4 scale)
  - 0: Absolute failure (could not complete another rep)
  - 1: 1 rep left in tank
  - 2: 2 reps left (typical hypertrophy target)
  - 3: 3 reps left (deload intensity)
  - 4: 4+ reps left (warm-up)
- `timestamp`: When set was completed (UTC milliseconds, used for sync conflict resolution)
- `notes`: Optional user notes (e.g., "felt strong", "shoulder twinge")
- `synced`: Boolean flag (0 = pending sync, 1 = synced to server)

**Validation Rules**:
- `workout_id`: Must reference existing workout
- `exercise_id`: Must reference existing exercise
- `set_number`: 1-20 (max 20 sets per exercise)
- `weight_kg`: 0-500 kg (500kg upper limit for barbell squat/deadlift)
- `reps`: 1-50 (50 upper limit for high-rep sets)
- `rir`: 0-4
- `timestamp`: Must be ≥ workout `started_at`
- `notes`: Max 500 characters

**Derived Fields** (calculated, not stored):
- `estimated_1rm`: `weight_kg * (1 + (reps - rir) / 30)` (Epley formula with RIR adjustment)

**Relationships**:
- Many-to-one with `workouts`
- Many-to-one with `exercises` (denormalized)

**Example Sets**:
```sql
INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp) VALUES
  (1, 1, 1, 80, 8, 3, 1696255200000),  -- Warm-up: 80kg × 8 @ RIR 3
  (1, 1, 2, 100, 8, 2, 1696255380000), -- Working set 1: 100kg × 8 @ RIR 2
  (1, 1, 3, 100, 7, 2, 1696255560000), -- Working set 2: 100kg × 7 @ RIR 2
  (1, 1, 4, 100, 6, 1, 1696255740000); -- Working set 3: 100kg × 6 @ RIR 1 (fatigue)
```

---

### 8. Recovery Assessment

Represents a daily check-in before workouts to gauge recovery status.

**Schema**:
```sql
CREATE TABLE recovery_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  sleep_quality INTEGER NOT NULL,
  muscle_soreness INTEGER NOT NULL,
  mental_motivation INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  volume_adjustment TEXT,
  timestamp INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_recovery_user_date ON recovery_assessments(user_id, date);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `user_id`: User submitting assessment
- `date`: Assessment date (`YYYY-MM-DD`)
- `sleep_quality`: 1-5 scale
  - 1: < 4 hours, very poor quality
  - 2: 4-5 hours, poor quality
  - 3: 6 hours, average quality
  - 4: 7-8 hours, good quality
  - 5: 8+ hours, excellent quality
- `muscle_soreness`: 1-5 scale
  - 1: Extremely sore, limited range of motion
  - 2: Moderately sore, noticeable discomfort
  - 3: Mildly sore, manageable
  - 4: Minimal soreness, barely noticeable
  - 5: No soreness
- `mental_motivation`: 1-5 scale
  - 1: Zero motivation, dread training
  - 2: Low motivation, forcing myself
  - 3: Neutral, indifferent
  - 4: Good motivation, eager to train
  - 5: Excellent motivation, excited
- `total_score`: Sum of 3 scores (range 3-15)
- `volume_adjustment`: Auto-regulation decision
  - `none`: No adjustment (score 12-15, good recovery)
  - `reduce_1_set`: Remove 1 set per exercise (score 9-11, moderate recovery)
  - `reduce_2_sets`: Remove 2 sets per exercise (score 6-8, poor recovery)
  - `rest_day`: Skip workout entirely (score 3-5, very poor recovery)
- `timestamp`: When assessment was submitted
- `synced`: Boolean flag

**Validation Rules**:
- `user_id`: Must reference existing user
- `date`: ISO 8601 format, not future date
- `sleep_quality`, `muscle_soreness`, `mental_motivation`: 1-5
- `total_score`: Must equal sum of 3 subscores
- `volume_adjustment`: Must be one of 4 valid options

**Auto-Regulation Logic**:
```
total_score 12-15 → none
total_score 9-11  → reduce_1_set
total_score 6-8   → reduce_2_sets
total_score 3-5   → rest_day
```

**Relationships**:
- Many-to-one with `users`

---

### 9. VO2max Session

Represents a cardiovascular training session (Norwegian 4x4 or Zone 2).

**Schema**:
```sql
CREATE TABLE vo2max_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  protocol TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  intervals_completed INTEGER,
  average_hr INTEGER,
  peak_hr INTEGER,
  estimated_vo2max REAL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);
```

**Fields**:
- `id`: Auto-incrementing primary key
- `workout_id`: Parent workout session
- `protocol`: Cardio protocol executed
  - `4x4`: Norwegian 4×4 (4 min @ 90-95% max HR, 3 min active recovery, ×4)
  - `zone2`: Zone 2 steady-state (60-70% max HR, 30-60 minutes)
- `duration_seconds`: Total session duration (including warm-up/cool-down)
- `intervals_completed`: Number of 4-minute intervals (for 4x4 protocol)
- `average_hr`: Mean heart rate across entire session (bpm)
- `peak_hr`: Maximum heart rate reached (bpm)
- `estimated_vo2max`: Calculated VO2max estimate (ml/kg/min) from HR data
- `synced`: Boolean flag

**Validation Rules**:
- `workout_id`: Must reference existing workout
- `protocol`: Must be `4x4` or `zone2`
- `duration_seconds`: 600-7200 seconds (10 min - 2 hours)
- `intervals_completed`: 1-4 for `4x4`, NULL for `zone2`
- `average_hr`: 60-220 bpm (physiological limits)
- `peak_hr`: 80-220 bpm, must be ≥ `average_hr`
- `estimated_vo2max`: 20-80 ml/kg/min (typical human range)

**VO2max Estimation** (simplified formula):
```
estimated_vo2max = 15.3 × (max_hr / resting_hr)
```

**Relationships**:
- One-to-one with `workouts`

---

### 10. Active Session

Represents a workout session currently in progress (for resume functionality).

**Schema**:
```sql
CREATE TABLE active_sessions (
  user_id INTEGER PRIMARY KEY,
  workout_id INTEGER NOT NULL,
  current_exercise_index INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  state TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);
```

**Fields**:
- `user_id`: Primary key (one active session per user)
- `workout_id`: Workout being executed
- `current_exercise_index`: Index into program day's exercise list (0-indexed)
- `started_at`: When workout began
- `last_activity_at`: Timestamp of last set logged (updated on each set)
- `state`: JSON blob storing complete session state
  - Stores: completed sets, current exercise, timer state, pending sync queue
  - Example:
    ```json
    {
      "exerciseIndex": 3,
      "completedSets": [1, 2, 3, 4, 5, 6, 7, 8, 9],
      "currentSet": 10,
      "timerRemaining": 180,
      "syncPending": ["set_9", "set_10"]
    }
    ```

**Validation Rules**:
- `user_id`: Must reference existing user (one row per user max)
- `workout_id`: Must reference workout with status `in_progress`
- `current_exercise_index`: 0-19 (max 20 exercises)
- `started_at`: Must be < 24 hours ago (sessions expire after 24 hours)
- `last_activity_at`: Must be ≥ `started_at` and < 24 hours ago
- `state`: Valid JSON (max 10KB)

**Expiration Logic**:
- Sessions with `last_activity_at` > 24 hours ago are archived as "abandoned"
- User prompted to start fresh workout if resuming expired session

**Relationships**:
- One-to-one with `users`
- Many-to-one with `workouts`

---

## Database Indices

**Performance-Critical Indices**:
```sql
-- Sets table (hot path for workout logging)
CREATE INDEX idx_sets_workout ON sets(workout_id);
CREATE INDEX idx_sets_synced ON sets(synced);

-- Workouts table (frequent queries by user and date)
CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX idx_workouts_synced ON workouts(synced);

-- Recovery assessments (daily lookup)
CREATE INDEX idx_recovery_user_date ON recovery_assessments(user_id, date);
```

**Rationale**:
- `idx_sets_workout`: Supports "get all sets for workout" query (p95 < 1ms)
- `idx_sets_synced`: Supports sync queue processing (find unsynced sets)
- `idx_workouts_user_date`: Supports workout history queries and analytics
- `idx_workouts_synced`: Supports sync queue processing
- `idx_recovery_user_date`: Supports "get today's recovery assessment" query

---

## Sync Strategy

**Local-First Synchronization**:
1. All writes occur to local SQLite first (`synced = 0`)
2. Background sync queue attempts server sync
3. On success, update `synced = 1`
4. Server mirrors local schema; uses `localId` for deduplication

**Conflict Resolution**:
- **Timestamps**: Server compares `timestamp` field
- **Active Workouts**: Client always wins during `in_progress` status
- **Historical Data**: Server wins (most recent `timestamp`)

**Example Sync Flow**:
```typescript
// 1. User logs set locally
await db.runAsync(
  'INSERT INTO sets (workout_id, exercise_id, ..., synced) VALUES (?, ?, ..., 0)',
  [workoutId, exerciseId, ...]
);

// 2. Add to sync queue
syncQueue.add('set', setData, localSetId);

// 3. Background sync (non-blocking)
await api.post('/api/sets', { ...setData, localId: localSetId });

// 4. On success, mark synced
await db.runAsync('UPDATE sets SET synced = 1 WHERE id = ?', [localSetId]);
```

---

## Summary

The FitFlow Pro data model supports:
- ✅ **Offline-first** operation with sync flags
- ✅ **Performance** optimized with denormalization and indices
- ✅ **State machines** for workflow tracking (workout status, mesocycle phases)
- ✅ **Referential integrity** via foreign keys
- ✅ **Auto-regulation** via recovery assessment scoring
- ✅ **Resume functionality** via active session tracking
- ✅ **Conflict resolution** via timestamps and status-based logic

**Next Phase**: Generate API contracts (OpenAPI specs) and create failing contract tests
