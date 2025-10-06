# Push B Workout Transfer: Technical Explanation

## Executive Summary

This document explains the SQL script for transferring a "Push B" workout from a source user to asigator@gmail.com (User ID 118). The script is **RESEARCH ONLY** and should not be executed without verification.

---

## Database Schema Analysis

### Table Relationships

```
users (id, username, ...)
  ↓
programs (id, user_id, name, ...)
  ↓
program_days (id, program_id, day_name, ...)
  ↓
workouts (id, user_id, program_day_id, date, ...)
  ↓
sets (id, workout_id, exercise_id, weight_kg, reps, rir, ...)
```

### Key Observations

1. **workouts table**: Has both `user_id` (direct ownership) and `program_day_id` (template reference)
2. **sets table**: Does NOT have `user_id` column - ownership inherited through `workout_id`
3. **program_days**: Belongs to a `program`, which belongs to a `user`

### Critical Insight

**Set ownership is transitive through the workout:**
- `sets.workout_id` → `workouts.id`
- `workouts.user_id` → `users.id`

Therefore, **no direct update to sets table is needed**. Updating `workouts.user_id` automatically transfers all associated sets.

---

## Transfer Strategy

### Option A: Map to Existing Program Day (Preferred)

**When to use**: Target user (asigator@gmail.com) already has a "Push B" program_day

**Steps**:
1. Find target user's existing "Push B" program_day
2. Update workout to reference target user's program_day
3. Update workout's user_id to 118

**SQL**:
```sql
UPDATE workouts
SET
    user_id = 118,
    program_day_id = (SELECT pd.id FROM program_days pd
                      JOIN programs p ON pd.program_id = p.id
                      WHERE p.user_id = 118 AND pd.day_name = 'Push B'
                      LIMIT 1)
WHERE id = WORKOUT_ID;
```

**Advantages**:
- Preserves target user's program structure
- Maintains exercise consistency with target's existing Push B days
- Minimal data modification
- Cleaner data model

**Disadvantages**:
- Requires target user to have an existing Push B program_day
- Workout might have different exercises than target's program template

---

### Option B: Transfer Program Day (Fallback)

**When to use**: Target user does NOT have a "Push B" program_day

**Steps**:
1. Check if target user has any programs (create one if not)
2. Transfer the source program_day to target user's program
3. Update workout's user_id to 118

**SQL**:
```sql
-- Ensure target has a program
INSERT OR IGNORE INTO programs (user_id, name, ...)
SELECT 118, 'Transferred Program', ...
WHERE NOT EXISTS (SELECT 1 FROM programs WHERE user_id = 118);

-- Transfer program_day
UPDATE program_days
SET program_id = (SELECT id FROM programs WHERE user_id = 118 LIMIT 1)
WHERE id = (SELECT program_day_id FROM workouts WHERE id = WORKOUT_ID);

-- Transfer workout
UPDATE workouts SET user_id = 118 WHERE id = WORKOUT_ID;
```

**Advantages**:
- Handles edge case where target has no Push B program_day
- Preserves original workout's exercise structure
- Transfers complete program_day with all exercises

**Disadvantages**:
- More complex
- May create duplicate program_days if target later creates their own Push B
- Modifies more tables (programs, program_days, workouts)

---

## Script Structure

### STEP 0: Pre-flight Checks

**Purpose**: Verify assumptions before making any changes

**Checks**:
1. Target user exists and has ID 118
2. Source workout is correctly identified
3. Program_day relationships are intact

**Why this matters**: Prevents executing transaction with wrong IDs

---

### STEP 1: Backup Current State

**Purpose**: Create point-in-time backup for rollback

**Creates**:
- `workouts_backup_20251004`
- `sets_backup_20251004`
- `programs_backup_20251004`
- `program_days_backup_20251004`

**Critical**: This is **MANDATORY** before any modifications. Without backups, rollback is impossible.

---

### STEP 2: Verification Queries

**Purpose**: Count records to be updated

**Output**:
- Number of workouts (should be 1)
- Number of sets (varies by workout)
- Number of program_days (should be 1)

**Why this matters**: Detects if WORKOUT_ID matches multiple records (error condition)

---

### STEP 3: Transfer Transaction

**Purpose**: Atomic update of database records

**Transaction guarantees**:
- All updates succeed, or none do (atomicity)
- Database remains consistent throughout (consistency)
- Changes isolated until commit (isolation)
- Changes permanent after commit (durability)

**Includes**:
- Option A and Option B SQL (choose one)
- In-transaction verification query
- COMMIT/ROLLBACK placeholders

**Why atomic**: If power fails mid-update, database rolls back to pre-transaction state

---

### STEP 4: Post-Transfer Verification

**Purpose**: Confirm transfer succeeded

**Verifies**:
1. Workout ownership changed to user 118
2. All sets still linked to workout
3. Program_day linkage intact
4. Target user's total workout count updated

