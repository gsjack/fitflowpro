import tap from 'tap';

import * as programServiceModule from '../../src/services/programService.js';
import * as dbModule from '../../src/database/db.js';

/**
 * Program Service Unit Tests
 *
 * Tests for phase advancement logic with volume multipliers
 * Uses production database (will clean up after tests)
 *
 * Coverage:
 * - Automatic phase progression (MEV→MAV→MRV→Deload→MEV)
 * - Manual phase transitions
 * - Volume multiplier calculations
 * - Transaction atomicity
 * - Error handling
 */

const { advancePhase, createDefaultProgram } = programServiceModule;
const { db } = dbModule;

// No mock needed - use production database with cleanup

tap.test('Program Service - advancePhase()', async (t) => {
  let userId: number;
  let programId: number;
  const userIds: number[] = [];
  const programIds: number[] = [];

  await t.before(async () => {
    // Create test user
    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`test-unit-${Date.now()}@example.com`, 'hash123', 30, 80, 'intermediate', now, now);

    userId = result.lastInsertRowid as number;
    userIds.push(userId);

    // Create test program using createDefaultProgram
    programId = createDefaultProgram(userId);
    programIds.push(programId);
  });

  await t.test('MEV → MAV: Automatic progression with +20% volume', async (t) => {
    // Verify initial state
    const initialProgram = db.prepare('SELECT * FROM programs WHERE id = ?').get(programId) as any;
    t.equal(initialProgram.mesocycle_phase, 'mev', 'Program starts in MEV phase');

    // Get initial exercise volumes
    const initialExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    t.ok(initialExercises.length > 0, 'Program has exercises');

    // Advance phase
    const result = advancePhase(programId, false);

    // Validate result
    t.equal(result.previous_phase, 'mev', 'Previous phase was MEV');
    t.equal(result.new_phase, 'mav', 'New phase is MAV');
    t.equal(result.volume_multiplier, 1.2, 'Volume multiplier is 1.2');
    t.equal(result.exercises_updated, initialExercises.length, 'All exercises updated');

    // Verify database state
    const updatedProgram = db.prepare('SELECT * FROM programs WHERE id = ?').get(programId) as any;
    t.equal(updatedProgram.mesocycle_phase, 'mav', 'Program phase updated to MAV');
    t.equal(updatedProgram.mesocycle_week, 1, 'Week counter reset to 1');

    // Verify volume increases
    const updatedExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    for (let i = 0; i < initialExercises.length; i++) {
      const initial = initialExercises[i]!;
      const updated = updatedExercises.find((e) => e.id === initial.id)!;
      const expectedSets = Math.round(initial.sets * 1.2);
      t.equal(updated.sets, expectedSets, `Exercise ${initial.id}: ${initial.sets} sets → ${expectedSets} sets (rounded)`);
    }
  });

  await t.test('MAV → MRV: Automatic progression with +15% volume', async (t) => {
    // Current state should be MAV from previous test
    const initialProgram = db.prepare('SELECT * FROM programs WHERE id = ?').get(programId) as any;
    t.equal(initialProgram.mesocycle_phase, 'mav', 'Program is in MAV phase');

    const initialExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    // Advance phase
    const result = advancePhase(programId, false);

    // Validate result
    t.equal(result.previous_phase, 'mav', 'Previous phase was MAV');
    t.equal(result.new_phase, 'mrv', 'New phase is MRV');
    t.equal(result.volume_multiplier, 1.15, 'Volume multiplier is 1.15');
    t.equal(result.exercises_updated, initialExercises.length, 'All exercises updated');

    // Verify volume increases
    const updatedExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    for (let i = 0; i < initialExercises.length; i++) {
      const initial = initialExercises[i]!;
      const updated = updatedExercises.find((e) => e.id === initial.id)!;
      const expectedSets = Math.round(initial.sets * 1.15);
      t.equal(updated.sets, expectedSets, `Exercise ${initial.id}: ${initial.sets} sets → ${expectedSets} sets (rounded)`);
    }
  });

  await t.test('MRV → Deload: Automatic progression with -50% volume', async (t) => {
    // Current state should be MRV from previous test
    const initialProgram = db.prepare('SELECT * FROM programs WHERE id = ?').get(programId) as any;
    t.equal(initialProgram.mesocycle_phase, 'mrv', 'Program is in MRV phase');

    const initialExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    // Advance phase
    const result = advancePhase(programId, false);

    // Validate result
    t.equal(result.previous_phase, 'mrv', 'Previous phase was MRV');
    t.equal(result.new_phase, 'deload', 'New phase is Deload');
    t.equal(result.volume_multiplier, 0.5, 'Volume multiplier is 0.5');
    t.equal(result.exercises_updated, initialExercises.length, 'All exercises updated');

    // Verify volume decreases
    const updatedExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    for (let i = 0; i < initialExercises.length; i++) {
      const initial = initialExercises[i]!;
      const updated = updatedExercises.find((e) => e.id === initial.id)!;
      const expectedSets = Math.round(initial.sets * 0.5);
      t.equal(updated.sets, expectedSets, `Exercise ${initial.id}: ${initial.sets} sets → ${expectedSets} sets (rounded)`);
    }
  });

  await t.test('Deload → MEV: Automatic progression with 2.0x volume (baseline reset)', async (t) => {
    // Ensure program is in Deload phase (reset from previous tests)
    db.prepare('UPDATE programs SET mesocycle_phase = ? WHERE id = ?').run('deload', programId);

    const initialProgram = db.prepare('SELECT * FROM programs WHERE id = ?').get(programId) as any;
    t.equal(initialProgram.mesocycle_phase, 'deload', 'Program is in Deload phase');

    const initialExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    // Advance phase
    const result = advancePhase(programId, false);

    // Validate result
    t.equal(result.previous_phase, 'deload', 'Previous phase was Deload');
    t.equal(result.new_phase, 'mev', 'New phase is MEV (cycle completes)');
    t.equal(result.volume_multiplier, 2.0, 'Volume multiplier is 2.0 (baseline reset)');
    t.equal(result.exercises_updated, initialExercises.length, 'All exercises updated');

    // Verify volume increases (back to baseline)
    const updatedExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    for (let i = 0; i < initialExercises.length; i++) {
      const initial = initialExercises[i]!;
      const updated = updatedExercises.find((e) => e.id === initial.id)!;
      const expectedSets = Math.round(initial.sets * 2.0);
      t.equal(updated.sets, expectedSets, `Exercise ${initial.id}: ${initial.sets} sets → ${expectedSets} sets (baseline reset)`);
    }
  });

  await t.test('Manual phase transition: MEV → MRV (skip MAV)', async (t) => {
    // Reset program to MEV
    db.prepare('UPDATE programs SET mesocycle_phase = ? WHERE id = ?').run('mev', programId);

    // Get initial state
    const initialExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    // Advance directly to MRV
    const result = advancePhase(programId, true, 'mrv');

    // Validate result
    t.equal(result.previous_phase, 'mev', 'Previous phase was MEV');
    t.equal(result.new_phase, 'mrv', 'New phase is MRV (skipped MAV)');
    t.ok(result.volume_multiplier > 1.0, 'Volume multiplier is positive');
    t.equal(result.exercises_updated, initialExercises.length, 'All exercises updated');

    // Verify program state
    const updatedProgram = db.prepare('SELECT * FROM programs WHERE id = ?').get(programId) as any;
    t.equal(updatedProgram.mesocycle_phase, 'mrv', 'Program phase updated to MRV');
  });

  await t.test('Error: Invalid target_phase', async (t) => {
    t.throws(
      () => advancePhase(programId, true, 'invalid_phase'),
      /Invalid target_phase/,
      'Throws error for invalid phase'
    );
  });

  await t.test('Error: Manual=true but target_phase missing', async (t) => {
    t.throws(
      () => advancePhase(programId, true),
      /target_phase is required/,
      'Throws error when manual=true but target_phase is missing'
    );
  });

  await t.test('Error: Program not found', async (t) => {
    t.throws(
      () => advancePhase(99999, false),
      /Program with ID 99999 not found/,
      'Throws error for non-existent program'
    );
  });

  await t.test('Transaction atomicity: All exercises updated together', async (t) => {
    // Reset program to MEV
    db.prepare('UPDATE programs SET mesocycle_phase = ? WHERE id = ?').run('mev', programId);

    const initialExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    // Advance phase
    advancePhase(programId, false);

    // Verify all exercises were updated (none left at old volume)
    const updatedExercises = db.prepare(`
      SELECT pe.id, pe.sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      WHERE pd.program_id = ?
    `).all(programId) as Array<{ id: number; sets: number }>;

    let allUpdated = true;
    for (let i = 0; i < initialExercises.length; i++) {
      const initial = initialExercises[i]!;
      const updated = updatedExercises.find((e) => e.id === initial.id)!;
      if (updated.sets === initial.sets) {
        allUpdated = false;
        break;
      }
    }

    t.ok(allUpdated, 'All exercises updated in single transaction');
  });

  await t.test('Volume calculation example: MEV 10 sets → MAV 12 sets', async (t) => {
    // Create a test program with known volumes
    const now = Date.now();
    const testProgramResult = db.prepare(`
      INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, 'Test Volume Program', 1, 'mev', now);

    const testProgramId = testProgramResult.lastInsertRowid as number;
    programIds.push(testProgramId);

    // Create program day
    const testDayResult = db.prepare(`
      INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
      VALUES (?, ?, ?, ?)
    `).run(testProgramId, 1, 'Test Day', 'strength');

    const testDayId = testDayResult.lastInsertRowid as number;

    // Create exercise with exactly 10 sets
    db.prepare(`
      INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(testDayId, 1, 1, 10, '6-8', 2);

    // Advance MEV → MAV
    const result = advancePhase(testProgramId, false);

    // Verify calculation
    t.equal(result.previous_phase, 'mev', 'Started from MEV');
    t.equal(result.new_phase, 'mav', 'Advanced to MAV');
    t.equal(result.volume_multiplier, 1.2, 'Multiplier is 1.2');

    const updatedExercise = db.prepare(`
      SELECT sets FROM program_exercises WHERE program_day_id = ?
    `).get(testDayId) as { sets: number };

    t.equal(updatedExercise.sets, 12, 'MEV 10 sets × 1.2 = MAV 12 sets');
  });

  await t.teardown(() => {
    // Clean up test data
    try {
      // Delete in reverse order of foreign key dependencies
      for (const pId of programIds) {
        db.prepare('DELETE FROM program_exercises WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)').run(pId);
        db.prepare('DELETE FROM workouts WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)').run(pId);
        db.prepare('DELETE FROM program_days WHERE program_id = ?').run(pId);
        db.prepare('DELETE FROM programs WHERE id = ?').run(pId);
      }
      for (const uId of userIds) {
        db.prepare('DELETE FROM users WHERE id = ?').run(uId);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});
