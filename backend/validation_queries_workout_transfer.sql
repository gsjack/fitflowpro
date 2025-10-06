-- ============================================================================
-- WORKOUT TRANSFER VALIDATION QUERIES
-- ============================================================================
-- Purpose: Validate data integrity before and after transferring workouts
--          between users in FitFlow Pro database
--
-- Usage: Execute queries in three phases:
--   1. PRE-TRANSFER: Capture baseline metrics
--   2. POST-TRANSFER: Verify data was transferred correctly
--   3. INTEGRITY CHECKS: Ensure no orphaned records or broken relationships
--
-- Variables to replace:
--   :source_user_id - User ID to transfer FROM (e.g., 151)
--   :target_user_id - User ID to transfer TO (e.g., 1)
--   :workout_id - Specific workout ID to transfer (optional)
-- ============================================================================

-- ============================================================================
-- PHASE 1: PRE-TRANSFER VALIDATION QUERIES
-- ============================================================================
-- Execute these BEFORE performing the transfer to establish baseline

-- Query 1.1: Count all workouts for source user
-- Expected: Returns number of workouts to be transferred
SELECT
    COUNT(*) as total_workouts,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_workouts,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_workouts,
    COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started_workouts,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_workouts
FROM workouts
WHERE user_id = :source_user_id;

-- Query 1.2: Count all sets for source user's workouts
-- Expected: Returns total sets that should be transferred
SELECT
    COUNT(s.id) as total_sets,
    COUNT(DISTINCT s.workout_id) as workouts_with_sets,
    COUNT(DISTINCT s.exercise_id) as unique_exercises,
    AVG(s.weight_kg) as avg_weight_kg,
    AVG(s.reps) as avg_reps,
    AVG(s.rir) as avg_rir
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = :source_user_id;

-- Query 1.3: Calculate total volume for source user
-- Expected: Volume that should be preserved after transfer
SELECT
    SUM(s.weight_kg * s.reps) as total_volume_kg,
    COUNT(s.id) as total_sets,
    MIN(s.timestamp) as earliest_set_timestamp,
    MAX(s.timestamp) as latest_set_timestamp
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = :source_user_id;

-- Query 1.4: Detailed workout breakdown for source user
-- Expected: Shows all workouts with their metrics
SELECT
    w.id as workout_id,
    w.program_day_id,
    w.date,
    w.status,
    w.total_volume_kg,
    w.average_rir,
    COUNT(s.id) as set_count,
    SUM(s.weight_kg * s.reps) as calculated_volume_kg,
    GROUP_CONCAT(DISTINCT e.name) as exercises
FROM workouts w
LEFT JOIN sets s ON s.workout_id = w.id
LEFT JOIN exercises e ON s.exercise_id = e.id
WHERE w.user_id = :source_user_id
GROUP BY w.id
ORDER BY w.date DESC;

-- Query 1.5: Exercise distribution for source user
-- Expected: Shows which exercises are performed most
SELECT
    e.id as exercise_id,
    e.name as exercise_name,
    COUNT(s.id) as total_sets,
    AVG(s.weight_kg) as avg_weight_kg,
    MAX(s.weight_kg) as max_weight_kg,
    AVG(s.reps) as avg_reps,
    SUM(s.weight_kg * s.reps) as total_volume_kg
FROM sets s
JOIN workouts w ON s.workout_id = w.id
JOIN exercises e ON s.exercise_id = e.id
WHERE w.user_id = :source_user_id
GROUP BY e.id
ORDER BY total_sets DESC;

-- Query 1.6: Recovery assessments for source user
-- Expected: Should NOT be transferred (user-specific)
SELECT
    COUNT(*) as total_recovery_assessments,
    MIN(date) as earliest_assessment,
    MAX(date) as latest_assessment,
    AVG(total_score) as avg_recovery_score
FROM recovery_assessments
WHERE user_id = :source_user_id;

