-- ============================================================================
-- PUSH B WORKOUT TRANSFER - VERIFICATION QUERIES
-- ============================================================================
-- Purpose: Standalone queries for investigating and verifying the transfer
-- Usage: Run these queries individually to check status at each stage
-- ============================================================================

-- ============================================================================
-- SECTION 1: CURRENT STATE INSPECTION (Before Transfer)
-- ============================================================================

-- 1.1 Find all "Push B" workouts in the system
SELECT
    w.id AS workout_id,
    w.user_id,
    u.username,
    pd.day_name,
    w.date,
    w.status,
    w.started_at,
    w.completed_at,
    w.total_volume_kg,
    COUNT(DISTINCT s.id) AS total_sets,
    SUM(s.weight_kg * s.reps) AS total_volume_calculated
FROM workouts w
JOIN users u ON w.user_id = u.id
JOIN program_days pd ON w.program_day_id = pd.id
LEFT JOIN sets s ON s.workout_id = w.id
WHERE pd.day_name = 'Push B'
GROUP BY w.id
ORDER BY w.date DESC, w.id DESC;

-- 1.2 Get detailed information about a specific workout
-- Replace WORKOUT_ID with actual ID
SELECT
    w.*,
    pd.day_name,
    pd.day_type,
    p.name AS program_name,
    p.mesocycle_week,
    p.mesocycle_phase,
    u.username
FROM workouts w
JOIN users u ON w.user_id = u.id
JOIN program_days pd ON w.program_day_id = pd.id
JOIN programs p ON pd.program_id = p.id
WHERE w.id = WORKOUT_ID;

-- 1.3 Get all sets for a specific workout
-- Replace WORKOUT_ID with actual ID
SELECT
    s.id,
    s.set_number,
    s.exercise_id,
    e.name AS exercise_name,
    s.weight_kg,
    s.reps,
    s.rir,
    s.timestamp,
    s.notes,
    s.synced,
    -- Calculate 1RM using Epley formula
    ROUND(s.weight_kg * (1 + (s.reps - s.rir) / 30.0), 2) AS estimated_1rm
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
WHERE s.workout_id = WORKOUT_ID
ORDER BY s.set_number;

-- 1.4 Check if target user (118) has existing "Push B" program_day
SELECT
    pd.id AS program_day_id,
    pd.day_name,
    pd.day_type,
    p.id AS program_id,
    p.user_id,
    p.name AS program_name,
    p.mesocycle_week,
    p.mesocycle_phase,
    COUNT(pe.id) AS exercise_count
FROM program_days pd
JOIN programs p ON pd.program_id = p.id
LEFT JOIN program_exercises pe ON pe.program_day_id = pd.id
WHERE p.user_id = 118
  AND pd.day_name = 'Push B'
GROUP BY pd.id;

-- 1.5 List all program_days for target user
SELECT
    pd.id,
    pd.day_name,
    pd.day_type,
    pd.day_of_week,
    p.name AS program_name,
    COUNT(pe.id) AS exercise_count
FROM program_days pd
JOIN programs p ON pd.program_id = p.id
LEFT JOIN program_exercises pe ON pe.program_day_id = pd.id
WHERE p.user_id = 118
GROUP BY pd.id
ORDER BY pd.day_of_week;

-- 1.6 Get target user's current workout count
SELECT
    u.id,
    u.username,
    COUNT(w.id) AS total_workouts,
    COUNT(DISTINCT pd.day_name) AS unique_workout_types,
    SUM(CASE WHEN pd.day_name = 'Push B' THEN 1 ELSE 0 END) AS push_b_count
FROM users u
LEFT JOIN workouts w ON w.user_id = u.id
LEFT JOIN program_days pd ON w.program_day_id = pd.id
WHERE u.id = 118
GROUP BY u.id;

-- ============================================================================
-- SECTION 2: TRANSFER DECISION SUPPORT
-- ============================================================================

-- 2.1 Compare source and target user's Push B program exercises
-- Replace SOURCE_USER_ID with actual source user ID
SELECT
    'Source User' AS user_type,
    pd.id AS program_day_id,
    pe.order_index,
    e.name AS exercise_name,
    pe.sets,
    pe.reps,
    pe.rir
FROM program_exercises pe
JOIN exercises e ON pe.exercise_id = e.id
JOIN program_days pd ON pe.program_day_id = pd.id
JOIN programs p ON pd.program_id = p.id
WHERE p.user_id = SOURCE_USER_ID
  AND pd.day_name = 'Push B'
