# Workout Transfer Validation Test Plan

## Overview

This document provides a comprehensive manual testing plan for validating the workout transfer operation between users in the FitFlow Pro database. The transfer operation moves all workout data (workouts, sets, VO2max sessions) from one user to another while maintaining data integrity.

## Test Environment

- **Database**: SQLite with WAL mode enabled
- **Location**: `/mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db`
- **Validation Queries**: `validation_queries_workout_transfer.sql`
- **Foreign Keys**: Must be enabled (`PRAGMA foreign_keys = ON`)

## Prerequisites

Before starting any transfer operation:

1. **Backup Database**
   ```bash
   cp /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db \
      /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db.backup_$(date +%Y%m%d_%H%M%S)
   ```

2. **Verify Database Integrity**
   ```bash
   cd /mnt/1000gb/Fitness/fitflowpro/backend
   node -e "const db = require('better-sqlite3')('data/fitflow.db'); \
            console.log(db.pragma('integrity_check')); \
            db.close();"
   ```
   Expected output: `[ { integrity_check: 'ok' } ]`

3. **Verify Foreign Keys Enabled**
   ```bash
   node -e "const db = require('better-sqlite3')('data/fitflow.db'); \
            console.log(db.pragma('foreign_keys')); \
            db.close();"
   ```
   Expected output: `[ { foreign_keys: 1 } ]`

4. **Identify Source and Target Users**
   ```bash
   node -e "const db = require('better-sqlite3')('data/fitflow.db'); \
            const users = db.prepare('SELECT id, username FROM users WHERE id IN (?, ?)').all(151, 1); \
            console.log(JSON.stringify(users, null, 2)); \
            db.close();"
   ```

## Test Execution Phases

### Phase 1: Pre-Transfer Validation (CRITICAL)

**Objective**: Capture baseline metrics before any data modification.

**Steps**:

