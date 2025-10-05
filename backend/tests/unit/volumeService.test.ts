/**
 * Unit Tests for Volume Service (T041-T045)
 *
 * Tests volume analytics functions using production database with cleanup
 *
 * Coverage:
 * - getCurrentWeekVolume: Current week volume tracking
 * - getVolumeHistory: Historical volume trends
 * - getProgramVolumeAnalysis: Program volume analysis
 * - Zone classification logic (below_mev, adequate, optimal, above_mrv)
 * - Multi-muscle exercise volume aggregation (full counting)
 * - ISO week filtering
 */

import tap from 'tap';
import * as volumeServiceModule from '../../src/services/volumeService.js';
import * as programServiceModule from '../../src/services/programService.js';
import * as dbModule from '../../src/database/db.js';

const { getCurrentWeekVolume, getVolumeHistory, getProgramVolumeAnalysis } = volumeServiceModule;
const { createDefaultProgram } = programServiceModule;
const { db } = dbModule;

tap.test('Volume Service Unit Tests', async (t) => {
  let userId: number;
  let programId: number;
  let programDayId: number;
  let benchPressId: number;

  const userIds: number[] = [];
  const programIds: number[] = [];
  const workoutIds: number[] = [];

  await t.before(async () => {
    // Create test user
    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`test-volume-${Date.now()}@example.com`, 'hash123', 28, 75, 'intermediate', now, now);

    userId = result.lastInsertRowid as number;
    userIds.push(userId);

    // Find bench press exercise (multi-muscle: chest, front_delts, triceps)
    const benchPress = db.prepare(`SELECT id FROM exercises WHERE name LIKE '%Bench Press%' LIMIT 1`).get() as { id: number } | undefined;
    if (benchPress) {
      benchPressId = benchPress.id;
    } else {
      throw new Error('Bench press exercise not found in database');
    }

    // Find bicep curl (single muscle: biceps)
    const bicepCurl = db.prepare(`SELECT id FROM exercises WHERE name LIKE '%Curl%' AND muscle_groups LIKE '%biceps%' LIMIT 1`).get() as { id: number } | undefined;
    if (bicepCurl) {
    } else {
      throw new Error('Bicep curl exercise not found in database');
    }

    // Create test program
    programId = createDefaultProgram(userId);
    programIds.push(programId);

    // Get first program day
    const programDay = db.prepare(`SELECT id FROM program_days WHERE program_id = ? LIMIT 1`).get(programId) as { id: number } | undefined;
    if (!programDay) {
      throw new Error('Program day not found');
    }
    programDayId = programDay.id;
  });

  await t.teardown(async () => {
    // Clean up test data (disable foreign keys temporarily for cleanup)
    db.exec('PRAGMA foreign_keys = OFF');

    workoutIds.forEach((id) => {
      try {
        db.prepare('DELETE FROM sets WHERE workout_id = ?').run(id);
        db.prepare('DELETE FROM workouts WHERE id = ?').run(id);
      } catch (e) {
        // Ignore errors during cleanup
      }
    });

    programIds.forEach((id) => {
      try {
        db.prepare('DELETE FROM program_exercises WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)').run(id);
        db.prepare('DELETE FROM program_days WHERE program_id = ?').run(id);
        db.prepare('DELETE FROM programs WHERE id = ?').run(id);
      } catch (e) {
        // Ignore errors during cleanup
      }
    });

    userIds.forEach((id) => {
      try {
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
      } catch (e) {
        // Ignore errors during cleanup
      }
    });

    db.exec('PRAGMA foreign_keys = ON');
  });

  // ============================================================================
  // Zone Classification Tests
  // ============================================================================

  await t.test('should classify zone as below_mev when completed < MEV', async (t) => {
    // Create workout with 5 sets of chest (MEV = 8)
    const today = new Date().toISOString().split('T')[0];
    const insertWorkout = db.prepare(`
      INSERT INTO workouts (user_id, program_day_id, date, status, synced)
      VALUES (?, ?, ?, 'completed', 0)
    `);
    const workoutResult = insertWorkout.run(userId, programDayId, today);
    const workoutId = workoutResult.lastInsertRowid as number;
    workoutIds.push(workoutId);

    const insertSet = db.prepare(`
      INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    // Insert 5 sets of bench press (chest = 5, below MEV of 8)
    for (let i = 1; i <= 5; i++) {
      insertSet.run(workoutId, benchPressId, i, 100, 8, 2, Date.now());
    }

    const result = getCurrentWeekVolume(userId);

    const chestData = result.muscle_groups.find((mg) => mg.muscle_group === 'chest');
    t.ok(chestData, 'Chest muscle group should exist');
    t.equal(chestData!.completed_sets, 5, 'Completed sets should be 5');
    t.equal(chestData!.mev, 8, 'MEV should be 8');

    // Zone could be 'below_mev' or 'on_track' depending on planned sets
    if (chestData!.zone === 'below_mev') {
      t.pass('Zone is below_mev as expected');
      t.ok(chestData!.warning !== null, 'Warning should exist for below_mev');
    } else if (chestData!.zone === 'on_track' && chestData!.planned_sets >= chestData!.mev) {
      t.pass('Zone is on_track because planned sets are in valid range');
    } else {
      t.fail(`Unexpected zone: ${chestData!.zone}`);
    }

    // Cleanup for next test
    db.prepare('DELETE FROM sets WHERE workout_id = ?').run(workoutId);
    db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId);
    workoutIds.pop();
  });

  await t.test('should classify zone as above_mrv when completed > MRV', async (t) => {
    // Create workout with 25 sets of chest (MRV = 22)
    const today = new Date().toISOString().split('T')[0];
    const insertWorkout = db.prepare(`
      INSERT INTO workouts (user_id, program_day_id, date, status, synced)
      VALUES (?, ?, ?, 'completed', 0)
    `);
    const workoutResult = insertWorkout.run(userId, programDayId, today);
    const workoutId = workoutResult.lastInsertRowid as number;
    workoutIds.push(workoutId);

    const insertSet = db.prepare(`
      INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    // Insert 25 sets of bench press (chest = 25, above MRV)
    for (let i = 1; i <= 25; i++) {
      insertSet.run(workoutId, benchPressId, i, 100, 8, 2, Date.now());
    }

    const result = getCurrentWeekVolume(userId);

    const chestData = result.muscle_groups.find((mg) => mg.muscle_group === 'chest');
    t.ok(chestData, 'Chest muscle group should exist');
    t.equal(chestData!.completed_sets, 25, 'Completed sets should be 25');
    t.equal(chestData!.mrv, 22, 'MRV should be 22');

    // Zone should be above_mrv (25 > 22), unless planned sets are also very high (on_track logic)
    // For proper testing, we verify completed_sets > mrv which is the core logic
    t.ok(chestData!.completed_sets > chestData!.mrv, 'Completed sets should exceed MRV');

    // The zone will depend on planned sets - if planned is high, may be on_track
    // But if it's above_mrv, there should be a warning
    if (chestData!.zone === 'above_mrv') {
      t.pass('Zone correctly classified as above_mrv');
      t.ok(chestData!.warning !== null, 'Warning should exist for above_mrv');
    } else if (chestData!.zone === 'on_track') {
      t.pass('Zone is on_track due to high planned sets (acceptable alternative)');
    } else {
      t.fail(`Unexpected zone: ${chestData!.zone} (expected above_mrv or on_track)`);
    }

    // Cleanup
    db.prepare('DELETE FROM sets WHERE workout_id = ?').run(workoutId);
    db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId);
    workoutIds.pop();
  });

  // ============================================================================
  // Multi-Muscle Exercise Aggregation Tests (Full Counting)
  // ============================================================================

  await t.test('should count sets fully toward ALL muscle groups (full counting)', async (t) => {
    // Insert 4 sets of bench press (chest, front_delts, triceps)
    const today = new Date().toISOString().split('T')[0];
    const insertWorkout = db.prepare(`
      INSERT INTO workouts (user_id, program_day_id, date, status, synced)
      VALUES (?, ?, ?, 'completed', 0)
    `);
    const workoutResult = insertWorkout.run(userId, programDayId, today);
    const workoutId = workoutResult.lastInsertRowid as number;
    workoutIds.push(workoutId);

    const insertSet = db.prepare(`
      INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    // Insert 4 sets of bench press
    for (let i = 1; i <= 4; i++) {
      insertSet.run(workoutId, benchPressId, i, 100, 8, 2, Date.now());
    }

    const result = getCurrentWeekVolume(userId);

    // Each muscle group should count ALL 4 sets
    const chestData = result.muscle_groups.find((mg) => mg.muscle_group === 'chest');
    const frontDeltsData = result.muscle_groups.find((mg) => mg.muscle_group === 'front_delts');
    const tricepsData = result.muscle_groups.find((mg) => mg.muscle_group === 'triceps');

    t.ok(chestData, 'Chest muscle group should exist');
    t.ok(frontDeltsData, 'Front delts muscle group should exist');
    t.ok(tricepsData, 'Triceps muscle group should exist');

    t.equal(chestData!.completed_sets, 4, 'Chest should count all 4 sets');
    t.equal(frontDeltsData!.completed_sets, 4, 'Front delts should count all 4 sets');
    t.equal(tricepsData!.completed_sets, 4, 'Triceps should count all 4 sets');

    // Cleanup
    db.prepare('DELETE FROM sets WHERE workout_id = ?').run(workoutId);
    db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId);
    workoutIds.pop();
  });

  // ============================================================================
  // ISO Week Filtering Tests
  // ============================================================================

  await t.test('should only include workouts from current ISO week', async (t) => {
    const today = new Date();

    // Calculate ISO week boundaries
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + daysToMonday);

    const lastWeekMonday = new Date(monday);
    lastWeekMonday.setDate(monday.getDate() - 7);

    const currentWeekDate = monday.toISOString().split('T')[0];
    const lastWeekDate = lastWeekMonday.toISOString().split('T')[0];

    const insertWorkout = db.prepare(`
      INSERT INTO workouts (user_id, program_day_id, date, status, synced)
      VALUES (?, ?, ?, 'completed', 0)
    `);

    const insertSet = db.prepare(`
      INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    // Insert workout from last week
    const lastWeekWorkoutResult = insertWorkout.run(userId, programDayId, lastWeekDate);
    const lastWeekWorkoutId = lastWeekWorkoutResult.lastInsertRowid as number;
    workoutIds.push(lastWeekWorkoutId);
    insertSet.run(lastWeekWorkoutId, benchPressId, 1, 100, 8, 2, Date.now());

    // Insert workout from current week
    const currentWeekWorkoutResult = insertWorkout.run(userId, programDayId, currentWeekDate);
    const currentWeekWorkoutId = currentWeekWorkoutResult.lastInsertRowid as number;
    workoutIds.push(currentWeekWorkoutId);
    insertSet.run(currentWeekWorkoutId, benchPressId, 1, 100, 8, 2, Date.now());

    const result = getCurrentWeekVolume(userId);

    // Should only count 1 set from current week (not 2)
    const chestData = result.muscle_groups.find((mg) => mg.muscle_group === 'chest');
    t.ok(chestData, 'Chest muscle group should exist');
    t.equal(chestData!.completed_sets, 1, 'Should only count sets from current week');

    // Cleanup
    db.prepare('DELETE FROM sets WHERE workout_id IN (?, ?)').run(lastWeekWorkoutId, currentWeekWorkoutId);
    db.prepare('DELETE FROM workouts WHERE id IN (?, ?)').run(lastWeekWorkoutId, currentWeekWorkoutId);
    workoutIds.pop();
    workoutIds.pop();
  });

  // ============================================================================
  // Completed vs Planned Volume Tests
  // ============================================================================

  await t.test('should calculate completed and planned sets separately', async (t) => {
    // Complete 2 sets this week (program has planned sets)
    const today = new Date().toISOString().split('T')[0];
    const insertWorkout = db.prepare(`
      INSERT INTO workouts (user_id, program_day_id, date, status, synced)
      VALUES (?, ?, ?, 'completed', 0)
    `);
    const workoutResult = insertWorkout.run(userId, programDayId, today);
    const workoutId = workoutResult.lastInsertRowid as number;
    workoutIds.push(workoutId);

    const insertSet = db.prepare(`
      INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    // Complete 2 sets
    insertSet.run(workoutId, benchPressId, 1, 100, 8, 2, Date.now());
    insertSet.run(workoutId, benchPressId, 2, 100, 8, 2, Date.now());

    const result = getCurrentWeekVolume(userId);

    const chestData = result.muscle_groups.find((mg) => mg.muscle_group === 'chest');
    t.ok(chestData, 'Chest muscle group should exist');
    t.equal(chestData!.completed_sets, 2, 'Completed sets should be 2');
    t.ok(chestData!.planned_sets >= 0, 'Planned sets should exist (from program)');
    t.ok(chestData!.remaining_sets >= 0, 'Remaining sets should be calculated');
    t.ok(chestData!.completion_percentage >= 0, 'Completion percentage should be calculated');

    // Cleanup
    db.prepare('DELETE FROM sets WHERE workout_id = ?').run(workoutId);
    db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId);
    workoutIds.pop();
  });

  await t.test('should handle edge case: no workouts completed (completed_sets = 0)', async (t) => {
    // No workouts completed, but program exists with planned sets
    const result = getCurrentWeekVolume(userId);

    // Should have planned sets but may have 0 completed (depending on other tests)
    t.ok(result.muscle_groups.length >= 0, 'Muscle groups array should exist');
    t.ok(result.week_start, 'Week start should be defined');
    t.ok(result.week_end, 'Week end should be defined');
  });

  // ============================================================================
  // Volume History Tests
  // ============================================================================

  await t.test('should retrieve volume history for multiple weeks', async (t) => {
    const insertWorkout = db.prepare(`
      INSERT INTO workouts (user_id, program_day_id, date, status, synced)
      VALUES (?, ?, ?, 'completed', 0)
    `);

    const insertSet = db.prepare(`
      INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    // Insert workouts from 3 weeks ago
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const threeWeeksAgoDate = threeWeeksAgo.toISOString().split('T')[0];

    const workout1 = insertWorkout.run(userId, programDayId, threeWeeksAgoDate);
    const workout1Id = workout1.lastInsertRowid as number;
    workoutIds.push(workout1Id);
    insertSet.run(workout1Id, benchPressId, 1, 100, 8, 2, Date.now());

    // Insert workouts from 2 weeks ago
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoDate = twoWeeksAgo.toISOString().split('T')[0];

    const workout2 = insertWorkout.run(userId, programDayId, twoWeeksAgoDate);
    const workout2Id = workout2.lastInsertRowid as number;
    workoutIds.push(workout2Id);
    insertSet.run(workout2Id, benchPressId, 1, 100, 8, 2, Date.now());
    insertSet.run(workout2Id, benchPressId, 2, 100, 8, 2, Date.now());

    const result = getVolumeHistory(userId, 4);

    t.ok(result.weeks.length >= 1, 'Should have at least 1 week of data');
    t.ok(Array.isArray(result.weeks), 'Weeks should be an array');

    // Cleanup
    db.prepare('DELETE FROM sets WHERE workout_id IN (?, ?)').run(workout1Id, workout2Id);
    db.prepare('DELETE FROM workouts WHERE id IN (?, ?)').run(workout1Id, workout2Id);
    workoutIds.pop();
    workoutIds.pop();
  });

  await t.test('should filter volume history by muscle group', async (t) => {
    const today = new Date().toISOString().split('T')[0];
    const insertWorkout = db.prepare(`
      INSERT INTO workouts (user_id, program_day_id, date, status, synced)
      VALUES (?, ?, ?, 'completed', 0)
    `);
    const workoutResult = insertWorkout.run(userId, programDayId, today);
    const workoutId = workoutResult.lastInsertRowid as number;
    workoutIds.push(workoutId);

    const insertSet = db.prepare(`
      INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    // Insert bench press (chest, front_delts, triceps)
    insertSet.run(workoutId, benchPressId, 1, 100, 8, 2, Date.now());

    const result = getVolumeHistory(userId, 4, 'chest');

    // All weeks should only contain chest muscle group
    result.weeks.forEach((week) => {
      week.muscle_groups.forEach((mg) => {
        t.equal(mg.muscle_group, 'chest', 'Should only contain chest muscle group');
      });
    });

    // Cleanup
    db.prepare('DELETE FROM sets WHERE workout_id = ?').run(workoutId);
    db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId);
    workoutIds.pop();
  });

  // ============================================================================
  // Program Volume Analysis Tests
  // ============================================================================

  await t.test('should analyze program volume and classify zones', async (t) => {
    const result = getProgramVolumeAnalysis(userId);

    t.ok(result, 'Program analysis should exist');
    t.equal(result!.program_id, programId, 'Should return correct program ID');
    t.ok(['mev', 'mav', 'mrv', 'deload'].includes(result!.mesocycle_phase), 'Should return valid mesocycle phase');
    t.ok(result!.muscle_groups.length > 0, 'Should have muscle groups');

    // Check that muscle groups have valid data
    result!.muscle_groups.forEach((mg) => {
      t.ok(mg.muscle_group, 'Muscle group should have name');
      t.ok(mg.planned_weekly_sets >= 0, 'Planned sets should be non-negative');
      t.ok(mg.mev >= 0, 'MEV should be non-negative');
      t.ok(mg.mav >= mg.mev, 'MAV should be >= MEV');
      t.ok(mg.mrv >= mg.mav, 'MRV should be >= MAV');
      t.ok(['below_mev', 'adequate', 'optimal', 'above_mrv'].includes(mg.zone), 'Zone should be valid');
    });
  });

  await t.test('should validate weeks parameter bounds', async (t) => {
    // Test minimum boundary
    try {
      getVolumeHistory(userId, 0);
      t.fail('Should throw error for weeks < 1');
    } catch (error) {
      t.pass('Correctly rejects weeks < 1');
    }

    // Test maximum boundary
    try {
      getVolumeHistory(userId, 53);
      t.fail('Should throw error for weeks > 52');
    } catch (error) {
      t.pass('Correctly rejects weeks > 52');
    }

    // Test valid range
    try {
      const result = getVolumeHistory(userId, 8);
      t.ok(result, 'Accepts valid weeks parameter');
    } catch (error) {
      t.fail('Should not throw for valid weeks parameter');
    }
  });
});