-- Query 1.7: Active sessions for source user
-- Expected: Should be cleared/transferred
SELECT
    user_id,
    workout_id,
    current_exercise_index,
    started_at,
    last_activity_at
FROM active_sessions
WHERE user_id = :source_user_id;

-- Query 1.8: Baseline for target user (before transfer)
-- Expected: Used to calculate delta after transfer
SELECT
    'Target User Baseline' as metric,
    COUNT(DISTINCT w.id) as existing_workouts,
    COUNT(s.id) as existing_sets,
    COALESCE(SUM(s.weight_kg * s.reps), 0) as existing_volume_kg
FROM workouts w
LEFT JOIN sets s ON s.workout_id = w.id
WHERE w.user_id = :target_user_id;

-- Query 1.9: Specific workout validation (if transferring single workout)
-- Expected: Complete snapshot of specific workout
SELECT
    w.*,
    COUNT(s.id) as set_count,
    GROUP_CONCAT(e.name) as exercises_list
FROM workouts w
LEFT JOIN sets s ON s.workout_id = w.id
LEFT JOIN exercises e ON s.exercise_id = e.id
WHERE w.id = :workout_id
GROUP BY w.id;

-- Query 1.10: VO2max sessions for source user
-- Expected: Cardio data that should be transferred with workouts
SELECT
    v.id,
    v.workout_id,
    v.protocol,
    v.duration_seconds,
    v.intervals_completed,
    v.average_hr,
    v.peak_hr,
    v.estimated_vo2max,
    w.user_id
FROM vo2max_sessions v
JOIN workouts w ON v.workout_id = w.id
WHERE w.user_id = :source_user_id;

-- ============================================================================
-- PHASE 2: POST-TRANSFER VALIDATION QUERIES
-- ============================================================================
-- Execute these AFTER performing the transfer to verify success

-- Query 2.1: Verify target user workout count increased
-- Expected: Should match source user count from Query 1.1
SELECT
    'After Transfer - Target User' as metric,
    COUNT(*) as total_workouts,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_workouts,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_workouts
FROM workouts
WHERE user_id = :target_user_id;

-- Query 2.2: Verify target user set count increased
-- Expected: Should match source user count from Query 1.2
SELECT
    'After Transfer - Target User' as metric,
    COUNT(s.id) as total_sets,
    COUNT(DISTINCT s.workout_id) as workouts_with_sets,
    COUNT(DISTINCT s.exercise_id) as unique_exercises
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = :target_user_id;

-- Query 2.3: Verify total volume preserved
-- Expected: Should match source user volume from Query 1.3
SELECT
    'After Transfer - Target User' as metric,
    SUM(s.weight_kg * s.reps) as total_volume_kg,
    COUNT(s.id) as total_sets
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = :target_user_id;

-- Query 2.4: Verify source user workouts were removed (if full transfer)
-- Expected: Should be 0 if all workouts transferred
SELECT
    'After Transfer - Source User' as metric,
    COUNT(*) as remaining_workouts
FROM workouts
WHERE user_id = :source_user_id;

-- Query 2.5: Verify source user sets were removed (if full transfer)
-- Expected: Should be 0 if all workouts transferred
SELECT
    'After Transfer - Source User' as metric,
    COUNT(s.id) as remaining_sets
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = :source_user_id;

-- Query 2.6: Verify all exercises are intact
-- Expected: All exercises from Query 1.5 should appear under target user
SELECT
    e.id as exercise_id,
    e.name as exercise_name,
    COUNT(s.id) as total_sets,
    AVG(s.weight_kg) as avg_weight_kg
FROM sets s
JOIN workouts w ON s.workout_id = w.id
JOIN exercises e ON s.exercise_id = e.id
WHERE w.user_id = :target_user_id
GROUP BY e.id
ORDER BY total_sets DESC;