1. **Execute Pre-Transfer Queries** (Queries 1.1 - 1.10 from validation SQL)

   Create a helper script to execute all pre-transfer queries:

   ```javascript
   // File: pre_transfer_snapshot.js
   const Database = require('better-sqlite3');
   const fs = require('fs');

   const SOURCE_USER_ID = 151;
   const TARGET_USER_ID = 1;

   const db = new Database('data/fitflow.db', { readonly: true });

   const results = {
     timestamp: new Date().toISOString(),
     source_user_id: SOURCE_USER_ID,
     target_user_id: TARGET_USER_ID,
   };

   // Query 1.1: Source user workout count
   results.source_workouts = db.prepare(`
     SELECT
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
       COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
       COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started,
       COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
     FROM workouts
     WHERE user_id = ?
   `).get(SOURCE_USER_ID);

   // Query 1.2: Source user sets count
   results.source_sets = db.prepare(`
     SELECT
       COUNT(s.id) as total,
       COUNT(DISTINCT s.workout_id) as workouts_with_sets,
       COUNT(DISTINCT s.exercise_id) as unique_exercises,
       AVG(s.weight_kg) as avg_weight,
       AVG(s.reps) as avg_reps,
       AVG(s.rir) as avg_rir
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE w.user_id = ?
   `).get(SOURCE_USER_ID);

   // Query 1.3: Source user total volume
   results.source_volume = db.prepare(`
     SELECT
       SUM(s.weight_kg * s.reps) as total_volume_kg,
       COUNT(s.id) as total_sets,
       MIN(s.timestamp) as earliest_timestamp,
       MAX(s.timestamp) as latest_timestamp
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE w.user_id = ?
   `).get(SOURCE_USER_ID);

   // Query 1.4: Source user workout details
   results.source_workout_details = db.prepare(`
     SELECT
       w.id,
       w.program_day_id,
       w.date,
       w.status,
       w.total_volume_kg,
       w.average_rir,
       COUNT(s.id) as set_count,
       SUM(s.weight_kg * s.reps) as calculated_volume
     FROM workouts w
     LEFT JOIN sets s ON s.workout_id = w.id
     WHERE w.user_id = ?
     GROUP BY w.id
     ORDER BY w.date DESC
   `).all(SOURCE_USER_ID);

   // Query 1.5: Source user exercise distribution
   results.source_exercises = db.prepare(`
     SELECT
       e.id,
       e.name,
       COUNT(s.id) as total_sets,
       AVG(s.weight_kg) as avg_weight,
       MAX(s.weight_kg) as max_weight,
       SUM(s.weight_kg * s.reps) as total_volume
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     JOIN exercises e ON s.exercise_id = e.id
     WHERE w.user_id = ?
     GROUP BY e.id
     ORDER BY total_sets DESC
   `).all(SOURCE_USER_ID);

   // Query 1.6: Source user recovery assessments (should NOT transfer)
   results.source_recovery = db.prepare(`
     SELECT
       COUNT(*) as total,
       MIN(date) as earliest,
       MAX(date) as latest,
       AVG(total_score) as avg_score
     FROM recovery_assessments
     WHERE user_id = ?
   `).get(SOURCE_USER_ID);

   // Query 1.7: Source user active sessions
   results.source_active_sessions = db.prepare(`
     SELECT *
     FROM active_sessions
     WHERE user_id = ?
   `).all(SOURCE_USER_ID);

   // Query 1.8: Target user baseline (before transfer)
   results.target_baseline = db.prepare(`
     SELECT
       COUNT(DISTINCT w.id) as existing_workouts,
       COUNT(s.id) as existing_sets,
       COALESCE(SUM(s.weight_kg * s.reps), 0) as existing_volume_kg
     FROM workouts w
     LEFT JOIN sets s ON s.workout_id = w.id
     WHERE w.user_id = ?
   `).get(TARGET_USER_ID);

   // Query 1.10: Source user VO2max sessions
   results.source_vo2max = db.prepare(`
     SELECT
       v.id,
       v.workout_id,
       v.protocol,
       v.duration_seconds,
       v.intervals_completed,
       v.average_hr,
       v.peak_hr,
       v.estimated_vo2max
     FROM vo2max_sessions v
     JOIN workouts w ON v.workout_id = w.id
     WHERE w.user_id = ?
   `).all(SOURCE_USER_ID);

   db.close();

   // Save snapshot to file
   fs.writeFileSync(
     `pre_transfer_snapshot_${SOURCE_USER_ID}_to_${TARGET_USER_ID}_${Date.now()}.json`,
     JSON.stringify(results, null, 2)
   );

   console.log('Pre-transfer snapshot saved');
   console.log(JSON.stringify(results, null, 2));
   ```

2. **Review Snapshot Data**

   Manually review the generated JSON file and verify:
   - ✅ Source user has workouts to transfer
   - ✅ Source user has sets associated with workouts
   - ✅ Volume calculations are reasonable
   - ✅ No obvious data corruption (null values, negative numbers)
   - ✅ Target user baseline is captured

3. **Document Expected Outcomes**

   Based on the snapshot, calculate expected post-transfer values:

   ```
   Expected after transfer:
   - Target user workouts: [target_baseline.existing_workouts] + [source_workouts.total] = [TOTAL]
   - Target user sets: [target_baseline.existing_sets] + [source_sets.total] = [TOTAL]
   - Target user volume: [target_baseline.existing_volume_kg] + [source_volume.total_volume_kg] = [TOTAL]
   - Source user workouts: 0 (if full transfer)
   - Source user sets: 0 (if full transfer)
   ```

### Phase 2: Execute Transfer Operation

**Objective**: Perform the actual data transfer using the seed script.

**Steps**:

1. **Review Transfer Script**

   Ensure the transfer script (`seed_user_151.js`) contains:
   - ✅ Correct source and target user IDs
   - ✅ Transaction wrapping (rollback on error)
   - ✅ Foreign key constraint handling
   - ✅ Proper UPDATE statements for workouts, sets, active_sessions

2. **Execute Transfer in Test Mode** (if available)

   If possible, test on a database copy first:
   ```bash
   cp data/fitflow.db data/fitflow_test.db
   # Modify script to use fitflow_test.db
   node seed_user_151.js
   ```

