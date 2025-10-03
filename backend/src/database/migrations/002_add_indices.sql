-- Migration 002: Add indices for Phase 4 features
-- Created: 2025-10-03
-- Purpose: Performance optimization for exercise library filtering, program lookups, and volume analytics

-- ============================================================================
-- Exercise Library Indices (T004-T005)
-- ============================================================================

-- Index for filtering exercises by muscle groups (JSON array search)
-- Used by: GET /api/exercises?muscle_group=chest
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON exercises(muscle_groups);

-- Index for filtering exercises by equipment
-- Used by: GET /api/exercises?equipment=barbell
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);

-- Index for filtering exercises by movement pattern
-- Note: movement_pattern column needs to be added to schema first
-- Placeholder for future enhancement
-- CREATE INDEX IF NOT EXISTS idx_exercises_movement_pattern ON exercises(movement_pattern);

-- ============================================================================
-- Program Exercise Indices (T009-T013)
-- ============================================================================

-- Index for looking up all exercises in a program day
-- Used by: GET /api/program-exercises?program_day_id=5
CREATE INDEX IF NOT EXISTS idx_program_exercises_program_day_id ON program_exercises(program_day_id);

-- Index for finding which program days use a specific exercise
-- Used by: GET /api/program-exercises?exercise_id=10
CREATE INDEX IF NOT EXISTS idx_program_exercises_exercise_id ON program_exercises(exercise_id);

-- Composite index for ordered exercise retrieval within a program day
-- Used by: SELECT * FROM program_exercises WHERE program_day_id = ? ORDER BY order_index
CREATE INDEX IF NOT EXISTS idx_program_exercises_order ON program_exercises(program_day_id, order_index);

-- ============================================================================
-- Volume Analytics Indices (T017-T019)
-- ============================================================================

-- Index for aggregating volume by exercise
-- Used by: SELECT SUM(weight_kg * reps) FROM sets WHERE exercise_id = ?
CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON sets(exercise_id);

-- Composite index for date range queries on workouts
-- Used by: SELECT * FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ?
-- Note: This enhances the existing idx_workouts_user_date index
CREATE INDEX IF NOT EXISTS idx_workouts_date_range ON workouts(user_id, date);

-- ============================================================================
-- Verification Queries (Run these after migration)
-- ============================================================================

-- PRAGMA index_list('exercises');
-- PRAGMA index_list('program_exercises');
-- PRAGMA index_list('sets');
-- PRAGMA index_list('workouts');

-- Test query performance:
-- EXPLAIN QUERY PLAN SELECT * FROM exercises WHERE equipment = 'barbell';
-- EXPLAIN QUERY PLAN SELECT * FROM program_exercises WHERE program_day_id = 1 ORDER BY order_index;
-- EXPLAIN QUERY PLAN SELECT SUM(weight_kg * reps) FROM sets WHERE exercise_id = 10;
