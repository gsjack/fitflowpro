/**
 * VO2max Service Unit Tests
 *
 * Tests for VO2max service business logic:
 * - Cooper formula accuracy
 * - Physiological range validation
 * - Norwegian 4x4 duration validation
 * - Progression tracking
 *
 * Uses production database with cleanup after tests
 */

import tap from 'tap';
import * as vo2maxServiceModule from '../../src/services/vo2maxService.js';
import * as dbModule from '../../src/database/db.js';

const { estimateVO2max, createVO2maxSession, getVO2maxSessions, getVO2maxProgression, getVO2maxSessionById } =
  vo2maxServiceModule;
const { db } = dbModule;

import type { VO2maxSessionData, VO2maxSessionFilters } from '../../src/services/vo2maxService.js';

tap.test('VO2max Service Unit Tests', async (t) => {
  // Cooper Formula Tests
  await t.test('estimateVO2max()', async (t) => {
    await t.test('should calculate VO2max using Cooper formula for age 30', async (t) => {
      const age = 30;
      const vo2max = estimateVO2max(age);

      // Cooper Formula: 15.3 × (max_hr / resting_hr)
      // max_hr = 220 - 30 = 190
      // resting_hr = 60
      // VO2max = 15.3 × (190 / 60) = 15.3 × 3.167 ≈ 48.45
      t.ok(vo2max > 48 && vo2max < 49, `VO2max ≈ 48.45 (got ${vo2max.toFixed(2)})`);
    });

    await t.test('should calculate VO2max using Cooper formula for age 28', async (t) => {
      const age = 28;
      const vo2max = estimateVO2max(age);

      // Cooper Formula: 15.3 × (max_hr / resting_hr)
      // max_hr = 220 - 28 = 192
      // resting_hr = 60
      // VO2max = 15.3 × (192 / 60) = 15.3 × 3.2 = 48.96
      t.ok(vo2max > 48.5 && vo2max < 49.5, `VO2max ≈ 48.96 (got ${vo2max.toFixed(2)})`);
    });

    await t.test('should clamp VO2max to minimum 20.0 ml/kg/min', async (t) => {
      // Very old age would produce low VO2max
      const age = 100; // max_hr = 120, VO2max = 15.3 × (120/60) = 30.6
      const vo2max = estimateVO2max(age);

      t.ok(vo2max >= 20.0, 'VO2max clamped to minimum 20.0');
      t.ok(vo2max <= 80.0, 'VO2max within maximum range');
    });

    await t.test('should clamp VO2max to maximum 80.0 ml/kg/min', async (t) => {
      // Very young age would produce high VO2max
      const age = 5; // max_hr = 215, VO2max = 15.3 × (215/60) = 54.825
      const vo2max = estimateVO2max(age);

      t.ok(vo2max <= 80.0, 'VO2max within maximum range');
      t.ok(vo2max >= 20.0, 'VO2max within minimum range');
    });

    await t.test('should handle averageHR parameter (even though not used in formula)', async (t) => {
      const age = 30;
      const averageHR = 170;
      const vo2max = estimateVO2max(age, averageHR);

      // Should produce same result as without averageHR
      const vo2maxWithoutHR = estimateVO2max(age);
      t.equal(vo2max, vo2maxWithoutHR, 'averageHR does not affect Cooper formula');
    });
  });

  // Validation Tests
  await t.test('createVO2maxSession() - validation', async (t) => {
    let userId: number;
    let programDayId: number;
    let workoutId: number;

    await t.before(async () => {
      // Create test user
      const now = Date.now();
      const userResult = db
        .prepare(
          `INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(`test-vo2max-unit-${Date.now()}@example.com`, 'hash123', 30, 80, 'intermediate', now, now);
      userId = userResult.lastInsertRowid as number;

      // Create program
      const programResult = db
        .prepare(`INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(userId, 'Test Program', 1, 'mev', now);
      const programId = programResult.lastInsertRowid as number;

      // Create program day
      const dayResult = db
        .prepare(`INSERT INTO program_days (program_id, day_of_week, day_name, day_type) VALUES (?, ?, ?, ?)`)
        .run(programId, 1, 'VO2max A', 'vo2max');
      programDayId = dayResult.lastInsertRowid as number;

      // Create workout
      const workoutResult = db
        .prepare(`INSERT INTO workouts (user_id, program_day_id, date, status, synced) VALUES (?, ?, ?, 'not_started', 1)`)
        .run(userId, programDayId, '2025-10-03');
      workoutId = workoutResult.lastInsertRowid as number;
    });

    await t.test('should reject duration below minimum (10 minutes)', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 5, // Below minimum
        intervals_completed: 1,
      };

      t.throws(
        () => createVO2maxSession(sessionData),
        /Duration must be between 10 and 120 minutes/,
        'Throws error for duration < 10 minutes'
      );
    });

    await t.test('should reject duration above maximum (120 minutes)', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'zone2',
        duration_minutes: 150, // Above maximum
      };

      t.throws(
        () => createVO2maxSession(sessionData),
        /Duration must be between 10 and 120 minutes/,
        'Throws error for duration > 120 minutes'
      );
    });

    await t.test('should reject average_heart_rate below 60 bpm', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        average_heart_rate: 50, // Below minimum
        intervals_completed: 4,
      };

      t.throws(
        () => createVO2maxSession(sessionData),
        /Average heart rate must be between 60 and 220 bpm/,
        'Throws error for HR < 60 bpm'
      );
    });

    await t.test('should reject average_heart_rate above 220 bpm', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        average_heart_rate: 230, // Above maximum
        intervals_completed: 4,
      };

      t.throws(
        () => createVO2maxSession(sessionData),
        /Average heart rate must be between 60 and 220 bpm/,
        'Throws error for HR > 220 bpm'
      );
    });

    await t.test('should reject peak_heart_rate below 60 bpm', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        peak_heart_rate: 55, // Below minimum
        intervals_completed: 4,
      };

      t.throws(
        () => createVO2maxSession(sessionData),
        /Peak heart rate must be between 60 and 220 bpm/,
        'Throws error for peak HR < 60 bpm'
      );
    });

    await t.test('should reject peak_heart_rate above 220 bpm', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        peak_heart_rate: 225, // Above maximum
        intervals_completed: 4,
      };

      t.throws(
        () => createVO2maxSession(sessionData),
        /Peak heart rate must be between 60 and 220 bpm/,
        'Throws error for peak HR > 220 bpm'
      );
    });

    await t.test('should reject estimated_vo2max below 20.0 ml/kg/min', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        estimated_vo2max: 15.0, // Below minimum
        intervals_completed: 4,
      };

      t.throws(
        () => createVO2maxSession(sessionData),
        /Estimated VO2max must be between 20.0 and 80.0 ml\/kg\/min/,
        'Throws error for VO2max < 20.0'
      );
    });

    await t.test('should reject estimated_vo2max above 80.0 ml/kg/min', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        estimated_vo2max: 85.0, // Above maximum
        intervals_completed: 4,
      };

      t.throws(
        () => createVO2maxSession(sessionData),
        /Estimated VO2max must be between 20.0 and 80.0 ml\/kg\/min/,
        'Throws error for VO2max > 80.0'
      );
    });

    await t.test('should reject Norwegian 4x4 with > 4 intervals', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        intervals_completed: 5, // Above maximum
      };

      t.throws(
        () => createVO2maxSession(sessionData),
        /Norwegian 4x4 protocol allows 0-4 intervals/,
        'Throws error for intervals > 4'
      );
    });

    await t.test('should accept valid Norwegian 4x4 session', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        average_heart_rate: 165,
        peak_heart_rate: 180,
        intervals_completed: 4,
      };

      const sessionId = createVO2maxSession(sessionData);
      t.type(sessionId, 'number', 'Returns session ID');
      t.ok(sessionId > 0, 'Session ID is positive');

      // Cleanup
      db.prepare('DELETE FROM vo2max_sessions WHERE id = ?').run(sessionId);
    });

    await t.test('should accept valid Zone 2 session', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'zone2',
        duration_minutes: 60,
        average_heart_rate: 140,
        peak_heart_rate: 150,
      };

      const sessionId = createVO2maxSession(sessionData);
      t.type(sessionId, 'number', 'Returns session ID');
      t.ok(sessionId > 0, 'Session ID is positive');

      // Cleanup
      db.prepare('DELETE FROM vo2max_sessions WHERE id = ?').run(sessionId);
    });

    await t.teardown(() => {
      // Cleanup test data
      db.prepare('DELETE FROM vo2max_sessions WHERE workout_id = ?').run(workoutId);
      db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId);
      db.prepare('DELETE FROM program_days WHERE id = ?').run(programDayId);
      db.prepare('DELETE FROM programs WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });
  });

  // Auto-calculation Tests
  await t.test('createVO2maxSession() - auto-calculation', async (t) => {
    let userId: number;
    let workoutId: number;
    const sessionIds: number[] = [];

    await t.before(async () => {
      const now = Date.now();
      const userResult = db
        .prepare(
          `INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(`test-vo2max-calc-${Date.now()}@example.com`, 'hash123', 28, 80, 'intermediate', now, now);
      userId = userResult.lastInsertRowid as number;

      const programResult = db
        .prepare(`INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(userId, 'Test Program', 1, 'mev', now);
      const programId = programResult.lastInsertRowid as number;

      const dayResult = db
        .prepare(`INSERT INTO program_days (program_id, day_of_week, day_name, day_type) VALUES (?, ?, ?, ?)`)
        .run(programId, 1, 'VO2max A', 'vo2max');
      const programDayId = dayResult.lastInsertRowid as number;

      const workoutResult = db
        .prepare(`INSERT INTO workouts (user_id, program_day_id, date, status, synced) VALUES (?, ?, ?, 'not_started', 1)`)
        .run(userId, programDayId, '2025-10-03');
      workoutId = workoutResult.lastInsertRowid as number;
    });

    await t.test('should auto-calculate VO2max when HR provided and VO2max not provided', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        average_heart_rate: 170,
        intervals_completed: 4,
        // estimated_vo2max NOT provided - should be calculated
      };

      const sessionId = createVO2maxSession(sessionData);
      sessionIds.push(sessionId);

      // Retrieve session and check estimated_vo2max
      const session = db.prepare('SELECT * FROM vo2max_sessions WHERE id = ?').get(sessionId) as any;

      t.ok(session.estimated_vo2max !== null, 'VO2max was calculated');
      // Age 28: VO2max = 15.3 × (192/60) ≈ 48.96
      t.ok(session.estimated_vo2max > 48 && session.estimated_vo2max < 50, 'VO2max is approximately 49');
    });

    await t.test('should use provided VO2max if both VO2max and HR provided', async (t) => {
      const providedVO2max = 55.0;
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        average_heart_rate: 170,
        estimated_vo2max: providedVO2max, // Explicitly provided
        intervals_completed: 4,
      };

      const sessionId = createVO2maxSession(sessionData);
      sessionIds.push(sessionId);

      // Retrieve session and check estimated_vo2max
      const session = db.prepare('SELECT * FROM vo2max_sessions WHERE id = ?').get(sessionId) as any;

      t.equal(session.estimated_vo2max, providedVO2max, 'Uses provided VO2max, not calculated');
    });

    await t.test('should leave VO2max null if no HR and no VO2max provided', async (t) => {
      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 28,
        intervals_completed: 3,
        // No HR, no VO2max
      };

      const sessionId = createVO2maxSession(sessionData);
      sessionIds.push(sessionId);

      // Retrieve session and check estimated_vo2max
      const session = db.prepare('SELECT * FROM vo2max_sessions WHERE id = ?').get(sessionId) as any;

      t.equal(session.estimated_vo2max, null, 'VO2max is null when no data available');
    });

    await t.teardown(() => {
      // Cleanup
      for (const id of sessionIds) {
        db.prepare('DELETE FROM vo2max_sessions WHERE id = ?').run(id);
      }
      db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId);
      db.prepare('DELETE FROM program_days WHERE user_id IN (SELECT id FROM programs WHERE user_id = ?)').run(userId);
      db.prepare('DELETE FROM programs WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });
  });

  // Data Retrieval Tests
  await t.test('getVO2maxSessions() - filtering', async (t) => {
    let userId: number;
    const sessionIds: number[] = [];

    await t.before(async () => {
      const now = Date.now();
      const userResult = db
        .prepare(
          `INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(`test-vo2max-filter-${Date.now()}@example.com`, 'hash123', 30, 80, 'intermediate', now, now);
      userId = userResult.lastInsertRowid as number;

      const programResult = db
        .prepare(`INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(userId, 'Test Program', 1, 'mev', now);
      const programId = programResult.lastInsertRowid as number;

      const dayResult = db
        .prepare(`INSERT INTO program_days (program_id, day_of_week, day_name, day_type) VALUES (?, ?, ?, ?)`)
        .run(programId, 1, 'VO2max A', 'vo2max');
      const programDayId = dayResult.lastInsertRowid as number;

      // Create 3 test sessions with different dates and protocols
      const dates = ['2025-10-01', '2025-10-02', '2025-10-03'];
      const protocols: Array<'norwegian_4x4' | 'zone2'> = ['norwegian_4x4', 'zone2', 'norwegian_4x4'];
      const hrs = [160, 140, 170];

      for (let i = 0; i < 3; i++) {
        const workoutResult = db
          .prepare(`INSERT INTO workouts (user_id, program_day_id, date, status, synced) VALUES (?, ?, ?, 'completed', 1)`)
          .run(userId, programDayId, dates[i]);
        const workoutId = workoutResult.lastInsertRowid as number;

        const sessionData: VO2maxSessionData = {
          workout_id: workoutId,
          user_id: userId,
          protocol_type: protocols[i] as 'norwegian_4x4' | 'zone2',
          duration_minutes: protocols[i] === 'norwegian_4x4' ? 30 : 60,
          average_heart_rate: hrs[i],
          intervals_completed: protocols[i] === 'norwegian_4x4' ? 4 : undefined,
        };

        const sessionId = createVO2maxSession(sessionData);
        sessionIds.push(sessionId);
      }
    });

    await t.test('should return all sessions without filters', async (t) => {
      const filters: VO2maxSessionFilters = { user_id: userId };
      const sessions = getVO2maxSessions(filters);

      t.ok(sessions.length >= 3, 'Returns at least 3 sessions');
    });

    await t.test('should filter by start_date', async (t) => {
      const filters: VO2maxSessionFilters = {
        user_id: userId,
        start_date: '2025-10-02',
      };
      const sessions = getVO2maxSessions(filters);

      t.ok(sessions.length >= 2, 'Returns at least 2 sessions on or after 2025-10-02');
      t.ok(sessions.every((s: any) => s.date >= '2025-10-02'), 'All dates are >= start_date');
    });

    await t.test('should filter by end_date', async (t) => {
      const filters: VO2maxSessionFilters = {
        user_id: userId,
        end_date: '2025-10-02',
      };
      const sessions = getVO2maxSessions(filters);

      t.ok(sessions.length >= 2, 'Returns at least 2 sessions on or before 2025-10-02');
      t.ok(sessions.every((s: any) => s.date <= '2025-10-02'), 'All dates are <= end_date');
    });

    await t.test('should filter by date range', async (t) => {
      const filters: VO2maxSessionFilters = {
        user_id: userId,
        start_date: '2025-10-01',
        end_date: '2025-10-02',
      };
      const sessions = getVO2maxSessions(filters);

      t.ok(sessions.length >= 2, 'Returns at least 2 sessions within range');
      t.ok(
        sessions.every((s: any) => s.date >= '2025-10-01' && s.date <= '2025-10-02'),
        'All dates are within range'
      );
    });

    await t.test('should filter by protocol_type (norwegian_4x4)', async (t) => {
      const filters: VO2maxSessionFilters = {
        user_id: userId,
        protocol_type: 'norwegian_4x4',
      };
      const sessions = getVO2maxSessions(filters);

      t.ok(sessions.length >= 2, 'Returns at least 2 Norwegian 4x4 sessions');
      t.ok(sessions.every((s: any) => s.protocol === '4x4'), 'All sessions are Norwegian 4x4');
    });

    await t.test('should filter by protocol_type (zone2)', async (t) => {
      const filters: VO2maxSessionFilters = {
        user_id: userId,
        protocol_type: 'zone2',
      };
      const sessions = getVO2maxSessions(filters);

      t.ok(sessions.length >= 1, 'Returns at least 1 Zone 2 session');
      t.ok(sessions.every((s: any) => s.protocol === 'zone2'), 'All sessions are Zone 2');
    });

    await t.test('should respect limit parameter', async (t) => {
      const filters: VO2maxSessionFilters = {
        user_id: userId,
        limit: 2,
      };
      const sessions = getVO2maxSessions(filters);

      t.ok(sessions.length <= 2, 'Respects limit of 2');
    });

    await t.teardown(() => {
      // Cleanup
      for (const id of sessionIds) {
        db.prepare('DELETE FROM vo2max_sessions WHERE id = ?').run(id);
      }
      db.prepare('DELETE FROM workouts WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM program_days WHERE program_id IN (SELECT id FROM programs WHERE user_id = ?)').run(userId);
      db.prepare('DELETE FROM programs WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });
  });

  // Progression Tracking Tests
  await t.test('getVO2maxProgression()', async (t) => {
    let userId: number;
    const sessionIds: number[] = [];

    await t.before(async () => {
      const now = Date.now();
      const userResult = db
        .prepare(
          `INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(`test-vo2max-prog-${Date.now()}@example.com`, 'hash123', 30, 80, 'intermediate', now, now);
      userId = userResult.lastInsertRowid as number;

      const programResult = db
        .prepare(`INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(userId, 'Test Program', 1, 'mev', now);
      const programId = programResult.lastInsertRowid as number;

      const dayResult = db
        .prepare(`INSERT INTO program_days (program_id, day_of_week, day_name, day_type) VALUES (?, ?, ?, ?)`)
        .run(programId, 1, 'VO2max A', 'vo2max');
      const programDayId = dayResult.lastInsertRowid as number;

      // Create progression data: 3 sessions with improving VO2max
      const sessions = [
        { date: '2025-09-01', vo2max: 45.0 },
        { date: '2025-09-15', vo2max: 47.0 },
        { date: '2025-10-01', vo2max: 48.5 },
      ];

      for (const s of sessions) {
        const workoutResult = db
          .prepare(`INSERT INTO workouts (user_id, program_day_id, date, status, synced) VALUES (?, ?, ?, 'completed', 1)`)
          .run(userId, programDayId, s.date);
        const workoutId = workoutResult.lastInsertRowid as number;

        const sessionData: VO2maxSessionData = {
          workout_id: workoutId,
          user_id: userId,
          protocol_type: 'norwegian_4x4',
          duration_minutes: 30,
          estimated_vo2max: s.vo2max,
          intervals_completed: 4,
        };

        const sessionId = createVO2maxSession(sessionData);
        sessionIds.push(sessionId);
      }
    });

    await t.test('should return progression data ordered by date', async (t) => {
      const progression = getVO2maxProgression(userId);

      t.ok(progression.length >= 3, 'Returns at least 3 progression points');
      const ourSessions = progression.filter((p) => p.date >= '2025-09-01' && p.date <= '2025-10-01');
      t.equal(ourSessions.length, 3, 'Returns our 3 test sessions');
    });

    await t.test('should filter progression by start_date', async (t) => {
      const progression = getVO2maxProgression(userId, '2025-09-15');

      const ourSessions = progression.filter((p) => p.date >= '2025-09-15' && p.date <= '2025-10-01');
      t.ok(ourSessions.length >= 2, 'Returns at least 2 points after start_date');
    });

    await t.test('should filter progression by end_date', async (t) => {
      const progression = getVO2maxProgression(userId, undefined, '2025-09-15');

      const ourSessions = progression.filter((p) => p.date >= '2025-09-01' && p.date <= '2025-09-15');
      t.ok(ourSessions.length >= 2, 'Returns at least 2 points before end_date');
    });

    await t.test('should filter progression by date range', async (t) => {
      const progression = getVO2maxProgression(userId, '2025-09-10', '2025-09-20');

      const sessionInRange = progression.find((p) => p.date === '2025-09-15');
      t.ok(sessionInRange, 'Returns session within range');
    });

    await t.teardown(() => {
      // Cleanup
      for (const id of sessionIds) {
        db.prepare('DELETE FROM vo2max_sessions WHERE id = ?').run(id);
      }
      db.prepare('DELETE FROM workouts WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM program_days WHERE program_id IN (SELECT id FROM programs WHERE user_id = ?)').run(userId);
      db.prepare('DELETE FROM programs WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });
  });

  // Single Session Retrieval Tests
  await t.test('getVO2maxSessionById()', async (t) => {
    let userId: number;
    let otherUserId: number;
    let sessionId: number;

    await t.before(async () => {
      const now = Date.now();
      const userResult = db
        .prepare(
          `INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(`test-vo2max-byid-${Date.now()}@example.com`, 'hash123', 30, 80, 'intermediate', now, now);
      userId = userResult.lastInsertRowid as number;

      const otherUserResult = db
        .prepare(
          `INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(`test-vo2max-other-${Date.now()}@example.com`, 'hash123', 25, 75, 'beginner', now, now);
      otherUserId = otherUserResult.lastInsertRowid as number;

      const programResult = db
        .prepare(`INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(userId, 'Test Program', 1, 'mev', now);
      const programId = programResult.lastInsertRowid as number;

      const dayResult = db
        .prepare(`INSERT INTO program_days (program_id, day_of_week, day_name, day_type) VALUES (?, ?, ?, ?)`)
        .run(programId, 1, 'VO2max A', 'vo2max');
      const programDayId = dayResult.lastInsertRowid as number;

      const workoutResult = db
        .prepare(`INSERT INTO workouts (user_id, program_day_id, date, status, synced) VALUES (?, ?, ?, 'completed', 1)`)
        .run(userId, programDayId, '2025-10-03');
      const workoutId = workoutResult.lastInsertRowid as number;

      const sessionData: VO2maxSessionData = {
        workout_id: workoutId,
        user_id: userId,
        protocol_type: 'norwegian_4x4',
        duration_minutes: 30,
        average_heart_rate: 165,
        peak_heart_rate: 180,
        intervals_completed: 4,
      };

      sessionId = createVO2maxSession(sessionData);
    });

    await t.test('should return session by ID for correct user', async (t) => {
      const session = getVO2maxSessionById(sessionId, userId);

      t.ok(session !== null, 'Returns session');
      t.equal(session.id, sessionId, 'Correct session ID');
      t.equal(session.user_id, userId, 'Correct user ID');
    });

    await t.test('should return null for non-existent session', async (t) => {
      const session = getVO2maxSessionById(99999, userId);

      t.equal(session, null, 'Returns null for non-existent session');
    });

    await t.test('should return null for session belonging to different user', async (t) => {
      const session = getVO2maxSessionById(sessionId, otherUserId);

      t.equal(session, null, 'Returns null for other users session');
    });

    await t.teardown(() => {
      // Cleanup
      db.prepare('DELETE FROM vo2max_sessions WHERE id = ?').run(sessionId);
      db.prepare('DELETE FROM workouts WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM program_days WHERE program_id IN (SELECT id FROM programs WHERE user_id = ?)').run(userId);
      db.prepare('DELETE FROM programs WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(otherUserId);
    });
  });
});
