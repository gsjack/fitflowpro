# Data Model: Complete Missing Core Features

**Date**: 2025-10-03
**Feature**: Complete Missing Core Features for FitFlow Pro
**Database**: SQLite (backend: better-sqlite3)
**Context**: Building on existing schema to add missing functionality

---

## Executive Summary

This data model documents the **schema changes, new tables, and query patterns** required to complete the missing core features in FitFlow Pro. The existing schema (defined in `/home/asigator/fitness2025/backend/src/database/schema.sql`) already contains most tables. This document focuses on:

1. **Schema modifications** to existing tables
2. **New tables** for missing features (if any)
3. **Query patterns** for API endpoints that don't exist yet
4. **Volume tracking data model** (currently client-side only)
5. **Integration notes** with existing architecture

---

## Current Schema Analysis

### Existing Tables (Already Implemented)

| Table | Status | Routes Available | Notes |
|-------|--------|------------------|-------|
| `users` | ✅ Complete | `/api/auth/*` | No changes needed |
| `exercises` | ✅ Complete | ❌ **Missing** | Need GET /api/exercises endpoints |
| `programs` | ✅ Complete | ❌ **Missing** | Need CRUD /api/programs endpoints |
| `program_days` | ✅ Complete | ✅ `/api/program-days` | Read-only, needs update/create |
| `program_exercises` | ✅ Complete | ❌ **Missing** | Need program editor endpoints |
| `workouts` | ✅ Complete | ✅ `/api/workouts` | Working correctly |
| `sets` | ✅ Complete | ✅ `/api/sets` | Working correctly |
| `recovery_assessments` | ✅ Complete | ✅ `/api/recovery-assessments` | Working correctly |
| `vo2max_sessions` | ⚠️ **Unused** | ❌ **Missing** | Table exists, no routes |
| `active_sessions` | ✅ Complete | Embedded in workouts | No changes needed |
| `audit_logs` | ✅ Complete | Backend only | No API exposure needed |

### Missing API Endpoints (No Schema Changes Required)

The following endpoints need to be implemented using **existing tables**:

1. **Exercise Library Routes** (`/api/exercises`)
   - `GET /api/exercises` - List all exercises
   - `GET /api/exercises?muscle_group=chest` - Filter by muscle group
   - `GET /api/exercises/:id` - Get single exercise details

2. **Program Management Routes** (`/api/programs`)
   - `GET /api/programs` - List user's programs
   - `POST /api/programs` - Create new program
   - `PUT /api/programs/:id` - Update program (mesocycle phase advancement)
   - `GET /api/programs/:id/volume` - Calculate weekly volume per muscle group

3. **Program Editor Routes** (`/api/program-days/:id/exercises`)
   - `POST /api/program-days/:id/exercises` - Add exercise to program day
   - `PUT /api/program-days/:id/exercises/:exerciseId` - Update exercise (sets/reps/RIR)
   - `DELETE /api/program-days/:id/exercises/:exerciseId` - Remove exercise
   - `PUT /api/program-days/:id/exercises/reorder` - Reorder exercises

4. **VO2max Session Routes** (`/api/vo2max-sessions`)
   - `POST /api/vo2max-sessions` - Log VO2max cardio session
   - `GET /api/vo2max-sessions` - Retrieve VO2max history
   - `GET /api/analytics/vo2max-trend` - VO2max progression over time

---

## Schema Modifications

### 1. Exercises Table - Add Index for Muscle Group Filtering

**Current Schema**:
```sql
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  muscle_groups TEXT NOT NULL,  -- JSON array: ["chest", "front_delts", "triceps"]
  equipment TEXT NOT NULL CHECK(equipment IN ('barbell', 'dumbbell', 'cable', 'machine', 'bodyweight')),
  difficulty TEXT NOT NULL CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
  default_sets INTEGER NOT NULL,
  default_reps TEXT NOT NULL,
  default_rir INTEGER NOT NULL CHECK(default_rir >= 0 AND default_rir <= 4),
  notes TEXT
);
```

**Modification Required**: None (schema is complete)

**New Index**:
```sql
-- Add index for muscle group filtering (JSON contains queries)
-- SQLite JSON1 extension required
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups
ON exercises(muscle_groups);

-- Add index for equipment filtering
CREATE INDEX IF NOT EXISTS idx_exercises_equipment
ON exercises(equipment);
```

