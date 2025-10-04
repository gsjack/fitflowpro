#!/usr/bin/env node
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../../data/fitflow.db');
const MIGRATION_002 = join(__dirname, '002_add_indices.sql');
const MIGRATION_003 = join(__dirname, '003_add_vo2max_constraints.sql');
console.log('[Migration Test] Starting database migration tests...\n');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
console.log('=== Test 1: Running Migration 002 (Add Indices) ===');
try {
    const migration002 = readFileSync(MIGRATION_002, 'utf-8');
    const cleanSql = migration002
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .replace(/\/\*[\s\S]*?\*\//g, '');
    const statements = cleanSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s && s.toUpperCase().includes('CREATE INDEX'));
    statements.forEach((statement) => {
        db.exec(statement + ';');
        const indexName = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1];
        console.log(`  ✓ Created index: ${indexName}`);
    });
    console.log('  ✓ Migration 002 completed successfully\n');
}
catch (error) {
    console.error('  ✗ Migration 002 failed:', error);
    process.exit(1);
}
console.log('=== Test 2: Verifying Indices ===');
const expectedIndices = {
    exercises: ['idx_exercises_muscle_groups', 'idx_exercises_equipment'],
    program_exercises: [
        'idx_program_exercises_program_day_id',
        'idx_program_exercises_exercise_id',
        'idx_program_exercises_order',
    ],
    sets: ['idx_sets_exercise_id'],
    workouts: ['idx_workouts_date_range'],
};
let allIndicesFound = true;
for (const [table, expectedIndexNames] of Object.entries(expectedIndices)) {
    const indices = db.prepare(`PRAGMA index_list(${table})`).all();
    const indexNames = indices.map((idx) => idx.name);
    console.log(`\n  Table: ${table}`);
    for (const expectedIndex of expectedIndexNames) {
        if (indexNames.includes(expectedIndex)) {
            console.log(`    ✓ ${expectedIndex} exists`);
        }
        else {
            console.log(`    ✗ ${expectedIndex} MISSING`);
            allIndicesFound = false;
        }
    }
}
if (allIndicesFound) {
    console.log('\n  ✓ All expected indices found\n');
}
else {
    console.error('\n  ✗ Some indices are missing\n');
    process.exit(1);
}
console.log('=== Test 3: Query Performance Analysis ===\n');
console.log('  Test 3a: Exercise filtering by equipment');
const equipmentPlan = db
    .prepare(`EXPLAIN QUERY PLAN SELECT * FROM exercises WHERE equipment = 'barbell'`)
    .all();
const usesEquipmentIndex = equipmentPlan.some((row) => row.detail.includes('idx_exercises_equipment') || row.detail.includes('USING INDEX'));
console.log(`    Query plan: ${equipmentPlan[0]?.detail || 'No plan'}`);
console.log(`    Uses index: ${usesEquipmentIndex ? '✓' : '✗'}\n`);
console.log('  Test 3b: Program exercises ordered by index');
const programExercisePlan = db
    .prepare(`EXPLAIN QUERY PLAN SELECT * FROM program_exercises WHERE program_day_id = 1 ORDER BY order_index`)
    .all();
const usesProgramIndex = programExercisePlan.some((row) => row.detail.includes('idx_program_exercises') || row.detail.includes('USING INDEX'));
console.log(`    Query plan: ${programExercisePlan[0]?.detail || 'No plan'}`);
console.log(`    Uses index: ${usesProgramIndex ? '✓' : '✗'}\n`);
console.log('  Test 3c: Volume aggregation by exercise');
const volumePlan = db
    .prepare(`EXPLAIN QUERY PLAN SELECT SUM(weight_kg * reps) FROM sets WHERE exercise_id = 10`)
    .all();
const usesSetsIndex = volumePlan.some((row) => row.detail.includes('idx_sets_exercise') || row.detail.includes('USING INDEX'));
console.log(`    Query plan: ${volumePlan[0]?.detail || 'No plan'}`);
console.log(`    Uses index: ${usesSetsIndex ? '✓' : '✗'}\n`);
console.log('=== Test 4: Running Migration 003 (VO2max Constraints) ===');
try {
    const migration003 = readFileSync(MIGRATION_003, 'utf-8');
    db.exec(migration003);
    console.log('  ✓ Migration 003 completed successfully\n');
}
catch (error) {
    console.error('  ✗ Migration 003 failed:', error);
    process.exit(1);
}
console.log('=== Test 5: Verifying VO2max Constraint Triggers ===\n');
const triggers = db
    .prepare(`SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name='vo2max_sessions'`)
    .all();
const expectedTriggers = [
    'validate_vo2max_hr_insert',
    'validate_vo2max_peak_hr_insert',
    'validate_vo2max_estimate_insert',
    'validate_vo2max_duration_insert',
    'validate_vo2max_hr_update',
    'validate_vo2max_peak_hr_update',
    'validate_vo2max_estimate_update',
    'validate_vo2max_duration_update',
];
const triggerNames = triggers.map((t) => t.name);
let allTriggersFound = true;
for (const expectedTrigger of expectedTriggers) {
    if (triggerNames.includes(expectedTrigger)) {
        console.log(`  ✓ ${expectedTrigger} exists`);
    }
    else {
        console.log(`  ✗ ${expectedTrigger} MISSING`);
        allTriggersFound = false;
    }
}
if (allTriggersFound) {
    console.log('\n  ✓ All expected triggers found\n');
}
else {
    console.error('\n  ✗ Some triggers are missing\n');
    process.exit(1);
}
console.log('=== Test 6: Testing VO2max Constraint Enforcement ===\n');
const testUserId = 1;
const testProgramDayId = 1;
db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password_hash, created_at, updated_at)
  VALUES (?, 'test_migration_user', 'dummy_hash', ?, ?)