3. **Execute Production Transfer**

   ```bash
   cd /mnt/1000gb/Fitness/fitflowpro/backend
   node seed_user_151.js
   ```

4. **Capture Transfer Output**

   Save the script output to verify:
   - Number of workouts updated
   - Number of sets updated
   - Number of active sessions updated
   - Any error messages

### Phase 3: Post-Transfer Validation (CRITICAL)

**Objective**: Verify data was transferred correctly and no corruption occurred.

**Steps**:

1. **Execute Post-Transfer Queries** (Queries 2.1 - 2.10 from validation SQL)

   Create post-transfer verification script:

   ```javascript
   // File: post_transfer_verification.js
   const Database = require('better-sqlite3');
   const fs = require('fs');

   const SOURCE_USER_ID = 151;
   const TARGET_USER_ID = 1;

   // Load pre-transfer snapshot for comparison
   const snapshotFile = fs.readdirSync('.')
     .filter(f => f.startsWith(`pre_transfer_snapshot_${SOURCE_USER_ID}_to_${TARGET_USER_ID}`))
     .sort()
     .reverse()[0];

   if (!snapshotFile) {
     console.error('ERROR: Pre-transfer snapshot not found!');
     process.exit(1);
   }

   const preTransfer = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));

   const db = new Database('data/fitflow.db', { readonly: true });

   const results = {
     timestamp: new Date().toISOString(),
     source_user_id: SOURCE_USER_ID,
     target_user_id: TARGET_USER_ID,
     pre_transfer_snapshot: snapshotFile,
     validation_results: [],
   };

   // Query 2.1: Target user workout count
   const targetWorkouts = db.prepare(`
     SELECT
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
       COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress
     FROM workouts
     WHERE user_id = ?
   `).get(TARGET_USER_ID);

   results.validation_results.push({
     test: 'Target user workout count',
     expected: preTransfer.target_baseline.existing_workouts + preTransfer.source_workouts.total,
     actual: targetWorkouts.total,
     pass: targetWorkouts.total === (preTransfer.target_baseline.existing_workouts + preTransfer.source_workouts.total)
   });

   // Query 2.2: Target user set count
   const targetSets = db.prepare(`
     SELECT
       COUNT(s.id) as total,
       COUNT(DISTINCT s.workout_id) as workouts_with_sets,
       COUNT(DISTINCT s.exercise_id) as unique_exercises
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE w.user_id = ?
   `).get(TARGET_USER_ID);

   results.validation_results.push({
     test: 'Target user set count',
     expected: preTransfer.target_baseline.existing_sets + preTransfer.source_sets.total,
     actual: targetSets.total,
     pass: targetSets.total === (preTransfer.target_baseline.existing_sets + preTransfer.source_sets.total)
   });

   // Query 2.3: Target user total volume
   const targetVolume = db.prepare(`
     SELECT
       SUM(s.weight_kg * s.reps) as total_volume_kg,
       COUNT(s.id) as total_sets
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE w.user_id = ?
   `).get(TARGET_USER_ID);

   const expectedVolume = preTransfer.target_baseline.existing_volume_kg + preTransfer.source_volume.total_volume_kg;
   const volumeDiff = Math.abs(targetVolume.total_volume_kg - expectedVolume);

   results.validation_results.push({
     test: 'Target user total volume',
     expected: expectedVolume,
     actual: targetVolume.total_volume_kg,
     difference: volumeDiff,
     pass: volumeDiff < 0.01  // Allow 0.01kg rounding error
   });

   // Query 2.4: Source user workouts remaining
   const sourceRemainingWorkouts = db.prepare(`
     SELECT COUNT(*) as total
     FROM workouts
     WHERE user_id = ?
   `).get(SOURCE_USER_ID);

   results.validation_results.push({
     test: 'Source user workouts removed',
     expected: 0,
     actual: sourceRemainingWorkouts.total,
     pass: sourceRemainingWorkouts.total === 0
   });

   // Query 2.5: Source user sets remaining
   const sourceRemainingSets = db.prepare(`
     SELECT COUNT(s.id) as total
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE w.user_id = ?
   `).get(SOURCE_USER_ID);

   results.validation_results.push({
     test: 'Source user sets removed',
     expected: 0,
     actual: sourceRemainingSets.total,
     pass: sourceRemainingSets.total === 0
   });

   // Query 2.7: Verify workout metrics are consistent
   const inconsistentWorkouts = db.prepare(`
     SELECT
       w.id,
       w.total_volume_kg as stored,
       COALESCE(SUM(s.weight_kg * s.reps), 0) as calculated,
       ABS(w.total_volume_kg - COALESCE(SUM(s.weight_kg * s.reps), 0)) as diff
     FROM workouts w
     LEFT JOIN sets s ON s.workout_id = w.id
     WHERE w.user_id = ?
     GROUP BY w.id
     HAVING diff > 0.01
   `).all(TARGET_USER_ID);

   results.validation_results.push({
     test: 'Workout volume metrics consistent',
     expected: 0,
     actual: inconsistentWorkouts.length,
     inconsistent_workouts: inconsistentWorkouts,
     pass: inconsistentWorkouts.length === 0
   });

   // Query 2.8: VO2max sessions transferred
   const targetVO2max = db.prepare(`
     SELECT COUNT(*) as total
     FROM vo2max_sessions v
     JOIN workouts w ON v.workout_id = w.id
     WHERE w.user_id = ?
   `).get(TARGET_USER_ID);

   results.validation_results.push({
     test: 'VO2max sessions transferred',
     expected: preTransfer.source_vo2max.length,
     actual: targetVO2max.total,
     pass: targetVO2max.total === preTransfer.source_vo2max.length
   });

   db.close();

   // Calculate overall pass/fail
   const allPassed = results.validation_results.every(r => r.pass);
   results.overall_result = allPassed ? 'PASS' : 'FAIL';

   // Save results
   fs.writeFileSync(
     `post_transfer_validation_${SOURCE_USER_ID}_to_${TARGET_USER_ID}_${Date.now()}.json`,
     JSON.stringify(results, null, 2)
   );

   console.log('Post-transfer validation complete');
   console.log(`Overall result: ${results.overall_result}`);
   console.log(JSON.stringify(results, null, 2));

   if (!allPassed) {
     console.error('VALIDATION FAILED - Review results file for details');
     process.exit(1);
   }
   ```