**Rationale**: Exercises are queried frequently by muscle group when building programs. The `muscle_groups` field is stored as JSON, so we create an index to speed up filtering queries.

---

### 2. Programs Table - No Changes Needed

**Current Schema**:
```sql
CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  mesocycle_week INTEGER NOT NULL DEFAULT 1,
  mesocycle_phase TEXT NOT NULL DEFAULT 'mev' CHECK(mesocycle_phase IN ('mev', 'mav', 'mrv', 'deload')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Status**: ✅ Schema is complete, no modifications required

**Missing Functionality**: API routes to create, update, and query programs

---

### 3. VO2max Sessions Table - Add Missing Constraints

**Current Schema**:
```sql
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
```

**Modification Required**: Add CHECK constraints for data integrity

```sql
-- Add constraints to existing table (requires migration)
-- SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so recreate table

-- Step 1: Create new table with constraints
CREATE TABLE IF NOT EXISTS vo2max_sessions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  protocol TEXT NOT NULL CHECK(protocol IN ('4x4', 'zone2')),
  duration_seconds INTEGER NOT NULL CHECK(duration_seconds >= 600 AND duration_seconds <= 7200),
  intervals_completed INTEGER CHECK(intervals_completed >= 1 AND intervals_completed <= 4),
  average_hr INTEGER CHECK(average_hr >= 60 AND average_hr <= 220),
  peak_hr INTEGER CHECK(peak_hr >= 80 AND peak_hr <= 220),
  estimated_vo2max REAL CHECK(estimated_vo2max >= 20 AND estimated_vo2max <= 80),
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);

-- Step 2: Copy existing data (if any)
INSERT INTO vo2max_sessions_new
SELECT * FROM vo2max_sessions;

-- Step 3: Drop old table
DROP TABLE vo2max_sessions;

-- Step 4: Rename new table
ALTER TABLE vo2max_sessions_new RENAME TO vo2max_sessions;

-- Step 5: Add index for sync queue
CREATE INDEX IF NOT EXISTS idx_vo2max_synced ON vo2max_sessions(synced);
```

**Rationale**: Enforce physiological limits (HR 60-220 bpm, VO2max 20-80 ml/kg/min) and session constraints (duration 10 min - 2 hours) at the database level.

---

## New Tables

### No New Tables Required

All necessary tables already exist in the schema. The missing functionality is **API routes** and **business logic**, not database schema.

---

## Volume Tracking Data Model

### Current Implementation: Client-Side Constants

Volume landmarks (MEV/MAV/MRV) are currently stored as **TypeScript constants** in `/home/asigator/fitness2025/mobile/src/constants/volumeLandmarks.ts`:

```typescript
export const VOLUME_LANDMARKS: Record<MuscleGroup, VolumeLandmark> = {
  chest: { mev: 8, mav: 14, mrv: 22 },
  back_lats: { mev: 10, mav: 16, mrv: 26 },
  back_traps: { mev: 6, mav: 12, mrv: 20 },
  shoulders_front: { mev: 4, mav: 8, mrv: 14 },
  shoulders_side: { mev: 8, mav: 16, mrv: 26 },
  shoulders_rear: { mev: 8, mav: 14, mrv: 22 },
  biceps: { mev: 6, mav: 12, mrv: 20 },
  triceps: { mev: 6, mav: 12, mrv: 22 },
  quads: { mev: 8, mav: 14, mrv: 24 },
  hamstrings: { mev: 6, mav: 12, mrv: 20 },
  glutes: { mev: 6, mav: 12, mrv: 20 },
  calves: { mev: 8, mav: 14, mrv: 22 },
  abs: { mev: 8, mav: 16, mrv: 28 },
};
```

### Design Decision: Keep as Constants (No Database Table)

**Rationale**:
1. **Static Data**: Volume landmarks are research-based constants that rarely change
2. **Performance**: No database query overhead for every volume calculation
3. **Simplicity**: Easier to version control and deploy updates
4. **Mobile-First**: Mobile app can function offline without querying server

**Alternative Approach** (if database storage is required in the future):
```sql
CREATE TABLE IF NOT EXISTS volume_landmarks (
  muscle_group TEXT PRIMARY KEY,
  mev INTEGER NOT NULL CHECK(mev >= 0 AND mev <= 50),
  mav INTEGER NOT NULL CHECK(mav >= mev AND mav <= 50),
  mrv INTEGER NOT NULL CHECK(mrv >= mav AND mrv <= 50)
);