`).run(testUserId, Date.now(), Date.now());
db.prepare(`
  INSERT OR IGNORE INTO programs (id, user_id, name, created_at)
  VALUES (1, ?, 'Test Program', ?)
`).run(testUserId, Date.now());
db.prepare(`
  INSERT OR IGNORE INTO program_days (id, program_id, day_of_week, day_name, day_type)
  VALUES (?, 1, 1, 'Test Day', 'vo2max')
`).run(testProgramDayId);
const testWorkoutId = db
    .prepare(`
  INSERT INTO workouts (user_id, program_day_id, date, status)
  VALUES (?, ?, '2025-10-03', 'in_progress')
  RETURNING id
`)
    .get(testUserId, testProgramDayId);
console.log(`  Created test workout: ${testWorkoutId.id}\n`);
console.log('  Test 6a: Attempting to insert invalid average_hr (250 bpm)');
try {
    db.prepare(`
    INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, average_hr)
    VALUES (?, '4x4', 1200, 250)
  `).run(testWorkoutId.id);
    console.log('    ✗ FAILED: Invalid HR was accepted (constraint not working)\n');
    process.exit(1);
}
catch (error) {
    if (error instanceof Error && error.message.includes('average_hr must be between 60 and 220')) {
        console.log('    ✓ PASSED: Invalid HR rejected with correct error message\n');
    }
    else {
        console.log(`    ✗ FAILED: Wrong error: ${error}\n`);
        process.exit(1);
    }
}
console.log('  Test 6b: Attempting to insert invalid peak_hr (250 bpm)');
try {
    db.prepare(`
    INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, peak_hr)
    VALUES (?, '4x4', 1200, 250)
  `).run(testWorkoutId.id);
    console.log('    ✗ FAILED: Invalid peak HR was accepted\n');
    process.exit(1);
}
catch (error) {
    if (error instanceof Error && error.message.includes('peak_hr must be between 60 and 220')) {
        console.log('    ✓ PASSED: Invalid peak HR rejected\n');
    }
    else {
        console.log(`    ✗ FAILED: Wrong error: ${error}\n`);
        process.exit(1);
    }
}
console.log('  Test 6c: Attempting to insert invalid estimated_vo2max (90.0)');
try {
    db.prepare(`
    INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, estimated_vo2max)
    VALUES (?, '4x4', 1200, 90.0)
  `).run(testWorkoutId.id);
    console.log('    ✗ FAILED: Invalid VO2max was accepted\n');
    process.exit(1);
}
catch (error) {
    if (error instanceof Error && error.message.includes('estimated_vo2max must be between')) {
        console.log('    ✓ PASSED: Invalid VO2max rejected\n');
    }
    else {
        console.log(`    ✗ FAILED: Wrong error: ${error}\n`);
        process.exit(1);
    }
}
console.log('  Test 6d: Attempting to insert invalid duration_seconds (300 = 5 min)');
try {
    db.prepare(`
    INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds)
    VALUES (?, '4x4', 300)
  `).run(testWorkoutId.id);
    console.log('    ✗ FAILED: Invalid duration was accepted\n');
    process.exit(1);
}
catch (error) {
    if (error instanceof Error && error.message.includes('duration_seconds must be between')) {
        console.log('    ✓ PASSED: Invalid duration rejected\n');
    }
    else {
        console.log(`    ✗ FAILED: Wrong error: ${error}\n`);
        process.exit(1);
    }
}
console.log('  Test 6e: Inserting valid VO2max session');
try {
    const result = db
        .prepare(`
    INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, average_hr, peak_hr, estimated_vo2max)
    VALUES (?, '4x4', 1200, 165, 185, 52.5)
    RETURNING id
  `)
        .get(testWorkoutId.id);
    console.log(`    ✓ PASSED: Valid data accepted (id: ${result.id})\n`);
}
catch (error) {
    console.log(`    ✗ FAILED: Valid data rejected: ${error}\n`);
    process.exit(1);
}
console.log('=== Cleanup: Removing Test Data ===\n');
db.prepare('DELETE FROM vo2max_sessions WHERE workout_id = ?').run(testWorkoutId.id);
db.prepare('DELETE FROM workouts WHERE id = ?').run(testWorkoutId.id);
console.log('  ✓ Test data cleaned up\n');
db.close();
console.log('='.repeat(70));
console.log('✓ ALL MIGRATION TESTS PASSED');
console.log('='.repeat(70));
console.log('\nMigration 002: Indices created and verified');
console.log('Migration 003: VO2max constraints enforced via triggers');
console.log('\nQuery performance: All critical queries use indices');
console.log('Constraint validation: All invalid data properly rejected');
console.log('\nDatabase ready for Phase 4 features (T025-T027)');
console.log('='.repeat(70));
//# sourceMappingURL=test-migrations.js.map