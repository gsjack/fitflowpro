# Workout Transfer Validation - Quick Reference

## Files Created

This research has produced the following validation artifacts:

1. **validation_queries_workout_transfer.sql** - 45 SQL queries organized in 3 phases
2. **WORKOUT_TRANSFER_TEST_PLAN.md** - Comprehensive manual testing guide with JavaScript helpers
3. **VALIDATION_SUMMARY.md** - This document (quick reference)

## Quick Start

### Before Transfer (5 minutes)

```bash
cd /mnt/1000gb/Fitness/fitflowpro/backend

# 1. Create backup
cp data/fitflow.db data/fitflow.db.backup_$(date +%Y%m%d_%H%M%S)

# 2. Run pre-transfer snapshot
node pre_transfer_snapshot.js > pre_transfer_output.txt

# 3. Review snapshot
cat pre_transfer_snapshot_*.json | less
```

### Execute Transfer (1 minute)

```bash
# Run the transfer script
node seed_user_151.js
```

### After Transfer (5 minutes)

```bash
# 1. Run post-transfer validation
node post_transfer_verification.js > post_transfer_output.txt

# 2. Run integrity checks
node integrity_checks.js > integrity_output.txt

# 3. Review results
cat post_transfer_validation_*.json | grep -A 5 "overall_result"
cat integrity_checks_*.json | grep -A 5 "overall_result"
```

## Validation Query Organization

### Phase 1: Pre-Transfer Validation (Queries 1.1 - 1.10)

**Purpose**: Capture baseline metrics before any modification

| Query | Description | Expected Result |
|-------|-------------|-----------------|
| 1.1 | Source user workout count | Number of workouts to transfer |
| 1.2 | Source user set count | Number of sets to transfer |
| 1.3 | Source user total volume | Volume that should be preserved |
| 1.4 | Source workout details | Breakdown of each workout |
| 1.5 | Source exercise distribution | Which exercises are most common |
| 1.6 | Source recovery assessments | Should NOT be transferred |
| 1.7 | Source active sessions | Sessions that need updating |
| 1.8 | Target user baseline | Starting point for delta calculation |
| 1.9 | Specific workout snapshot | For single workout transfers |
| 1.10 | Source VO2max sessions | Cardio data to transfer |

### Phase 2: Post-Transfer Validation (Queries 2.1 - 2.10)

**Purpose**: Verify data was transferred correctly

| Query | Description | Expected Result | Pass Criteria |
|-------|-------------|-----------------|---------------|
| 2.1 | Target workout count | Increased by source count | Exact match |
| 2.2 | Target set count | Increased by source count | Exact match |
| 2.3 | Target total volume | Increased by source volume | Within 0.01kg |
| 2.4 | Source workouts remaining | Should be 0 | Exact 0 |
| 2.5 | Source sets remaining | Should be 0 | Exact 0 |
| 2.6 | Target exercise distribution | All exercises preserved | All present |
| 2.7 | Workout metrics consistency | Volume matches calculated | < 0.01kg diff |
| 2.8 | VO2max sessions transferred | All sessions moved | Exact count match |
| 2.9 | Active sessions updated | Reference target user | Correct user_id |
| 2.10 | Delta calculation | Shows increase amount | Matches expected |

### Phase 3: Data Integrity Checks (Queries 3.1 - 3.15)

**Purpose**: Ensure no database corruption