-- Seed data
INSERT INTO volume_landmarks (muscle_group, mev, mav, mrv) VALUES
  ('chest', 8, 14, 22),
  ('back_lats', 10, 16, 26),
  ('back_traps', 6, 12, 20),
  ('shoulders_front', 4, 8, 14),
  ('shoulders_side', 8, 16, 26),
  ('shoulders_rear', 8, 14, 22),
  ('biceps', 6, 12, 20),
  ('triceps', 6, 12, 22),
  ('quads', 8, 14, 24),
  ('hamstrings', 6, 12, 20),
  ('glutes', 6, 12, 20),
  ('calves', 8, 14, 22),
  ('abs', 8, 16, 28);
```

**Recommendation**: Keep as constants for initial implementation. Migrate to database table only if:
- User-specific volume customization is required
- Research updates require frequent changes
- Multi-tenant system needs per-user landmarks

---

## Query Patterns for Missing Features

### 1. Exercise Library Queries

#### Get All Exercises
```sql
-- GET /api/exercises
SELECT
  id,
  name,
  muscle_groups,
  equipment,
  difficulty,
  default_sets,
  default_reps,
  default_rir,
  notes
FROM exercises
ORDER BY name;
```

#### Filter Exercises by Muscle Group
```sql
-- GET /api/exercises?muscle_group=chest
-- Requires JSON parsing (SQLite JSON1 extension)
SELECT
  id,
  name,
  muscle_groups,
  equipment,
  difficulty,
  default_sets,
  default_reps,
  default_rir,
  notes
FROM exercises
WHERE json_extract(muscle_groups, '$') LIKE '%chest%'
ORDER BY name;
```

**Alternative** (without JSON1 extension):
```sql
-- Simpler LIKE query (less precise but works everywhere)
SELECT * FROM exercises
WHERE muscle_groups LIKE '%"chest"%'
ORDER BY name;
```

#### Filter Exercises by Equipment
```sql
-- GET /api/exercises?equipment=barbell
SELECT * FROM exercises
WHERE equipment = ?
ORDER BY name;
```

**Performance**: Indexed via `idx_exercises_equipment` (< 5ms)

---

### 2. Program Management Queries

#### Create New Program
```sql
-- POST /api/programs
INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
VALUES (?, ?, 1, 'mev', ?);

-- Return inserted program ID
SELECT last_insert_rowid() as id;
```

#### Get User's Programs
```sql
-- GET /api/programs
SELECT
  id,
  user_id,
  name,
  mesocycle_week,
  mesocycle_phase,
  created_at
FROM programs
WHERE user_id = ?
ORDER BY created_at DESC;
```

#### Update Program (Advance Mesocycle Phase)
```sql
-- PUT /api/programs/:id
-- Example: Advance from MEV to MAV
UPDATE programs
SET
  mesocycle_phase = ?,
  mesocycle_week = mesocycle_week + 1
WHERE id = ? AND user_id = ?;
```

**Business Logic** (application layer):
```typescript
// Phase advancement logic
function advancePhase(currentPhase: string, currentWeek: number): { phase: string, week: number } {
  if (currentPhase === 'mev' && currentWeek >= 2) return { phase: 'mav', week: 1 };
  if (currentPhase === 'mav' && currentWeek >= 2) return { phase: 'mrv', week: 1 };
  if (currentPhase === 'mrv' && currentWeek >= 2) return { phase: 'deload', week: 1 };
  if (currentPhase === 'deload') return { phase: 'mev', week: 1 }; // Start new cycle
  return { phase: currentPhase, week: currentWeek + 1 }; // Stay in current phase
}
```

---

### 3. Calculate Weekly Volume Per Muscle Group

**Query**: Calculate total sets per muscle group for current week

```sql
-- GET /api/programs/:id/volume
-- Step 1: Get date range for current week
-- (Assumes week starts Monday, ISO 8601)