2. **Review Validation Results**

   Check that all validation tests passed:
   - ✅ Target user workout count matches expected
   - ✅ Target user set count matches expected
   - ✅ Target user volume matches expected (within 0.01kg)
   - ✅ Source user has 0 workouts remaining
   - ✅ Source user has 0 sets remaining
   - ✅ Workout volume metrics are consistent
   - ✅ VO2max sessions transferred correctly

### Phase 4: Data Integrity Checks (CRITICAL)

**Objective**: Ensure no database corruption or orphaned records exist.

**Steps**:

1. **Execute Integrity Check Queries** (Queries 3.1 - 3.15 from validation SQL)

   Create integrity check script:

   ```javascript
   // File: integrity_checks.js
   const Database = require('better-sqlite3');
   const fs = require('fs');

   const TARGET_USER_ID = 1;

   const db = new Database('data/fitflow.db', { readonly: true });

   const results = {
     timestamp: new Date().toISOString(),
     integrity_checks: [],
   };

   // Query 3.1: Orphaned sets
   const orphanedSets = db.prepare(`
     SELECT s.id, s.workout_id, s.exercise_id
     FROM sets s
     LEFT JOIN workouts w ON s.workout_id = w.id
     WHERE w.id IS NULL
   `).all();

   results.integrity_checks.push({
     check: 'Orphaned sets',
     expected: 0,
     actual: orphanedSets.length,
     records: orphanedSets,
     pass: orphanedSets.length === 0
   });

   // Query 3.2: Orphaned VO2max sessions
   const orphanedVO2max = db.prepare(`
     SELECT v.id, v.workout_id
     FROM vo2max_sessions v
     LEFT JOIN workouts w ON v.workout_id = w.id
     WHERE w.id IS NULL
   `).all();

   results.integrity_checks.push({
     check: 'Orphaned VO2max sessions',
     expected: 0,
     actual: orphanedVO2max.length,
     records: orphanedVO2max,
     pass: orphanedVO2max.length === 0
   });

   // Query 3.3: Orphaned active sessions
   const orphanedActiveSessions = db.prepare(`
     SELECT a.user_id, a.workout_id
     FROM active_sessions a
     LEFT JOIN workouts w ON a.workout_id = w.id
     WHERE w.id IS NULL
   `).all();

   results.integrity_checks.push({
     check: 'Orphaned active sessions',
     expected: 0,
     actual: orphanedActiveSessions.length,
     records: orphanedActiveSessions,
     pass: orphanedActiveSessions.length === 0
   });

   // Query 3.4: Broken exercise foreign keys
   const brokenExerciseFKs = db.prepare(`
     SELECT s.id, s.exercise_id, s.workout_id
     FROM sets s
     LEFT JOIN exercises e ON s.exercise_id = e.id
     WHERE e.id IS NULL
   `).all();

   results.integrity_checks.push({
     check: 'Broken exercise foreign keys',
     expected: 0,
     actual: brokenExerciseFKs.length,
     records: brokenExerciseFKs,
     pass: brokenExerciseFKs.length === 0
   });

   // Query 3.5: Broken program_day foreign keys
   const brokenProgramDayFKs = db.prepare(`
     SELECT w.id, w.program_day_id, w.user_id
     FROM workouts w
     LEFT JOIN program_days pd ON w.program_day_id = pd.id
     WHERE pd.id IS NULL
   `).all();

   results.integrity_checks.push({
     check: 'Broken program_day foreign keys',
     expected: 0,
     actual: brokenProgramDayFKs.length,
     records: brokenProgramDayFKs,
     pass: brokenProgramDayFKs.length === 0
   });

   // Query 3.7: Duplicate workouts
   const duplicateWorkouts = db.prepare(`
     SELECT user_id, program_day_id, date, COUNT(*) as count
     FROM workouts
     WHERE user_id = ?
     GROUP BY user_id, program_day_id, date
     HAVING COUNT(*) > 1
   `).all(TARGET_USER_ID);

   results.integrity_checks.push({
     check: 'Duplicate workouts',
     expected: 0,
     actual: duplicateWorkouts.length,
     records: duplicateWorkouts,
     pass: duplicateWorkouts.length === 0
   });

   // Query 3.9: Invalid RIR values
   const invalidRIR = db.prepare(`
     SELECT s.id, s.workout_id, s.rir
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE w.user_id = ?
       AND (s.rir < 0 OR s.rir > 4)
   `).all(TARGET_USER_ID);

   results.integrity_checks.push({
     check: 'Invalid RIR values',
     expected: 0,
     actual: invalidRIR.length,
     records: invalidRIR,
     pass: invalidRIR.length === 0
   });

   // Query 3.10: Invalid weight values
   const invalidWeights = db.prepare(`
     SELECT s.id, s.workout_id, s.weight_kg
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE w.user_id = ?
       AND (s.weight_kg < 0 OR s.weight_kg > 500)
   `).all(TARGET_USER_ID);

   results.integrity_checks.push({
     check: 'Invalid weight values',
     expected: 0,
     actual: invalidWeights.length,
     records: invalidWeights,
     pass: invalidWeights.length === 0
   });

   // Query 3.11: Foreign keys enabled
   const foreignKeysEnabled = db.pragma('foreign_keys');

   results.integrity_checks.push({
     check: 'Foreign keys enabled',
     expected: 1,
     actual: foreignKeysEnabled[0].foreign_keys,
     pass: foreignKeysEnabled[0].foreign_keys === 1
   });

   // Query 3.12: Database integrity check
   const integrityCheck = db.pragma('integrity_check');

   results.integrity_checks.push({
     check: 'Database integrity check',
     expected: 'ok',
     actual: integrityCheck[0].integrity_check,
     pass: integrityCheck[0].integrity_check === 'ok'
   });

   db.close();

   // Calculate overall result
   const allPassed = results.integrity_checks.every(c => c.pass);
   results.overall_result = allPassed ? 'PASS' : 'FAIL';

   // Save results
   fs.writeFileSync(
     `integrity_checks_${Date.now()}.json`,
     JSON.stringify(results, null, 2)
   );

   console.log('Integrity checks complete');
   console.log(`Overall result: ${results.overall_result}`);
   console.log(JSON.stringify(results, null, 2));

   if (!allPassed) {
     console.error('INTEGRITY CHECKS FAILED - Review results file for details');
     process.exit(1);
   }
   ```