**Why this matters**: Ensures no data corruption or missing relationships

---

### STEP 5: Rollback Procedure

**Purpose**: Undo transfer if issues found

**Process**:
1. Delete modified records
2. Restore from backup tables
3. Commit rollback transaction

**When to use**:
- Target user cannot see workout in mobile app
- Sets are missing or corrupted
- Analytics show incorrect data
- Any unexpected behavior

---

### STEP 6: Cleanup

**Purpose**: Remove backup tables after confirmation

**Important**: Only execute after 24-48 hours of successful operation

**Why the delay**: Allows time to discover issues in production use

---

## Execution Checklist

Before running the script, complete these steps:

1. **[ ] Identify Source Workout**
   - Wait for Agent 3 to provide source user ID and workout ID
   - Replace `SOURCE_USER_ID` in script
   - Replace `WORKOUT_ID` in script

2. **[ ] Run Pre-flight Checks (STEP 0)**
   - Verify target user ID 118 exists
   - Confirm workout exists and belongs to source user
   - Check program_day relationships

3. **[ ] Create Backups (STEP 1)**
   - **CRITICAL**: Do not skip this step
   - Verify backup tables created successfully
   - Confirm backup row counts match expected

4. **[ ] Run Verification Queries (STEP 2)**
   - Verify exactly 1 workout will be updated
   - Note number of sets for later comparison
   - Confirm program_day count

5. **[ ] Choose Transfer Strategy**
   - **Option A**: Target has Push B program_day (preferred)
   - **Option B**: Target has no Push B program_day (fallback)
   - Comment out the option NOT being used

6. **[ ] Execute Transaction (STEP 3)**
   - Run `BEGIN TRANSACTION;`
   - Execute chosen option (A or B)
   - Review in-transaction verification output
   - **Decision point**: COMMIT or ROLLBACK

7. **[ ] Verify Success (STEP 4)**
   - Run all post-transfer verification queries
   - Confirm workout belongs to user 118
   - Verify all sets present
   - Check program_day linkage

8. **[ ] Test in Mobile App**
   - Log in as asigator@gmail.com
   - Navigate to workout history
   - Verify Push B workout appears
   - Open workout and verify all sets visible
   - Check analytics include transferred workout

9. **[ ] Monitor for 24-48 Hours**
   - Watch for sync errors
   - Check backend logs for issues
   - Verify analytics calculations correct

10. **[ ] Cleanup (STEP 6)**
    - After 24-48h, drop backup tables
    - Only if no issues discovered

---

## Variables to Replace

Before execution, replace these placeholders in the SQL script:

| Variable | Source | Example |
|----------|--------|---------|
| `SOURCE_USER_ID` | Agent 3 | `151` |
| `WORKOUT_ID` | Agent 3 | `2847` |
| Target User ID | Known | `118` (hardcoded) |

**How to replace**:
1. Use find/replace in text editor
2. Replace **all instances** of placeholder
3. Double-check no placeholders remain

---

## Testing Recommendations

### Development Environment Test

Before production execution:

1. **Clone database**:
   ```bash
   cp fitflow.db fitflow_test.db
   ```

2. **Run script against test database**:
   ```bash
   sqlite3 fitflow_test.db < transfer_push_b_workout.sql
   ```

3. **Verify in test database**:
   - Run all verification queries
   - Check data integrity

4. **Test rollback procedure**:
   - Execute rollback SQL
   - Verify restoration to original state

### Production Execution

1. **Backup entire database first**:
   ```bash
   cp fitflow.db fitflow_backup_20251004.db
   ```

2. **Execute during low-traffic period**:
   - Minimize risk of concurrent modifications
   - Easier to monitor for issues

3. **Monitor logs during execution**:
   - Watch for foreign key violations
   - Check for constraint errors

4. **Immediate verification**:
   - Run STEP 4 queries
   - Test mobile app access

---

## Risk Assessment

### Low Risk

- Updating `workouts.user_id` (single column, well-defined)
- No cascade deletes involved
- Atomic transaction prevents partial updates

### Medium Risk

- Option B modifies multiple tables (programs, program_days, workouts)
- Program_day transfer could create inconsistencies if not verified

### High Risk Scenarios (Mitigated)

1. **No backups**: Mitigated by mandatory STEP 1
2. **Wrong workout ID**: Mitigated by STEP 0 pre-flight checks
3. **Concurrent modifications**: Mitigated by transaction isolation
4. **Foreign key violations**: Mitigated by pre-flight verification

---

## Backup Recommendations

### Database-Level Backup

**Before execution**:
```bash
# Full database backup
cp /path/to/fitflow.db /path/to/fitflow_backup_20251004.db

# Verify backup
sqlite3 fitflow_backup_20251004.db "SELECT COUNT(*) FROM workouts;"
```

