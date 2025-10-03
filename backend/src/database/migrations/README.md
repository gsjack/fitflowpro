# Database Migrations

This directory contains database migrations for FitFlow Pro backend.

## Migration Files

### Migration 002: Add Indices (Phase 4 - T025)

**File**: `002_add_indices.sql`

**Purpose**: Adds performance-critical indices for:
- Exercise library filtering (muscle groups, equipment)
- Program exercise lookups and ordering
- Volume analytics queries

**Indices Created**:
- `idx_exercises_muscle_groups` - Filter exercises by muscle group
- `idx_exercises_equipment` - Filter exercises by equipment type
- `idx_program_exercises_program_day_id` - Lookup exercises in a program day
- `idx_program_exercises_exercise_id` - Find program days using an exercise
- `idx_program_exercises_order` - Ordered retrieval of exercises
- `idx_sets_exercise_id` - Volume aggregation by exercise
- `idx_workouts_date_range` - Date range queries for analytics

**Performance Impact**: Converts TABLE SCAN to INDEX SCAN for critical queries

---

### Migration 003: VO2max Constraints (Phase 4 - T026)

**File**: `003_add_vo2max_constraints.sql`

**Purpose**: Adds physiological validation constraints to `vo2max_sessions` table

**Constraints Enforced** (via triggers):
- `average_hr`: 60-220 bpm
- `peak_hr`: 60-220 bpm
- `estimated_vo2max`: 20.0-80.0 ml/kg/min
- `duration_seconds`: 600-7200 seconds (10-120 minutes)

**Note**: SQLite doesn't support `ALTER TABLE ADD CONSTRAINT` after table creation, so constraints are enforced using triggers for existing databases. New installations get CHECK constraints in the table definition.

---

## Running Migrations

### Manual Execution

```bash
cd backend
sqlite3 data/fitflow.db < src/database/migrations/002_add_indices.sql
sqlite3 data/fitflow.db < src/database/migrations/003_add_vo2max_constraints.sql
```

### Automated Testing

```bash
cd backend
npx tsx src/database/migrations/test-migrations.ts
```

The test script:
1. Runs both migrations on the dev database
2. Verifies all indices were created using `PRAGMA index_list`
3. Tests query performance with `EXPLAIN QUERY PLAN`
4. Validates constraints by attempting to insert invalid data
5. Cleans up test data

**Expected Output**: All tests should pass with green checkmarks (✓)

---

## Verification Queries

### Check Indices

```sql
-- List all indices on a table
PRAGMA index_list('exercises');
PRAGMA index_list('program_exercises');
PRAGMA index_list('sets');
PRAGMA index_list('workouts');

-- View index details
PRAGMA index_info('idx_exercises_equipment');
```

### Test Index Usage

```sql
-- Should use idx_exercises_equipment
EXPLAIN QUERY PLAN
SELECT * FROM exercises WHERE equipment = 'barbell';

-- Should use idx_program_exercises_order
EXPLAIN QUERY PLAN
SELECT * FROM program_exercises
WHERE program_day_id = 1
ORDER BY order_index;

-- Should use idx_sets_exercise_id
EXPLAIN QUERY PLAN
SELECT SUM(weight_kg * reps) FROM sets WHERE exercise_id = 10;
```

Look for `SEARCH ... USING INDEX` in the output (not `SCAN TABLE`).

### Check VO2max Triggers

```sql
-- List all triggers on vo2max_sessions
SELECT name, sql
FROM sqlite_master
WHERE type='trigger' AND tbl_name='vo2max_sessions';
```

### Test Constraints

```sql
-- Should fail: HR > 220
INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, average_hr)
VALUES (1, '4x4', 1200, 250);

-- Should fail: VO2max > 80
INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, estimated_vo2max)
VALUES (1, '4x4', 1200, 90.0);

-- Should succeed: All values valid
INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, average_hr, peak_hr, estimated_vo2max)
VALUES (1, '4x4', 1200, 165, 185, 52.5);
```

---

## Schema Updates

Both migrations are now integrated into `/backend/src/database/schema.sql`:

1. **Indices**: All new indices are included in the "Performance-Critical Indices" section
2. **Constraints**: VO2max CHECK constraints are added to the table definition

Fresh database installations will have both indices and constraints automatically applied.

---

## Rollback (if needed)

### Drop Indices

```sql
DROP INDEX IF EXISTS idx_exercises_muscle_groups;
DROP INDEX IF EXISTS idx_exercises_equipment;
DROP INDEX IF EXISTS idx_program_exercises_program_day_id;
DROP INDEX IF EXISTS idx_program_exercises_exercise_id;
DROP INDEX IF EXISTS idx_program_exercises_order;
DROP INDEX IF EXISTS idx_sets_exercise_id;
DROP INDEX IF EXISTS idx_workouts_date_range;
```

### Drop VO2max Triggers

```sql
DROP TRIGGER IF EXISTS validate_vo2max_hr_insert;
DROP TRIGGER IF EXISTS validate_vo2max_peak_hr_insert;
DROP TRIGGER IF EXISTS validate_vo2max_estimate_insert;
DROP TRIGGER IF EXISTS validate_vo2max_duration_insert;
DROP TRIGGER IF EXISTS validate_vo2max_hr_update;
DROP TRIGGER IF EXISTS validate_vo2max_peak_hr_update;
DROP TRIGGER IF EXISTS validate_vo2max_estimate_update;
DROP TRIGGER IF EXISTS validate_vo2max_duration_update;
```

---

## Migration History

| Migration | Date | Purpose | Status |
|-----------|------|---------|--------|
| 001 | 2025-10-02 | Initial schema | ✅ Applied |
| 002 | 2025-10-03 | Add indices for Phase 4 | ✅ Applied |
| 003 | 2025-10-03 | VO2max constraints | ✅ Applied |

---

## Notes

- Migrations are idempotent (`IF NOT EXISTS` / `IF EXISTS`)
- Safe to re-run migrations multiple times
- No data loss - migrations only add indices and constraints
- Indices improve read performance but slightly slow down writes (negligible impact)
- Constraints prevent invalid data insertion (fail-fast validation)