2. **Review Integrity Check Results**

   Verify all checks passed:
   - ✅ No orphaned sets
   - ✅ No orphaned VO2max sessions
   - ✅ No orphaned active sessions
   - ✅ No broken foreign key references
   - ✅ No duplicate workouts
   - ✅ All RIR values in valid range (0-4)
   - ✅ All weight values in valid range (0-500kg)
   - ✅ Foreign keys enabled
   - ✅ Database integrity check passes

### Phase 5: Manual Spot Checks

**Objective**: Human verification of data quality beyond automated checks.

**Steps**:

1. **Verify Sample Workouts**

   ```javascript
   // Check 3 random workouts from transferred data
   const db = require('better-sqlite3')('data/fitflow.db');

   const sampleWorkouts = db.prepare(`
     SELECT
       w.id,
       w.date,
       w.status,
       w.total_volume_kg,
       COUNT(s.id) as set_count,
       GROUP_CONCAT(DISTINCT e.name) as exercises
     FROM workouts w
     LEFT JOIN sets s ON s.workout_id = w.id
     LEFT JOIN exercises e ON s.exercise_id = e.id
     WHERE w.user_id = 1
     ORDER BY RANDOM()
     LIMIT 3
     GROUP BY w.id
   `).all();

   console.log(JSON.stringify(sampleWorkouts, null, 2));
   db.close();
   ```

   Manual verification:
   - ✅ Workout dates are reasonable
   - ✅ Status values are valid
   - ✅ Volume calculations look correct
   - ✅ Exercise names are recognizable