-- Step 2: Calculate volume per muscle group
SELECT
  e.muscle_groups,
  COUNT(s.id) as total_sets
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
JOIN workouts w ON s.workout_id = w.id
WHERE
  w.user_id = ?
  AND w.date >= ? -- Start of week (YYYY-MM-DD)
  AND w.date <= ? -- End of week (YYYY-MM-DD)
  AND w.status = 'completed'
GROUP BY e.muscle_groups;
```

**Challenge**: `muscle_groups` is a JSON array, so aggregation requires parsing.

**Better Approach** (application layer):
1. Query all sets for the week
2. Parse `muscle_groups` JSON in application code
3. Aggregate sets per muscle group
4. Compare against volume landmarks (from constants)

**Example Implementation**:
```typescript
// GET /api/programs/:id/volume
async function calculateWeeklyVolume(userId: number): Promise<MuscleGroupVolume[]> {
  const weekStart = getMonday(new Date()); // ISO week start
  const weekEnd = getSunday(new Date());

  // Query all sets for current week
  const sets = await db.all(`
    SELECT
      s.id,
      e.muscle_groups,
      s.set_number
    FROM sets s
    JOIN exercises e ON s.exercise_id = e.id
    JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = ?
      AND w.date >= ?
      AND w.date <= ?
      AND w.status = 'completed'
  `, [userId, weekStart, weekEnd]);

  // Aggregate sets per muscle group
  const volumeMap = new Map<string, number>();

  for (const set of sets) {
    const muscleGroups = JSON.parse(set.muscle_groups) as string[];
    for (const muscle of muscleGroups) {
      volumeMap.set(muscle, (volumeMap.get(muscle) || 0) + 1);
    }
  }

  // Compare against landmarks
  return Array.from(volumeMap.entries()).map(([muscle, sets]) => {
    const landmark = VOLUME_LANDMARKS[muscle as MuscleGroup];
    return {
      muscle_group: muscle,
      completed_sets: sets,
      mev: landmark.mev,
      mav: landmark.mav,
      mrv: landmark.mrv,
      zone: getVolumeZone(muscle as MuscleGroup, sets), // 'under' | 'optimal' | 'approaching_limit' | 'overreaching'
    };
  });
}
```

**Performance**:
- Query: ~20-50ms (indexed by `workouts.user_id` and `workouts.date`)
- JSON parsing: ~5-10ms (client-side)
- Total: < 100ms (within API requirements)

---

### 4. Program Editor Queries

#### Add Exercise to Program Day
```sql
-- POST /api/program-days/:id/exercises
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (?, ?, ?, ?, ?, ?);

SELECT last_insert_rowid() as id;
```

**Validation** (application layer):
- Check that `program_day_id` exists and belongs to user's program
- Check that `exercise_id` exists in exercise library
- Validate `order_index` is unique within program day
- Ensure `sets` (1-10), `reps` (format "X-Y"), `rir` (0-4) are valid

#### Update Exercise in Program Day
```sql
-- PUT /api/program-days/:programDayId/exercises/:exerciseId
UPDATE program_exercises
SET
  sets = ?,
  reps = ?,
  rir = ?
WHERE program_day_id = ? AND id = ?;
```

#### Remove Exercise from Program Day
```sql
-- DELETE /api/program-days/:programDayId/exercises/:exerciseId
DELETE FROM program_exercises
WHERE program_day_id = ? AND id = ?;
```

#### Reorder Exercises in Program Day
```sql
-- PUT /api/program-days/:id/exercises/reorder
-- Batch update order_index for multiple exercises
UPDATE program_exercises
SET order_index = CASE
  WHEN id = ? THEN ?
  WHEN id = ? THEN ?
  -- ... (repeat for all exercises)
END
WHERE program_day_id = ? AND id IN (?, ?, ...);
```

**Alternative** (simpler):
```sql
-- Update one exercise at a time
UPDATE program_exercises
SET order_index = ?
WHERE id = ? AND program_day_id = ?;
```

---

### 5. VO2max Session Queries

#### Log VO2max Session
```sql
-- POST /api/vo2max-sessions
INSERT INTO vo2max_sessions (
  workout_id,
  protocol,
  duration_seconds,
  intervals_completed,
  average_hr,
  peak_hr,
  estimated_vo2max,
  synced
) VALUES (?, ?, ?, ?, ?, ?, ?, 0);

