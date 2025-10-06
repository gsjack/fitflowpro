-- ============================================================================
-- WORKOUT TRANSFER SCRIPT: Push B to asigator@gmail.com (User ID 118)
-- ============================================================================
-- Purpose: Transfer Push B workout from source user to target user
-- Target User: asigator@gmail.com (User ID 118)
-- Source User: TBD (to be identified by Agent 3)
-- Workout: Push B
--
-- IMPORTANT: This is a RESEARCH script. DO NOT EXECUTE without verification!
-- ============================================================================

-- ============================================================================
-- STEP 0: Pre-flight Checks (Run these first to verify assumptions)
-- ============================================================================

-- Verify target user exists
SELECT 'Target User Verification' AS step;
SELECT id, username, created_at
FROM users
WHERE username = 'asigator@gmail.com';
-- Expected: User ID 118

-- Find source workout (assumes source user has been identified)
-- Replace SOURCE_USER_ID with actual value from Agent 3
SELECT 'Source Workout Identification' AS step;
SELECT
    w.id AS workout_id,
    w.user_id AS source_user_id,
    u.username AS source_username,
    pd.day_name,
    w.date,
    w.status,
    COUNT(s.id) AS total_sets
FROM workouts w
JOIN users u ON w.user_id = u.id
JOIN program_days pd ON w.program_day_id = pd.id
LEFT JOIN sets s ON s.workout_id = w.id
WHERE pd.day_name = 'Push B'
  -- AND w.user_id = SOURCE_USER_ID  -- Uncomment and replace with actual source user ID
GROUP BY w.id
ORDER BY w.date DESC;

-- Verify program_day associations
SELECT 'Program Day Verification' AS step;
SELECT
    pd.id AS program_day_id,
    pd.day_name,
    pd.day_type,
    p.id AS program_id,
    p.user_id,
    p.name AS program_name,
    COUNT(pe.id) AS exercise_count
FROM program_days pd
JOIN programs p ON pd.program_id = p.id
LEFT JOIN program_exercises pe ON pe.program_day_id = pd.id
WHERE pd.day_name = 'Push B'
GROUP BY pd.id;

-- ============================================================================
-- STEP 1: Backup Current State (MANDATORY before any modifications)
-- ============================================================================

-- Create backup tables
CREATE TABLE IF NOT EXISTS workouts_backup_20251004 AS
SELECT * FROM workouts WHERE 1=0;

CREATE TABLE IF NOT EXISTS sets_backup_20251004 AS
SELECT * FROM sets WHERE 1=0;

CREATE TABLE IF NOT EXISTS programs_backup_20251004 AS
SELECT * FROM programs WHERE 1=0;

CREATE TABLE IF NOT EXISTS program_days_backup_20251004 AS
SELECT * FROM program_days WHERE 1=0;

-- Insert current state into backup
-- Replace WORKOUT_ID with actual workout ID
INSERT INTO workouts_backup_20251004
SELECT * FROM workouts WHERE id = WORKOUT_ID;

INSERT INTO sets_backup_20251004
SELECT * FROM sets WHERE workout_id = WORKOUT_ID;

-- Backup program and program_day if they will be modified
INSERT INTO programs_backup_20251004
SELECT p.* FROM programs p
JOIN program_days pd ON p.id = pd.program_id
JOIN workouts w ON w.program_day_id = pd.id
WHERE w.id = WORKOUT_ID;

INSERT INTO program_days_backup_20251004
SELECT pd.* FROM program_days pd
JOIN workouts w ON w.program_day_id = pd.id
WHERE w.id = WORKOUT_ID;

-- ============================================================================
-- STEP 2: Verification Queries (Run before transaction)
-- ============================================================================

-- Count records to be updated
SELECT 'Records to Update' AS step;
SELECT
    (SELECT COUNT(*) FROM workouts WHERE id = WORKOUT_ID) AS workouts_count,
    (SELECT COUNT(*) FROM sets WHERE workout_id = WORKOUT_ID) AS sets_count,
    (SELECT COUNT(*) FROM program_days pd
     JOIN workouts w ON w.program_day_id = pd.id
     WHERE w.id = WORKOUT_ID) AS program_days_count;