2. **Verify Sample Sets**

   ```javascript
   // Check 10 random sets from transferred data
   const db = require('better-sqlite3')('data/fitflow.db');

   const sampleSets = db.prepare(`
     SELECT
       s.id,
       w.date as workout_date,
       e.name as exercise,
       s.set_number,
       s.weight_kg,
       s.reps,
       s.rir
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     JOIN exercises e ON s.exercise_id = e.id
     WHERE w.user_id = 1
     ORDER BY RANDOM()
     LIMIT 10
   `).all();

   console.log(JSON.stringify(sampleSets, null, 2));
   db.close();
   ```

   Manual verification:
   - ✅ Weight values are realistic for each exercise
   - ✅ Rep counts are reasonable (typically 5-15)
   - ✅ RIR values are in 0-4 range
   - ✅ Set numbers are sequential

3. **Verify Exercise Distribution**

   ```javascript
   // Check exercise distribution matches expectations
   const db = require('better-sqlite3')('data/fitflow.db');

   const exerciseDistribution = db.prepare(`
     SELECT
       e.name,
       COUNT(s.id) as total_sets,
       AVG(s.weight_kg) as avg_weight,
       AVG(s.reps) as avg_reps
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     JOIN exercises e ON s.exercise_id = e.id
     WHERE w.user_id = 1
     GROUP BY e.name
     ORDER BY total_sets DESC
     LIMIT 20
   `).all();

   console.log(JSON.stringify(exerciseDistribution, null, 2));
   db.close();
   ```

   Manual verification:
   - ✅ Major compound exercises (squat, bench, deadlift) have reasonable set counts
   - ✅ Average weights are appropriate for each exercise type
   - ✅ No exercises with suspiciously high or low values