-- Query 2.7: Verify workout metrics recalculated correctly
-- Expected: total_volume_kg and average_rir should match sets data
SELECT
    w.id as workout_id,
    w.total_volume_kg as stored_volume,
    COALESCE(SUM(s.weight_kg * s.reps), 0) as calculated_volume,
    ABS(w.total_volume_kg - COALESCE(SUM(s.weight_kg * s.reps), 0)) as volume_diff,
    w.average_rir as stored_avg_rir,
    AVG(s.rir) as calculated_avg_rir,
    COUNT(s.id) as set_count
FROM workouts w
LEFT JOIN sets s ON s.workout_id = w.id
WHERE w.user_id = :target_user_id
GROUP BY w.id
HAVING volume_diff > 0.01;  -- Flag discrepancies > 0.01 kg

-- Query 2.8: Verify VO2max sessions transferred correctly
-- Expected: All sessions from Query 1.10 should now belong to target user
SELECT
    v.id,
    v.workout_id,
    v.protocol,
    v.duration_seconds,
    w.user_id,
    w.date
FROM vo2max_sessions v
JOIN workouts w ON v.workout_id = w.id
WHERE w.user_id = :target_user_id
ORDER BY w.date DESC;

-- Query 2.9: Verify active sessions updated
-- Expected: Active sessions should reference target user
SELECT
    user_id,
    workout_id,
    current_exercise_index,
    started_at
FROM active_sessions
WHERE workout_id IN (
    SELECT id FROM workouts WHERE user_id = :target_user_id
);

-- Query 2.10: Delta calculation (before vs after)
-- Expected: Shows exact increase in target user's data
WITH target_before AS (
    -- This needs manual input from Query 1.8 results
    -- For automated testing, store Query 1.8 results and compare
    SELECT 0 as before_workouts, 0 as before_sets, 0.0 as before_volume
),
target_after AS (
    SELECT
        COUNT(DISTINCT w.id) as after_workouts,
        COUNT(s.id) as after_sets,
        COALESCE(SUM(s.weight_kg * s.reps), 0) as after_volume
    FROM workouts w
    LEFT JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = :target_user_id
)
SELECT
    a.after_workouts - b.before_workouts as workouts_added,
    a.after_sets - b.before_sets as sets_added,
    a.after_volume - b.before_volume as volume_added_kg
FROM target_before b, target_after a;

-- ============================================================================
-- PHASE 3: DATA INTEGRITY CHECK QUERIES
-- ============================================================================
-- Execute these to ensure no database corruption occurred

-- Query 3.1: Check for orphaned sets (sets without valid workout)
-- Expected: Should return 0 rows
SELECT
    s.id as orphaned_set_id,
    s.workout_id,
    s.exercise_id,
    s.weight_kg,
    s.reps
FROM sets s
LEFT JOIN workouts w ON s.workout_id = w.id
WHERE w.id IS NULL;

-- Query 3.2: Check for orphaned vo2max sessions
-- Expected: Should return 0 rows
SELECT
    v.id as orphaned_vo2max_id,
    v.workout_id,
    v.protocol
FROM vo2max_sessions v
LEFT JOIN workouts w ON v.workout_id = w.id
WHERE w.id IS NULL;

-- Query 3.3: Check for orphaned active sessions
-- Expected: Should return 0 rows
SELECT
    a.user_id,
    a.workout_id
FROM active_sessions a
LEFT JOIN workouts w ON a.workout_id = w.id
WHERE w.id IS NULL;

-- Query 3.4: Check for broken exercise foreign keys
-- Expected: Should return 0 rows
SELECT
    s.id as set_id,
    s.exercise_id,
    s.workout_id
FROM sets s
LEFT JOIN exercises e ON s.exercise_id = e.id
WHERE e.id IS NULL;

-- Query 3.5: Check for broken program_day foreign keys
-- Expected: Should return 0 rows
SELECT
    w.id as workout_id,
    w.program_day_id,
    w.user_id
FROM workouts w
LEFT JOIN program_days pd ON w.program_day_id = pd.id
WHERE pd.id IS NULL;