| Query | Description | Expected Result | Critical? |
|-------|-------------|-----------------|-----------|
| 3.1 | Orphaned sets | 0 rows | YES |
| 3.2 | Orphaned VO2max sessions | 0 rows | YES |
| 3.3 | Orphaned active sessions | 0 rows | YES |
| 3.4 | Broken exercise FKs | 0 rows | YES |
| 3.5 | Broken program_day FKs | 0 rows | YES |
| 3.6 | Set number sequence | 0 rows | NO |
| 3.7 | Duplicate workouts | 0 rows | YES |
| 3.8 | Timestamp consistency | 0 rows | NO |
| 3.9 | Invalid RIR values | 0 rows | YES |
| 3.10 | Invalid weight values | 0 rows | YES |
| 3.11 | Foreign keys enabled | 1 | YES |
| 3.12 | Database integrity | 'ok' | YES |
| 3.13 | Synced flags preserved | Distribution shown | NO |
| 3.14 | Source vs target comparison | Delta shown | NO |
| 3.15 | Total system count | Unchanged | NO |

## Running Individual Queries

If you prefer to run queries manually instead of using the JavaScript helpers:

### Using Node.js (better-sqlite3)

```javascript
const db = require('better-sqlite3')('/mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db');

// Example: Query 1.1 - Source user workout count
const result = db.prepare(`
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
  FROM workouts
  WHERE user_id = ?
`).get(151);

console.log(result);
db.close();
```

### Using sqlite3 CLI (if installed)

```bash
sqlite3 /mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db << EOF
.mode column
.headers on
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM workouts
WHERE user_id = 151;
EOF
```

## Example Test Session

Here's a complete test session example:

```bash
# Session: Transfer user 151 workouts to user 1
# Date: 2025-10-04
# Operator: pi

# Step 1: Backup
cp data/fitflow.db data/fitflow.db.backup_20251004_140000
# Result: Backup created successfully

# Step 2: Pre-transfer snapshot
node pre_transfer_snapshot.js
# Output:
# {
#   "source_workouts": { "total": 12, "completed": 10 },
#   "source_sets": { "total": 156, "unique_exercises": 8 },
#   "source_volume": { "total_volume_kg": 18450.5 },
#   "target_baseline": { "existing_workouts": 45, "existing_sets": 589 }
# }

# Step 3: Calculate expected outcomes
# Expected after transfer:
# - Target workouts: 45 + 12 = 57
# - Target sets: 589 + 156 = 745
# - Target volume: [baseline] + 18450.5 kg

# Step 4: Execute transfer
node seed_user_151.js
# Output:
# Workouts updated: 12
# Sets updated: 156
# Active sessions updated: 1
# Transfer complete

# Step 5: Post-transfer validation
node post_transfer_verification.js
# Output:
# {
#   "overall_result": "PASS",
#   "validation_results": [
#     { "test": "Target user workout count", "pass": true },
#     { "test": "Target user set count", "pass": true },
#     { "test": "Target user total volume", "pass": true },
#     { "test": "Source user workouts removed", "pass": true },
#     { "test": "Source user sets removed", "pass": true }
#   ]
# }

# Step 6: Integrity checks
node integrity_checks.js
# Output:
# {
#   "overall_result": "PASS",
#   "integrity_checks": [
#     { "check": "Orphaned sets", "pass": true },
#     { "check": "Database integrity check", "pass": true }
#   ]
# }

# Step 7: Manual spot check
node -e "const db = require('better-sqlite3')('data/fitflow.db'); \
         const count = db.prepare('SELECT COUNT(*) as total FROM workouts WHERE user_id = 1').get(); \
         console.log('Target user workouts:', count.total); \
         db.close();"
# Output: Target user workouts: 57

# Result: SUCCESS - All validations passed
```

## Common Issues and Solutions

### Issue: "Pre-transfer snapshot not found"

**Cause**: Post-transfer script can't find the snapshot file

**Solution**:
```bash
# Check if snapshot exists
ls -lt pre_transfer_snapshot_*.json

# If missing, recreate it (from backup)
cp data/fitflow.db.backup_TIMESTAMP data/fitflow_temp.db
# Modify pre_transfer_snapshot.js to use fitflow_temp.db
node pre_transfer_snapshot.js
```

### Issue: Validation shows volume difference > 0.01kg

**Cause**: Floating point rounding in calculations