4. **Verify Workout Timeline**

   ```javascript
   // Check workout date distribution
   const db = require('better-sqlite3')('data/fitflow.db');

   const timeline = db.prepare(`
     SELECT
       date,
       COUNT(*) as workouts_on_date,
       SUM(total_volume_kg) as total_volume
     FROM workouts
     WHERE user_id = 1
     GROUP BY date
     ORDER BY date DESC
     LIMIT 30
   `).all();

   console.log(JSON.stringify(timeline, null, 2));
   db.close();
   ```

   Manual verification:
   - ✅ Workout dates follow a reasonable training schedule (not 10 workouts on same day)
   - ✅ Volume progression looks natural over time
   - ✅ No suspicious gaps or clusters

## Rollback Procedure

If any validation check fails:

1. **Stop immediately** - Do not proceed with further operations

2. **Restore from backup**:
   ```bash
   # Find the most recent backup
   ls -lt /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db.backup_*

   # Restore (replace TIMESTAMP with actual backup timestamp)
   cp /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db.backup_TIMESTAMP \
      /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db
   ```

3. **Verify restoration**:
   ```bash
   node -e "const db = require('better-sqlite3')('data/fitflow.db'); \
            console.log(db.pragma('integrity_check')); \
            db.close();"
   ```

4. **Investigate failure**:
   - Review validation result JSON files
   - Check transfer script logic
   - Verify database constraints are correct
   - Test on database copy before retrying

## Success Criteria

The transfer is considered successful when:

- ✅ All pre-transfer queries executed successfully
- ✅ Transfer script completed without errors
- ✅ All post-transfer validation tests passed
- ✅ All data integrity checks passed
- ✅ Manual spot checks show reasonable data
- ✅ Database integrity check returns 'ok'
- ✅ No orphaned records detected
- ✅ Source user has 0 workouts/sets remaining
- ✅ Target user workout/set counts match expectations
- ✅ Total volume preserved (within 0.01kg tolerance)

## Checklist

Use this checklist to track progress:

### Pre-Transfer
- [ ] Database backup created
- [ ] Database integrity verified
- [ ] Foreign keys enabled verified
- [ ] Source and target users identified
- [ ] Pre-transfer snapshot script executed
- [ ] Snapshot data reviewed and looks reasonable
- [ ] Expected outcomes documented

### Transfer
- [ ] Transfer script reviewed
- [ ] Transfer executed
- [ ] Transfer output captured
- [ ] No error messages in output

### Post-Transfer
- [ ] Post-transfer verification script executed
- [ ] All validation tests passed
- [ ] Volume preservation verified
- [ ] Source user data removed confirmed

### Integrity Checks
- [ ] Integrity check script executed
- [ ] No orphaned records detected
- [ ] No broken foreign keys detected
- [ ] No duplicate workouts detected
- [ ] All constraint values valid
- [ ] Database integrity check passed

### Manual Verification
- [ ] Sample workouts reviewed
- [ ] Sample sets reviewed
- [ ] Exercise distribution verified
- [ ] Workout timeline verified

### Completion
- [ ] All validation files saved
- [ ] Results documented
- [ ] Backup can be deleted (optional)
- [ ] Transfer marked as successful

## Files Generated

During the testing process, the following files will be generated:

1. **Database Backup**: `fitflow.db.backup_YYYYMMDD_HHMMSS`
2. **Pre-Transfer Snapshot**: `pre_transfer_snapshot_[source]_to_[target]_[timestamp].json`
3. **Post-Transfer Validation**: `post_transfer_validation_[source]_to_[target]_[timestamp].json`
4. **Integrity Checks**: `integrity_checks_[timestamp].json`

Keep all validation files for audit trail purposes.

## Contact

If issues are encountered during testing:
- Review `/mnt/1000gb/Fitness/fitflowpro/CLAUDE.md` for project context
- Check `/mnt/1000gb/Fitness/fitflowpro/backend/src/database/schema.sql` for schema definition
- Examine validation query results for specific failure points
- Test on database copy before retrying on production database