-- ============================================================================
-- STEP 3: Transfer Transaction (Atomic operation)
-- ============================================================================

BEGIN TRANSACTION;

-- Option A: If target user already has a "Push B" program_day
-- Update workout to point to target user's existing Push B program_day
UPDATE workouts
SET
    user_id = 118,  -- asigator@gmail.com
    program_day_id = (
        SELECT pd.id
        FROM program_days pd
        JOIN programs p ON pd.program_id = p.id
        WHERE p.user_id = 118
          AND pd.day_name = 'Push B'
        LIMIT 1
    ),
    updated_at = unixepoch('now') * 1000
WHERE id = WORKOUT_ID
  AND EXISTS (
      SELECT 1 FROM program_days pd
      JOIN programs p ON pd.program_id = p.id
      WHERE p.user_id = 118 AND pd.day_name = 'Push B'
  );

-- Option B: If target user does NOT have a "Push B" program_day
-- Transfer the entire program_day to target user's program

-- First, check if target user has a program
INSERT OR IGNORE INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
SELECT
    118,  -- asigator@gmail.com
    'Transferred Program',
    1,
    'mev',
    unixepoch('now') * 1000
WHERE NOT EXISTS (
    SELECT 1 FROM programs WHERE user_id = 118
);

-- Transfer program_day to target user's program
UPDATE program_days
SET program_id = (
    SELECT id FROM programs WHERE user_id = 118 ORDER BY created_at DESC LIMIT 1
)
WHERE id = (
    SELECT program_day_id FROM workouts WHERE id = WORKOUT_ID
)
  AND NOT EXISTS (
      SELECT 1 FROM program_days pd
      JOIN programs p ON pd.program_id = p.id
      WHERE p.user_id = 118 AND pd.day_name = 'Push B'
  );

-- Update workout to belong to target user
UPDATE workouts
SET
    user_id = 118,
    synced = 0,  -- Mark as needing sync
    updated_at = unixepoch('now') * 1000
WHERE id = WORKOUT_ID;

-- Note: Sets table does NOT have user_id column, so no update needed
-- Sets are linked to workout through workout_id foreign key

-- Verification within transaction
SELECT 'Post-Update Verification' AS step;
SELECT
    w.id AS workout_id,
    w.user_id,
    u.username,
    pd.day_name,
    p.name AS program_name,
    COUNT(s.id) AS sets_count
FROM workouts w
JOIN users u ON w.user_id = u.id
JOIN program_days pd ON w.program_day_id = pd.id
JOIN programs p ON pd.program_id = p.id
LEFT JOIN sets s ON s.workout_id = w.id
WHERE w.id = WORKOUT_ID
GROUP BY w.id;

-- If everything looks correct, commit. Otherwise, rollback.
-- COMMIT;  -- Uncomment to finalize
-- ROLLBACK;  -- Uncomment to undo

-- ============================================================================
-- STEP 4: Post-Transfer Verification (Run after COMMIT)
-- ============================================================================

-- Verify workout ownership
SELECT 'Workout Ownership Verification' AS step;
SELECT
    w.id,
    w.user_id,
    u.username,
    pd.day_name,
    w.date,
    w.status,
    w.total_volume_kg
FROM workouts w
JOIN users u ON w.user_id = u.id
JOIN program_days pd ON w.program_day_id = pd.id
WHERE w.id = WORKOUT_ID;

-- Verify sets are still linked
SELECT 'Sets Linkage Verification' AS step;
SELECT
    s.id,
    s.workout_id,
    s.exercise_id,
    e.name AS exercise_name,
    s.weight_kg,
    s.reps,
    s.rir
FROM sets s
JOIN exercises e ON s.exercise_id = e.id
WHERE s.workout_id = WORKOUT_ID
ORDER BY s.set_number;

-- Verify program_day linkage
SELECT 'Program Day Linkage Verification' AS step;
SELECT
    pd.id,
    pd.day_name,
    p.user_id,
    p.name AS program_name,
    COUNT(pe.id) AS exercise_count
FROM program_days pd
JOIN programs p ON pd.program_id = p.id
LEFT JOIN program_exercises pe ON pe.program_day_id = pd.id
WHERE pd.id = (SELECT program_day_id FROM workouts WHERE id = WORKOUT_ID)
GROUP BY pd.id;