### Table-Level Backups (Included in Script)

**Advantages**:
- Faster rollback (no need to restore entire database)
- Surgical undo (only affected tables)
- Keeps original database file intact

**Retention**:
- Keep for 24-48 hours minimum
- Delete only after confirming success

### Export-Level Backup (Optional)

**For maximum safety**:
```bash
# Export affected workout to JSON
sqlite3 fitflow.db <<SQL > workout_backup.json
SELECT json_object(
  'workout', (SELECT json_object('id', id, 'user_id', user_id, 'program_day_id', program_day_id, 'date', date) FROM workouts WHERE id = WORKOUT_ID),
  'sets', (SELECT json_group_array(json_object('id', id, 'weight_kg', weight_kg, 'reps', reps, 'rir', rir)) FROM sets WHERE workout_id = WORKOUT_ID)
);
SQL
```

---

## Common Issues and Solutions

### Issue 1: "FOREIGN KEY constraint failed"

**Cause**: Target user's program_day doesn't exist (Option A)

**Solution**: Use Option B instead to transfer program_day

**Prevention**: Run STEP 0 to check if target has Push B program_day

---

### Issue 2: "No rows updated"

**Cause**: WORKOUT_ID doesn't exist or doesn't match query conditions

**Solution**:
1. Verify WORKOUT_ID with STEP 0 query
2. Check that source user owns the workout
3. Confirm workout status is not 'deleted'

---

### Issue 3: Sets missing after transfer

**Cause**: Unlikely (sets have workout_id foreign key), but possible if:
- Concurrent deletion occurred
- Database corruption

**Solution**:
1. Check sets table: `SELECT * FROM sets WHERE workout_id = WORKOUT_ID;`
2. If sets exist but not visible, check foreign key constraints
3. If sets missing, restore from backup (STEP 5)

---

### Issue 4: Target user can't see workout in mobile app

**Possible causes**:
1. Mobile app cache not refreshed
2. Sync queue needs processing
3. API query filters by different criteria

**Diagnosis**:
```sql
-- Verify workout visible to target user
SELECT * FROM workouts WHERE user_id = 118 AND id = WORKOUT_ID;

-- Check if workout included in user's workout list query
SELECT w.*, pd.day_name
FROM workouts w
JOIN program_days pd ON w.program_day_id = pd.id
WHERE w.user_id = 118
ORDER BY w.date DESC;
```

**Solutions**:
- Force mobile app refresh/logout-login
- Clear mobile app cache
- Verify API endpoint uses correct user_id filter

---

## Success Criteria

Transfer is successful when:

1. **[ ] Database verification**:
   - `SELECT user_id FROM workouts WHERE id = WORKOUT_ID;` returns `118`
   - `SELECT COUNT(*) FROM sets WHERE workout_id = WORKOUT_ID;` returns original count
   - No foreign key errors in logs

2. **[ ] Mobile app verification**:
   - Target user sees Push B workout in history
   - All sets visible with correct weight/reps/RIR
   - Analytics include transferred workout data

3. **[ ] Sync verification**:
   - Workout marked as `synced = 0` (needs sync to other devices)
   - No sync queue errors
   - Background sync completes successfully

4. **[ ] Data integrity**:
   - No orphaned records (sets without workout, workout without user)
   - Foreign key constraints satisfied
   - Indices updated correctly

---

## Additional Notes

### Why Sets Table Doesn't Have user_id

**Design decision**: Sets are always scoped to a workout, and workouts are scoped to users. Adding `user_id` to sets would be:
- **Redundant**: Information already accessible via `sets.workout_id → workouts.user_id`
- **Denormalization risk**: Could create inconsistency if workout changes user but sets don't
- **Performance**: Extra index overhead for marginal query benefit

**Implication for transfer**: Updating `workouts.user_id` automatically "transfers" all sets without touching sets table.

### Sync Queue Behavior After Transfer

**Important**: Transferred workout will have `synced = 0` flag, which triggers:
1. Mobile app background sync attempts to push to server
2. Server sees workout already exists with different user_id
3. Timestamp-based conflict resolution may override transfer

**Mitigation**: Set `synced = 0` in transfer script to force re-sync with new ownership.

### Analytics Impact

Transferred workouts will:
- Appear in target user's 1RM progression charts
- Count toward target user's volume trends
- Affect target user's consistency metrics

**Consider**: If workout data is from a different training phase, it may skew target user's analytics.

---

## Contact and Questions

If you encounter issues during execution:

1. **Do not proceed** if any verification step fails
2. **ROLLBACK** the transaction immediately
3. **Document** the error message and query output
4. **Review** this explanation document for troubleshooting
5. **Test** in development environment before retrying

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-04 | 1.0 | Initial creation for Push B transfer research |

---

**END OF EXPLANATION DOCUMENT**