SELECT last_insert_rowid() as id;
```

**Validation**:
- `workout_id` must exist and have `day_type = 'vo2max'`
- `protocol` must be '4x4' or 'zone2'
- `duration_seconds` must be 600-7200 (10 min - 2 hours)
- If protocol is '4x4', `intervals_completed` must be 1-4
- `average_hr` must be 60-220 bpm
- `peak_hr` must be ≥ `average_hr` and 80-220 bpm
- `estimated_vo2max` must be 20-80 ml/kg/min

#### Get VO2max History
```sql
-- GET /api/vo2max-sessions
SELECT
  v.id,
  v.workout_id,
  v.protocol,
  v.duration_seconds,
  v.intervals_completed,
  v.average_hr,
  v.peak_hr,
  v.estimated_vo2max,
  w.date,
  w.completed_at
FROM vo2max_sessions v
JOIN workouts w ON v.workout_id = w.id
WHERE w.user_id = ?
ORDER BY w.date DESC
LIMIT 50;
```

#### Get VO2max Trend (Analytics)
```sql
-- GET /api/analytics/vo2max-trend
SELECT
  w.date,
  v.estimated_vo2max,
  v.protocol
FROM vo2max_sessions v
JOIN workouts w ON v.workout_id = w.id
WHERE w.user_id = ?
  AND w.status = 'completed'
  AND v.estimated_vo2max IS NOT NULL
ORDER BY w.date ASC;
```

**Performance**: Indexed by `workouts.user_id` and `workouts.date` (< 20ms)

---

## Validation Rules Summary

### Existing Constraints (Already in Schema)

| Table | Field | Constraint | Validation |
|-------|-------|------------|------------|
| `sets` | `weight_kg` | `>= 0 AND <= 500` | ✅ Database |
| `sets` | `reps` | `>= 1 AND <= 50` | ✅ Database |
| `sets` | `rir` | `>= 0 AND <= 4` | ✅ Database |
| `recovery_assessments` | `sleep_quality` | `>= 1 AND <= 5` | ✅ Database |
| `recovery_assessments` | `muscle_soreness` | `>= 1 AND <= 5` | ✅ Database |
| `recovery_assessments` | `mental_motivation` | `>= 1 AND <= 5` | ✅ Database |
| `program_exercises` | `rir` | `>= 0 AND <= 4` | ✅ Database |

### New Constraints (VO2max Sessions)

| Table | Field | Constraint | Validation |
|-------|-------|------------|------------|
| `vo2max_sessions` | `duration_seconds` | `>= 600 AND <= 7200` | ⚠️ Add to schema |
| `vo2max_sessions` | `intervals_completed` | `>= 1 AND <= 4` | ⚠️ Add to schema |
| `vo2max_sessions` | `average_hr` | `>= 60 AND <= 220` | ⚠️ Add to schema |
| `vo2max_sessions` | `peak_hr` | `>= 80 AND <= 220` | ⚠️ Add to schema |
| `vo2max_sessions` | `estimated_vo2max` | `>= 20 AND <= 80` | ⚠️ Add to schema |

### Application-Level Validation Required

The following validations **cannot** be enforced at the database level:

1. **Rep Range Format**: `reps` field must be "X-Y" where X < Y (e.g., "6-8", "10-12")
   - **Validation**: Regex `/^\d{1,2}-\d{1,2}$/` in API routes

2. **Peak HR ≥ Average HR**: `peak_hr` must be greater than or equal to `average_hr`
   - **Validation**: Application logic in POST /api/vo2max-sessions

3. **Workout Session Locking**: One active workout per user
   - **Validation**: Check `active_sessions` table before starting workout

4. **MEV/MAV/MRV Validation**: Program editor must warn if volume falls below MEV
   - **Validation**: Calculate volume per muscle group, compare against `VOLUME_LANDMARKS`

5. **Mesocycle Phase Transitions**: Enforce phase progression (mev → mav → mrv → deload)
   - **Validation**: Application logic in PUT /api/programs/:id

---

## Migration Script

### Add Missing Indices and Constraints

```sql
-- File: /home/asigator/fitness2025/backend/src/database/migrations/002_add_missing_indices.sql