-- Count target user's workouts
SELECT 'Target User Total Workouts' AS step;
SELECT
    u.username,
    COUNT(w.id) AS total_workouts,
    SUM(CASE WHEN pd.day_name = 'Push B' THEN 1 ELSE 0 END) AS push_b_workouts
FROM users u
LEFT JOIN workouts w ON w.user_id = u.id
LEFT JOIN program_days pd ON w.program_day_id = pd.id
WHERE u.id = 118
GROUP BY u.id;

-- ============================================================================
-- STEP 5: Rollback Procedure (If issues found)
-- ============================================================================

-- To rollback the transfer:
/*
BEGIN TRANSACTION;

-- Restore from backup
DELETE FROM workouts WHERE id = WORKOUT_ID;
INSERT INTO workouts SELECT * FROM workouts_backup_20251004 WHERE id = WORKOUT_ID;

DELETE FROM sets WHERE workout_id = WORKOUT_ID;
INSERT INTO sets SELECT * FROM sets_backup_20251004 WHERE workout_id = WORKOUT_ID;

-- Restore program_days if modified
DELETE FROM program_days WHERE id IN (SELECT id FROM program_days_backup_20251004);
INSERT INTO program_days SELECT * FROM program_days_backup_20251004;

-- Restore programs if modified
DELETE FROM programs WHERE id IN (SELECT id FROM programs_backup_20251004);
INSERT INTO programs SELECT * FROM programs_backup_20251004;

COMMIT;
*/

-- ============================================================================
-- STEP 6: Cleanup (After successful verification)
-- ============================================================================

-- Drop backup tables (only after confirming success)
/*
DROP TABLE IF EXISTS workouts_backup_20251004;
DROP TABLE IF EXISTS sets_backup_20251004;
DROP TABLE IF EXISTS programs_backup_20251004;
DROP TABLE IF EXISTS program_days_backup_20251004;
*/

-- ============================================================================
-- EXECUTION CHECKLIST
-- ============================================================================
/*
[ ] 1. Replace SOURCE_USER_ID with actual source user ID from Agent 3
[ ] 2. Replace WORKOUT_ID with actual workout ID from Agent 3
[ ] 3. Run STEP 0 pre-flight checks
[ ] 4. Create backups (STEP 1)
[ ] 5. Run verification queries (STEP 2)
[ ] 6. Decide on Option A or B based on whether target has Push B program_day
[ ] 7. Execute transfer transaction (STEP 3)
[ ] 8. Review verification output within transaction
[ ] 9. If correct: COMMIT; If wrong: ROLLBACK;
[ ] 10. Run post-transfer verification (STEP 4)
[ ] 11. Verify target user can access workout in mobile app
[ ] 12. Clean up backup tables (STEP 6) - only after 24-48h confirmation
*/

-- ============================================================================
-- NOTES
-- ============================================================================
/*
Database Schema Relationships:
- workouts.user_id → users.id (direct ownership)
- workouts.program_day_id → program_days.id (workout template reference)
- program_days.program_id → programs.id (program structure)
- programs.user_id → users.id (program ownership)
- sets.workout_id → workouts.id (set belongs to workout)
- sets.exercise_id → exercises.id (denormalized for performance)

Key Insight:
- Sets table does NOT have user_id column
- Set ownership is inherited through workout_id → workouts.user_id
- No need to update sets table directly

Transfer Strategies:
1. Option A (Preferred): Map to existing Push B program_day for target user
   - Preserves target user's program structure
   - Maintains exercise consistency
   - Less data modification

2. Option B (Fallback): Transfer program_day to target user
   - Required if target user has no Push B program_day
   - Creates new program if target has no programs
   - More complex but handles edge cases

Backup Strategy:
- Create dated backup tables (workouts_backup_20251004)
- Keep backups for 24-48h minimum before cleanup
- Allows rollback if issues discovered in mobile app
- Does not affect database performance (separate tables)

Testing Recommendations:
1. Test in development environment first
2. Verify target user can see workout in mobile app
3. Verify all sets are visible and editable
4. Verify analytics include transferred workout
5. Confirm sync status updates correctly
*/