ORDER BY pe.order_index

UNION ALL

SELECT
    'Target User' AS user_type,
    pd.id AS program_day_id,
    pe.order_index,
    e.name AS exercise_name,
    pe.sets,
    pe.reps,
    pe.rir
FROM program_exercises pe
JOIN exercises e ON pe.exercise_id = e.id
JOIN program_days pd ON pe.program_day_id = pd.id
JOIN programs p ON pd.program_id = p.id
WHERE p.user_id = 118
  AND pd.day_name = 'Push B'
ORDER BY pe.order_index;

-- 2.2 Check for orphaned records (data integrity check)
SELECT 'Orphaned Sets' AS check_type, COUNT(*) AS count
FROM sets s
WHERE NOT EXISTS (SELECT 1 FROM workouts w WHERE w.id = s.workout_id)

UNION ALL

SELECT 'Orphaned Workouts' AS check_type, COUNT(*) AS count
FROM workouts w
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.user_id)

UNION ALL

SELECT 'Orphaned Program Days' AS check_type, COUNT(*) AS count
FROM program_days pd
WHERE NOT EXISTS (SELECT 1 FROM programs p WHERE p.id = pd.program_id);

-- ============================================================================
-- SECTION 3: POST-TRANSFER VERIFICATION
-- ============================================================================

-- 3.1 Verify workout ownership changed
-- Replace WORKOUT_ID with actual ID
SELECT
    'Workout Ownership' AS verification_type,
    w.id,
    w.user_id,
    u.username,
    CASE
        WHEN w.user_id = 118 THEN 'SUCCESS'
        ELSE 'FAILED'
    END AS status
FROM workouts w
JOIN users u ON w.user_id = u.id
WHERE w.id = WORKOUT_ID;

-- 3.2 Verify all sets still linked to workout
-- Replace WORKOUT_ID with actual ID
-- Replace EXPECTED_SET_COUNT with count from STEP 2
SELECT
    'Sets Linkage' AS verification_type,
    COUNT(*) AS actual_count,
    EXPECTED_SET_COUNT AS expected_count,
    CASE
        WHEN COUNT(*) = EXPECTED_SET_COUNT THEN 'SUCCESS'
        ELSE 'FAILED'
    END AS status
FROM sets
WHERE workout_id = WORKOUT_ID;

-- 3.3 Verify program_day ownership
-- Replace WORKOUT_ID with actual ID
SELECT
    'Program Day Ownership' AS verification_type,
    pd.id AS program_day_id,
    pd.day_name,
    p.user_id,
    CASE
        WHEN p.user_id = 118 THEN 'SUCCESS'
        WHEN p.user_id != 118 AND pd.day_name = 'Push B' THEN 'ACCEPTABLE (shared program_day)'
        ELSE 'REVIEW NEEDED'
    END AS status
FROM workouts w
JOIN program_days pd ON w.program_day_id = pd.id
JOIN programs p ON pd.program_id = p.id
WHERE w.id = WORKOUT_ID;

-- 3.4 Verify no duplicate workouts created
-- Replace WORKOUT_ID and date from workout
SELECT
    'Duplicate Detection' AS verification_type,
    COUNT(*) AS workout_count,
    CASE
        WHEN COUNT(*) = 1 THEN 'SUCCESS'
        ELSE 'FAILED - Duplicates exist'
    END AS status
FROM workouts
WHERE user_id = 118
  AND program_day_id = (SELECT program_day_id FROM workouts WHERE id = WORKOUT_ID)
  AND date = (SELECT date FROM workouts WHERE id = WORKOUT_ID);

-- 3.5 Full integrity check after transfer
-- Replace WORKOUT_ID with actual ID
SELECT
    w.id AS workout_id,
    w.user_id,
    u.username,
    pd.day_name,
    p.user_id AS program_owner_id,
    COUNT(s.id) AS set_count,
    SUM(CASE WHEN s.synced = 0 THEN 1 ELSE 0 END) AS unsynced_sets,
    CASE
        WHEN w.user_id = 118 THEN 'User ID correct'
        ELSE 'User ID WRONG'
    END AS user_check,
    CASE
        WHEN u.username = 'asigator@gmail.com' THEN 'Username correct'
        ELSE 'Username WRONG'
    END AS username_check,
    CASE
        WHEN COUNT(s.id) > 0 THEN 'Sets exist'
        ELSE 'No sets found'
    END AS sets_check