-- Query 3.6: Verify set numbers are sequential per workout
-- Expected: Should return 0 rows (set_number should be 1, 2, 3...)
WITH set_sequence AS (
    SELECT
        workout_id,
        exercise_id,
        set_number,
        ROW_NUMBER() OVER (PARTITION BY workout_id, exercise_id ORDER BY timestamp) as expected_set_number
    FROM sets
    WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = :target_user_id)
)
SELECT
    workout_id,
    exercise_id,
    set_number,
    expected_set_number
FROM set_sequence
WHERE set_number != expected_set_number;

-- Query 3.7: Check for duplicate workouts (same user, date, program_day)
-- Expected: Should return 0 rows
SELECT
    user_id,
    program_day_id,
    date,
    COUNT(*) as duplicate_count
FROM workouts
WHERE user_id = :target_user_id
GROUP BY user_id, program_day_id, date
HAVING COUNT(*) > 1;

-- Query 3.8: Verify timestamp consistency (sets within workout timeframe)
-- Expected: Should return 0 rows
SELECT
    s.id as set_id,
    s.workout_id,
    s.timestamp as set_timestamp,
    w.started_at as workout_started,
    w.completed_at as workout_completed
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = :target_user_id
  AND w.started_at IS NOT NULL
  AND w.completed_at IS NOT NULL
  AND (s.timestamp < w.started_at OR s.timestamp > w.completed_at);

-- Query 3.9: Verify RIR values are in valid range (0-4)
-- Expected: Should return 0 rows
SELECT
    s.id as set_id,
    s.workout_id,
    s.rir,
    w.user_id
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = :target_user_id
  AND (s.rir < 0 OR s.rir > 4);

-- Query 3.10: Verify weight values are realistic (0-500kg)
-- Expected: Should return 0 rows
SELECT
    s.id as set_id,
    s.workout_id,
    s.exercise_id,
    e.name as exercise_name,
    s.weight_kg,
    w.user_id
FROM sets s
JOIN workouts w ON s.workout_id = w.id
JOIN exercises e ON s.exercise_id = e.id
WHERE w.user_id = :target_user_id
  AND (s.weight_kg < 0 OR s.weight_kg > 500);

-- Query 3.11: Verify foreign key constraints are enabled
-- Expected: Should return 'foreign_keys = 1'
PRAGMA foreign_keys;

-- Query 3.12: Full database integrity check
-- Expected: Should return 'ok'
PRAGMA integrity_check;

-- Query 3.13: Verify synced flags are preserved
-- Expected: Shows distribution of synced vs unsynced records
SELECT
    'Workouts' as table_name,
    synced,
    COUNT(*) as record_count
FROM workouts
WHERE user_id = :target_user_id
GROUP BY synced
UNION ALL
SELECT
    'Sets' as table_name,
    s.synced,
    COUNT(*) as record_count
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = :target_user_id
GROUP BY s.synced;

-- Query 3.14: Compare source and target data (if partial transfer)
-- Expected: Shows what remains in source vs what's in target
SELECT
    'Source User' as location,
    COUNT(DISTINCT w.id) as workouts,
    COUNT(s.id) as sets,
    COALESCE(SUM(s.weight_kg * s.reps), 0) as total_volume_kg
FROM workouts w
LEFT JOIN sets s ON s.workout_id = w.id
WHERE w.user_id = :source_user_id
UNION ALL
SELECT
    'Target User' as location,
    COUNT(DISTINCT w.id) as workouts,
    COUNT(s.id) as sets,
    COALESCE(SUM(s.weight_kg * s.reps), 0) as total_volume_kg
FROM workouts w
LEFT JOIN sets s ON s.workout_id = w.id
WHERE w.user_id = :target_user_id;

-- Query 3.15: Verify no data loss (total system count)
-- Expected: Total sets in database should remain constant
SELECT
    COUNT(*) as total_sets_in_database,
    COUNT(DISTINCT workout_id) as total_workouts_referenced,
    COUNT(DISTINCT exercise_id) as total_exercises_used
FROM sets;

-- ============================================================================
-- END OF VALIDATION QUERIES
-- ============================================================================