BEGIN TRANSACTION;

-- Add index for exercise filtering
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups
ON exercises(muscle_groups);

CREATE INDEX IF NOT EXISTS idx_exercises_equipment
ON exercises(equipment);

-- Add index for vo2max sync queue
CREATE INDEX IF NOT EXISTS idx_vo2max_synced
ON vo2max_sessions(synced);

-- Add constraints to vo2max_sessions (requires table recreation)
CREATE TABLE IF NOT EXISTS vo2max_sessions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  protocol TEXT NOT NULL CHECK(protocol IN ('4x4', 'zone2')),
  duration_seconds INTEGER NOT NULL CHECK(duration_seconds >= 600 AND duration_seconds <= 7200),
  intervals_completed INTEGER CHECK(intervals_completed >= 1 AND intervals_completed <= 4),
  average_hr INTEGER CHECK(average_hr >= 60 AND average_hr <= 220),
  peak_hr INTEGER CHECK(peak_hr >= 80 AND peak_hr <= 220),
  estimated_vo2max REAL CHECK(estimated_vo2max >= 20 AND estimated_vo2max <= 80),
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);

-- Copy existing data (if any)
INSERT INTO vo2max_sessions_new
SELECT * FROM vo2max_sessions;

-- Drop old table
DROP TABLE vo2max_sessions;

-- Rename new table
ALTER TABLE vo2max_sessions_new RENAME TO vo2max_sessions;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_vo2max_synced
ON vo2max_sessions(synced);

COMMIT;
```

**Execution**:
```bash
cd /home/asigator/fitness2025/backend
sqlite3 data/fitflow.db < src/database/migrations/002_add_missing_indices.sql
```

---

## Integration with Existing Architecture

### 1. Sync Strategy (No Changes)

All new API endpoints follow the existing **local-first sync pattern**:

1. Mobile app writes to local SQLite first (`synced = 0`)
2. Background sync queue attempts POST to server
3. On success, update `synced = 1`
4. Server stores with identical schema

**Example: VO2max Session Sync**:
```typescript
// Mobile: Log VO2max session locally
await db.runAsync(
  'INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, ..., synced) VALUES (?, ?, ?, ..., 0)',
  [workoutId, protocol, durationSeconds, ...]
);

// Add to sync queue (non-blocking)
syncQueue.add('vo2max_session', sessionData, localSessionId);

// Background sync
await api.post('/api/vo2max-sessions', { ...sessionData, localId: localSessionId });

// Mark synced
await db.runAsync('UPDATE vo2max_sessions SET synced = 1 WHERE id = ?', [localSessionId]);
```

### 2. Volume Tracking Integration

**Mobile App** (client-side calculation):
- Read volume landmarks from `/mobile/src/constants/volumeLandmarks.ts`
- Query local SQLite for weekly sets per muscle group
- Calculate volume zone (under/optimal/approaching_limit/overreaching)
- Display in Dashboard and Planner tiles

**Backend** (API endpoint):
- Provide `GET /api/programs/:id/volume` for analytics dashboard
- Calculate volume server-side for multi-device consistency
- Return JSON with volume status per muscle group

**No Database Sync Required**: Volume landmarks are static constants, not user data.

### 3. Performance Considerations

All queries are designed to meet constitutional requirements:

| Query Type | Target | Actual (Projected) | Optimization |
|------------|--------|-------------------|--------------|
| Exercise library | < 200ms | ~10ms | Indexed by equipment, muscle_groups |
| Weekly volume calc | < 200ms | ~50ms | Indexed by user_id, date |
| VO2max history | < 200ms | ~20ms | Indexed by user_id, date |
| Program CRUD | < 200ms | ~5ms | Simple single-table queries |

**SQLite Write Performance**: All inserts/updates are single-row operations (< 5ms) with WAL mode enabled.

---

## Dashboard and Planner Tile Queries

### Dashboard: Volume Tracking Tile

**Goal**: Show weekly volume per muscle group compared to MEV/MAV/MRV

**Query Pattern**:
```typescript
// Mobile app (local SQLite)
const weekStart = getMonday(new Date());
const weekEnd = getSunday(new Date());