FROM workouts w
JOIN users u ON w.user_id = u.id
JOIN program_days pd ON w.program_day_id = pd.id
JOIN programs p ON pd.program_id = p.id
LEFT JOIN sets s ON s.workout_id = w.id
WHERE w.id = WORKOUT_ID
GROUP BY w.id;

-- ============================================================================
-- SECTION 4: ANALYTICS VERIFICATION
-- ============================================================================

-- 4.1 Verify workout appears in target user's history
SELECT
    w.id,
    w.date,
    pd.day_name,
    w.status,
    w.total_volume_kg,
    COUNT(s.id) AS sets_completed
FROM workouts w
JOIN program_days pd ON w.program_day_id = pd.id
LEFT JOIN sets s ON s.workout_id = w.id
WHERE w.user_id = 118
GROUP BY w.id
ORDER BY w.date DESC
LIMIT 20;

-- 4.2 Verify 1RM calculations include transferred sets
-- Replace EXERCISE_ID with an exercise from transferred workout
SELECT
    e.name AS exercise_name,
    MAX(s.weight_kg * (1 + (s.reps - s.rir) / 30.0)) AS estimated_1rm,
    w.date AS workout_date,
    s.weight_kg,
    s.reps,
    s.rir
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = 118
  AND s.exercise_id = EXERCISE_ID
GROUP BY e.id
ORDER BY estimated_1rm DESC;

-- 4.3 Verify volume trends include transferred workout
SELECT
    strftime('%Y-%W', w.date) AS week,
    pd.day_name,
    SUM(s.weight_kg * s.reps) AS total_volume
FROM workouts w
JOIN program_days pd ON w.program_day_id = pd.id
JOIN sets s ON s.workout_id = w.id
WHERE w.user_id = 118
  AND w.status = 'completed'
GROUP BY strftime('%Y-%W', w.date), pd.day_name
ORDER BY week DESC, pd.day_name;

-- ============================================================================
-- SECTION 5: BACKUP VERIFICATION
-- ============================================================================

-- 5.1 Verify backup tables exist
SELECT
    name,
    CASE
        WHEN name LIKE '%backup%' THEN 'Backup table'
        ELSE 'Production table'
    END AS table_type
FROM sqlite_master
WHERE type = 'table'
  AND (name = 'workouts' OR name LIKE '%backup%')
ORDER BY name;

-- 5.2 Compare production vs backup record counts
-- Replace WORKOUT_ID with actual ID
SELECT
    'Production workouts' AS table_name,
    COUNT(*) AS record_count
FROM workouts
WHERE id = WORKOUT_ID

UNION ALL

SELECT
    'Backup workouts' AS table_name,
    COUNT(*) AS record_count
FROM workouts_backup_20251004
WHERE id = WORKOUT_ID

UNION ALL

SELECT
    'Production sets' AS table_name,
    COUNT(*) AS record_count
FROM sets
WHERE workout_id = WORKOUT_ID

UNION ALL

SELECT
    'Backup sets' AS table_name,
    COUNT(*) AS record_count
FROM sets_backup_20251004
WHERE workout_id = WORKOUT_ID;

-- 5.3 Verify backup data integrity
-- Replace WORKOUT_ID with actual ID
SELECT
    'Backup Data Check' AS verification_type,
    b.id,
    b.user_id AS backup_user_id,
    w.user_id AS current_user_id,
    CASE
        WHEN b.user_id != w.user_id THEN 'Transfer confirmed (user_id changed)'
        WHEN b.user_id = w.user_id THEN 'No change detected'
        ELSE 'ERROR'
    END AS status
FROM workouts_backup_20251004 b
LEFT JOIN workouts w ON b.id = w.id
WHERE b.id = WORKOUT_ID;

-- ============================================================================
-- SECTION 6: SYNC STATUS CHECKS
-- ============================================================================

-- 6.1 Check sync status of transferred workout
-- Replace WORKOUT_ID with actual ID
SELECT
    w.id AS workout_id,
    w.synced AS workout_synced,
    COUNT(s.id) AS total_sets,
    SUM(CASE WHEN s.synced = 0 THEN 1 ELSE 0 END) AS unsynced_sets,
    SUM(CASE WHEN s.synced = 1 THEN 1 ELSE 0 END) AS synced_sets
FROM workouts w
LEFT JOIN sets s ON s.workout_id = w.id
WHERE w.id = WORKOUT_ID
GROUP BY w.id;