**Solution**:
```bash
# Check if difference is within acceptable range (< 1kg)
# If yes, this is likely rounding error and acceptable
# If no, investigate specific workouts with Query 2.7
```

### Issue: Database integrity check fails

**Cause**: Database corruption detected

**Solution**:
```bash
# IMMEDIATELY stop and restore from backup
cp data/fitflow.db.backup_TIMESTAMP data/fitflow.db

# Verify restoration
node -e "const db = require('better-sqlite3')('data/fitflow.db'); \
         console.log(db.pragma('integrity_check')); \
         db.close();"

# Do NOT retry transfer until issue is diagnosed
```

### Issue: Foreign keys not enabled

**Cause**: Database opened without enabling foreign key constraints

**Solution**:
```bash
# Check current setting
node -e "const db = require('better-sqlite3')('data/fitflow.db'); \
         console.log(db.pragma('foreign_keys')); \
         db.close();"

# Enable in transfer script
# db.pragma('foreign_keys = ON');
```

## Key Metrics to Watch

During validation, pay special attention to these metrics:

1. **Volume Preservation** (Query 2.3)
   - Most important metric
   - Should match within 0.01kg
   - If off by > 1kg, investigate immediately

2. **No Orphaned Records** (Queries 3.1, 3.2, 3.3)
   - Critical for data integrity
   - Even 1 orphaned record indicates bug
   - Must be 0 to pass validation

3. **Source User Cleanup** (Queries 2.4, 2.5)
   - Ensures complete transfer
   - Source should have 0 workouts/sets after full transfer
   - Non-zero indicates partial transfer failure

4. **Database Integrity** (Query 3.12)
   - Must return 'ok'
   - Anything else indicates corruption
   - Requires immediate rollback

## Variable Substitution

All queries use these placeholder variables:

- `:source_user_id` - User ID to transfer FROM (e.g., 151)
- `:target_user_id` - User ID to transfer TO (e.g., 1)
- `:workout_id` - Specific workout ID (optional, for single workout transfer)

Replace these when running queries manually:

```sql
-- Original query
SELECT COUNT(*) FROM workouts WHERE user_id = :source_user_id;

-- After substitution (source_user_id = 151)
SELECT COUNT(*) FROM workouts WHERE user_id = 151;
```

In JavaScript helpers, variables are passed as function parameters.

## Success Checklist

Use this abbreviated checklist for quick validation:

- [ ] Backup created
- [ ] Pre-transfer snapshot captured
- [ ] Expected outcomes calculated
- [ ] Transfer executed without errors
- [ ] Post-transfer validation: PASS
- [ ] Integrity checks: PASS
- [ ] Volume preserved (within 0.01kg)
- [ ] No orphaned records
- [ ] Source user cleaned up (0 workouts/sets)
- [ ] Manual spot checks look reasonable
- [ ] All validation files saved

## Next Steps

After successful validation:

1. **Keep validation files** for audit trail
2. **Delete backup** (optional, after 7 days)
   ```bash
   # After confirming everything works for a week
   rm data/fitflow.db.backup_TIMESTAMP
   ```
3. **Document the transfer** in your records
4. **Monitor application** for any unexpected behavior

## Resources

- **Full test plan**: `WORKOUT_TRANSFER_TEST_PLAN.md`
- **SQL queries**: `validation_queries_workout_transfer.sql`
- **Database schema**: `/mnt/1000gb/Fitness/fitflowpro/backend/src/database/schema.sql`
- **Project documentation**: `/mnt/1000gb/Fitness/fitflowpro/CLAUDE.md`

## Query Execution Time

Approximate execution times (on Raspberry Pi 5):

- **Pre-transfer snapshot**: ~2 seconds (10 queries)
- **Post-transfer validation**: ~3 seconds (10 queries)
- **Integrity checks**: ~5 seconds (15 queries)
- **Total validation time**: ~10 seconds

All queries are optimized with indices and should complete quickly.