const sets = await db.getAllAsync(`
  SELECT
    e.muscle_groups,
    COUNT(s.id) as set_count
  FROM sets s
  JOIN exercises e ON s.exercise_id = e.id
  JOIN workouts w ON s.workout_id = w.id
  WHERE w.date >= ? AND w.date <= ?
    AND w.status = 'completed'
  GROUP BY e.muscle_groups
`, [weekStart, weekEnd]);

// Parse muscle_groups JSON and aggregate
const volumeMap = new Map<string, number>();
for (const row of sets) {
  const muscles = JSON.parse(row.muscle_groups) as string[];
  for (const muscle of muscles) {
    volumeMap.set(muscle, (volumeMap.get(muscle) || 0) + row.set_count);
  }
}

// Compare against landmarks
const volumeStatus = Array.from(volumeMap.entries()).map(([muscle, sets]) => {
  const landmark = VOLUME_LANDMARKS[muscle];
  return {
    muscle,
    sets,
    zone: getVolumeZone(muscle, sets), // 'under' | 'optimal' | 'approaching_limit' | 'overreaching'
    color: getVolumeZoneColor(getVolumeZone(muscle, sets)),
  };
});
```

**Performance**: ~50ms (local SQLite, no network)

### Planner: Program Validation Tile

**Goal**: Validate program changes ensure MEV is met for all muscle groups

**Query Pattern**:
```typescript
// When user modifies program day exercises
async function validateProgramDay(programDayId: number): Promise<ValidationResult> {
  // Get all exercises in program day
  const exercises = await db.getAllAsync(`
    SELECT
      pe.sets,
      e.muscle_groups
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.program_day_id = ?
  `, [programDayId]);

  // Calculate total sets per muscle group
  const volumeMap = new Map<string, number>();
  for (const ex of exercises) {
    const muscles = JSON.parse(ex.muscle_groups) as string[];
    for (const muscle of muscles) {
      volumeMap.set(muscle, (volumeMap.get(muscle) || 0) + ex.sets);
    }
  }

  // Check against MEV thresholds
  const warnings: string[] = [];
  for (const [muscle, sets] of volumeMap.entries()) {
    const landmark = VOLUME_LANDMARKS[muscle];
    if (sets < landmark.mev) {
      warnings.push(`${muscle} volume below MEV (${sets}/${landmark.mev} sets)`);
    }
  }

  return { valid: warnings.length === 0, warnings };
}
```

**Performance**: ~10ms (local SQLite, no network)

---

## Summary

### Schema Changes Required

1. ✅ **Add indices** for exercise filtering (`idx_exercises_muscle_groups`, `idx_exercises_equipment`)
2. ✅ **Add constraints** to `vo2max_sessions` table (duration, HR, VO2max limits)
3. ✅ **Add index** for VO2max sync queue (`idx_vo2max_synced`)

### New Tables Required

❌ **None** - All functionality uses existing tables

### Missing API Routes (Schema Already Supports)

1. **Exercise Library**: `GET /api/exercises`, `GET /api/exercises/:id`
2. **Program Management**: `POST /api/programs`, `PUT /api/programs/:id`, `GET /api/programs/:id/volume`
3. **Program Editor**: `POST /api/program-days/:id/exercises`, `PUT`, `DELETE`
4. **VO2max Sessions**: `POST /api/vo2max-sessions`, `GET /api/vo2max-sessions`, `GET /api/analytics/vo2max-trend`

### Volume Tracking Strategy

- **Keep as constants** (TypeScript file, no database table)
- **Client-side calculation** for offline support
- **Server-side API** for analytics consistency
- **No sync required** (static data)

### Performance Impact

- All queries < 200ms (meets API requirements)
- SQLite writes < 5ms (indexed, WAL mode)
- Volume calculations ~50ms (client-side)
- No blocking operations during workouts

---

## Next Steps

1. **Execute migration script** to add indices and constraints
2. **Implement missing API routes** (exercises, programs, program editor, VO2max)
3. **Add application-level validations** (rep range format, peak HR >= average HR)
4. **Update mobile app** to call new API endpoints
5. **Test volume tracking** with real workout data
6. **Validate VO2max calculations** against physiological limits

**Ready for implementation** - No unresolved schema issues.