-- 6.2 Find all unsynced records for target user
SELECT
    'Workouts' AS record_type,
    COUNT(*) AS unsynced_count
FROM workouts
WHERE user_id = 118 AND synced = 0

UNION ALL

SELECT
    'Sets' AS record_type,
    COUNT(*) AS unsynced_count
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE w.user_id = 118 AND s.synced = 0;

-- ============================================================================
-- SECTION 7: ROLLBACK VERIFICATION
-- ============================================================================

-- 7.1 Verify rollback restored correct user_id
-- Run after rollback to verify restoration
-- Replace WORKOUT_ID with actual ID
SELECT
    w.id,
    w.user_id AS current_user_id,
    b.user_id AS backup_user_id,
    CASE
        WHEN w.user_id = b.user_id THEN 'Rollback SUCCESS'
        ELSE 'Rollback FAILED'
    END AS status
FROM workouts w
JOIN workouts_backup_20251004 b ON w.id = b.id
WHERE w.id = WORKOUT_ID;

-- 7.2 Verify rollback restored all sets
-- Replace WORKOUT_ID with actual ID
SELECT
    (SELECT COUNT(*) FROM sets WHERE workout_id = WORKOUT_ID) AS current_count,
    (SELECT COUNT(*) FROM sets_backup_20251004 WHERE workout_id = WORKOUT_ID) AS backup_count,
    CASE
        WHEN (SELECT COUNT(*) FROM sets WHERE workout_id = WORKOUT_ID) =
             (SELECT COUNT(*) FROM sets_backup_20251004 WHERE workout_id = WORKOUT_ID)
        THEN 'Rollback SUCCESS'
        ELSE 'Rollback FAILED'
    END AS status;

-- ============================================================================
-- SECTION 8: TROUBLESHOOTING QUERIES
-- ============================================================================

-- 8.1 Find workouts with mismatched user ownership
-- (workout.user_id != program.user_id)
SELECT
    w.id AS workout_id,
    w.user_id AS workout_user_id,
    p.user_id AS program_user_id,
    pd.day_name,
    u1.username AS workout_owner,
    u2.username AS program_owner
FROM workouts w
JOIN program_days pd ON w.program_day_id = pd.id
JOIN programs p ON pd.program_id = p.id
JOIN users u1 ON w.user_id = u1.id
JOIN users u2 ON p.user_id = u2.id
WHERE w.user_id != p.user_id;

-- 8.2 Find sets orphaned from workouts
SELECT
    s.id,
    s.workout_id,
    s.exercise_id,
    e.name AS exercise_name
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
WHERE NOT EXISTS (
    SELECT 1 FROM workouts w WHERE w.id = s.workout_id
);

-- 8.3 Check foreign key constraint violations
PRAGMA foreign_key_check;

-- 8.4 Analyze database integrity
PRAGMA integrity_check;

-- ============================================================================
-- SECTION 9: PERFORMANCE VERIFICATION
-- ============================================================================

-- 9.1 Query plan for user's workout retrieval
EXPLAIN QUERY PLAN
SELECT w.*, pd.day_name
FROM workouts w
JOIN program_days pd ON w.program_day_id = pd.id
WHERE w.user_id = 118
ORDER BY w.date DESC;

-- 9.2 Verify indices are being used
SELECT
    name AS index_name,
    tbl_name AS table_name,
    sql
FROM sqlite_master
WHERE type = 'index'
  AND tbl_name IN ('workouts', 'sets', 'program_days', 'programs')
ORDER BY tbl_name, name;

-- ============================================================================
-- NOTES
-- ============================================================================
/*
Usage Instructions:
1. Copy the query you want to run
2. Replace placeholders:
   - WORKOUT_ID: Actual workout ID to transfer
   - SOURCE_USER_ID: Source user's ID (from Agent 3)
   - EXPECTED_SET_COUNT: Count from STEP 2
   - EXERCISE_ID: Specific exercise to check
3. Run in sqlite3 or through Node.js better-sqlite3
4. Review output and compare to expected results

Placeholder Reference:
- WORKOUT_ID: The workout being transferred
- SOURCE_USER_ID: Original owner's user ID
- 118: Target user ID (asigator@gmail.com) - hardcoded
- EXPECTED_SET_COUNT: Number from backup verification

Common Issues:
- "no such table": Backup tables not created yet (run STEP 1)
- "no rows returned": Wrong WORKOUT_ID or already transferred
- "FOREIGN KEY constraint failed": Target user/program doesn't exist
*/
