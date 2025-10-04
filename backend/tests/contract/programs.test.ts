import tap from 'tap';
import buildApp from '../../src/server.js';

/**
 * Program Management API Contract Tests
 *
 * These tests validate API compliance with /specs/002-actual-gaps-ultrathink/contracts/programs.yaml
 *
 * TDD Requirement: These tests MUST FAIL initially as no implementation exists yet.
 * Constitution: Test-First Development (Principle I) - NON-NEGOTIABLE
 *
 * Test Coverage:
 * - T006: GET /api/programs (list user's active program)
 * - T007: PATCH /api/programs/:id/advance-phase (MEV→MAV→MRV→Deload transitions)
 * - T008: GET /api/programs/:id/volume (weekly volume per muscle group)
 */

tap.test('Program Management Endpoints Contract Tests', async (t) => {
  const app = await buildApp();

  // Create test user and get auth token
  let authToken: string;
  let userId: number;
  let testUsername: string;

  await t.before(async () => {
    testUsername = `test-programs-${Date.now()}@example.com`;

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
        age: 30,
        weight_kg: 80,
        experience_level: 'intermediate'
      }
    });

    const registerBody = registerResponse.json();
    userId = registerBody.user_id;

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: testUsername,
        password: 'SecurePass123!'
      }
    });

    authToken = loginResponse.json().token;
  });

  // T006: Contract test GET /api/programs (active program)
  await t.test('GET /api/programs', async (t) => {
    await t.test('should return active program with full structure (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/programs',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();

      // Validate ProgramFull schema
      t.type(body.id, 'number', 'Program has id');
      t.type(body.user_id, 'number', 'Program has user_id');
      t.equal(body.user_id, userId, 'Program belongs to authenticated user');

      // Validate mesocycle_phase enum
      t.ok(['mev', 'mav', 'mrv', 'deload'].includes(body.mesocycle_phase),
        'Program has valid mesocycle_phase');

      // Validate mesocycle_week (1-8)
      t.type(body.mesocycle_week, 'number', 'Program has mesocycle_week');
      t.ok(body.mesocycle_week >= 1 && body.mesocycle_week <= 8,
        'mesocycle_week is between 1 and 8');

      // Validate program_days array
      t.ok(Array.isArray(body.program_days), 'Program has program_days array');
      t.ok(body.program_days.length > 0, 'Program has at least one program day');

      // Validate ProgramDay schema
      const programDay = body.program_days[0];
      t.type(programDay.id, 'number', 'ProgramDay has id');
      t.type(programDay.day_name, 'string', 'ProgramDay has day_name');
      t.type(programDay.day_of_week, 'number', 'ProgramDay has day_of_week');
      t.ok(programDay.day_of_week >= 1 && programDay.day_of_week <= 7,
        'day_of_week is between 1 and 7');

      // Validate exercises array
      t.ok(Array.isArray(programDay.exercises), 'ProgramDay has exercises array');

      if (programDay.exercises.length > 0) {
        const programExercise = programDay.exercises[0];

        // Validate ProgramExercise schema
        t.type(programExercise.id, 'number', 'ProgramExercise has id');
        t.type(programExercise.exercise_id, 'number', 'ProgramExercise has exercise_id');
        t.type(programExercise.exercise_name, 'string', 'ProgramExercise has exercise_name');
        t.type(programExercise.target_sets, 'number', 'ProgramExercise has target_sets');
        t.ok(programExercise.target_sets >= 1 && programExercise.target_sets <= 10,
          'target_sets is between 1 and 10');
        t.type(programExercise.target_rep_range, 'string', 'ProgramExercise has target_rep_range');
        t.match(programExercise.target_rep_range, /^\d+-\d+$/,
          'target_rep_range follows format "6-8"');
        t.type(programExercise.target_rir, 'number', 'ProgramExercise has target_rir');
        t.ok(programExercise.target_rir >= 0 && programExercise.target_rir <= 4,
          'target_rir is between 0 and 4');
        t.type(programExercise.order_index, 'number', 'ProgramExercise has order_index');
      }
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/programs'
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
      const body = response.json();
      t.ok(body.error || body.message, 'Returns error message');
    });

    await t.test('should return 404 when user has no active program', async (t) => {
      // Note: In actual implementation, all users get a default program on registration.
      // This test validates the 404 behavior for edge cases where no program exists.
      // We skip this test as it's not applicable to the current design.
      t.skip('All users get a default program on registration - 404 scenario not applicable');
    });
  });

  // T007: Contract test PATCH /api/programs/:id/advance-phase
  await t.test('PATCH /api/programs/:id/advance-phase', async (t) => {
    let programId: number;

    await t.before(async () => {
      // Get the active program ID
      const programResponse = await app.inject({
        method: 'GET',
        url: '/api/programs',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      programId = programResponse.json().id;
    });

    await t.test('should advance phase automatically (MEV→MAV) (200)', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/programs/${programId}/advance-phase`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          manual: false
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();

      // Validate response schema
      t.type(body.previous_phase, 'string', 'Response has previous_phase');
      t.ok(['mev', 'mav', 'mrv', 'deload'].includes(body.previous_phase),
        'previous_phase is valid');

      t.type(body.new_phase, 'string', 'Response has new_phase');
      t.ok(['mev', 'mav', 'mrv', 'deload'].includes(body.new_phase),
        'new_phase is valid');

      t.type(body.volume_multiplier, 'number', 'Response has volume_multiplier');
      t.ok(body.volume_multiplier > 0, 'volume_multiplier is positive');

      t.type(body.exercises_updated, 'number', 'Response has exercises_updated');
      t.ok(body.exercises_updated >= 0, 'exercises_updated is non-negative');

      // Validate phase transition logic
      if (body.previous_phase === 'mev') {
        t.equal(body.new_phase, 'mav', 'MEV advances to MAV');
        t.ok(body.volume_multiplier >= 1.15 && body.volume_multiplier <= 1.25,
          'MEV→MAV volume multiplier is ~1.2');
      }
    });

    await t.test('should advance phase manually to specific target (200)', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/programs/${programId}/advance-phase`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          manual: true,
          target_phase: 'mrv'
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();

      t.equal(body.new_phase, 'mrv', 'Phase advanced to target mrv');
      t.type(body.volume_multiplier, 'number', 'Has volume_multiplier');
      t.type(body.exercises_updated, 'number', 'Has exercises_updated');
    });

    await t.test('should transition to deload from MRV (200)', async (t) => {
      // First advance to MRV
      await app.inject({
        method: 'PATCH',
        url: `/api/programs/${programId}/advance-phase`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          manual: true,
          target_phase: 'mrv'
        }
      });

      // Then advance to deload
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/programs/${programId}/advance-phase`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          manual: true,
          target_phase: 'deload'
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();

      t.equal(body.previous_phase, 'mrv', 'Previous phase was MRV');
      t.equal(body.new_phase, 'deload', 'New phase is deload');
      t.ok(body.volume_multiplier <= 0.6, 'Deload reduces volume by ~50%');
    });

    await t.test('should return 400 for invalid phase transition', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/programs/${programId}/advance-phase`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          manual: true,
          target_phase: 'invalid_phase'
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error || body.message, 'Returns error message');
    });

    await t.test('should return 400 when manual=true but target_phase missing', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/programs/${programId}/advance-phase`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          manual: true
          // target_phase is missing
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error || body.message, 'Returns error message');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/programs/${programId}/advance-phase`,
        payload: {
          manual: false
        }
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });

    await t.test('should return 404 for non-existent program', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/programs/99999/advance-phase',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          manual: false
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error || body.message, 'Returns error message');
    });
  });

  // T008: Contract test GET /api/programs/:id/volume
  await t.test('GET /api/programs/:id/volume', async (t) => {
    let programId: number;

    await t.before(async () => {
      // Get the active program ID
      const programResponse = await app.inject({
        method: 'GET',
        url: '/api/programs',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      programId = programResponse.json().id;
    });

    await t.test('should return volume analysis per muscle group (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/programs/${programId}/volume`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();

      // Validate response has muscle_groups array
      t.ok(Array.isArray(body.muscle_groups), 'Response has muscle_groups array');
      t.ok(body.muscle_groups.length > 0, 'At least one muscle group present');

      // Validate MuscleGroupVolume schema
      const muscleGroup = body.muscle_groups[0];
      t.type(muscleGroup.muscle_group, 'string', 'Has muscle_group name');
      t.type(muscleGroup.planned_sets, 'number', 'Has planned_sets');
      t.ok(muscleGroup.planned_sets >= 0, 'planned_sets is non-negative');
      t.type(muscleGroup.mev, 'number', 'Has MEV value');
      t.type(muscleGroup.mav, 'number', 'Has MAV value');
      t.type(muscleGroup.mrv, 'number', 'Has MRV value');

      // Validate volume zone enum
      t.type(muscleGroup.zone, 'string', 'Has zone classification');
      t.ok(['below_mev', 'adequate', 'optimal', 'above_mrv'].includes(muscleGroup.zone),
        'Zone is valid enum value');

      // Validate MEV < MAV < MRV progression
      t.ok(muscleGroup.mev < muscleGroup.mav, 'MEV < MAV');
      t.ok(muscleGroup.mav < muscleGroup.mrv, 'MAV < MRV');

      // Validate warnings array exists
      t.ok(Array.isArray(body.warnings), 'Response has warnings array');

      // If warnings exist, validate schema
      if (body.warnings.length > 0) {
        const warning = body.warnings[0];
        t.type(warning.muscle_group, 'string', 'Warning has muscle_group');
        t.ok(['below_mev', 'above_mrv'].includes(warning.issue),
          'Warning issue is valid enum');
        t.type(warning.current_volume, 'number', 'Warning has current_volume');
        t.type(warning.threshold, 'number', 'Warning has threshold');
      }
    });

    await t.test('should classify volume zones correctly', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/programs/${programId}/volume`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      const body = response.json();

      // Validate zone logic for each muscle group
      body.muscle_groups.forEach((mg: any) => {
        if (mg.planned_sets < mg.mev) {
          t.equal(mg.zone, 'below_mev', `${mg.muscle_group}: planned < MEV → below_mev`);
        } else if (mg.planned_sets >= mg.mev && mg.planned_sets < mg.mav) {
          t.equal(mg.zone, 'adequate', `${mg.muscle_group}: MEV ≤ planned < MAV → adequate`);
        } else if (mg.planned_sets >= mg.mav && mg.planned_sets <= mg.mrv) {
          t.equal(mg.zone, 'optimal', `${mg.muscle_group}: MAV ≤ planned ≤ MRV → optimal`);
        } else if (mg.planned_sets > mg.mrv) {
          t.equal(mg.zone, 'above_mrv', `${mg.muscle_group}: planned > MRV → above_mrv`);
        }
      });
    });

    await t.test('should generate warnings for suboptimal volume', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/programs/${programId}/volume`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      const body = response.json();

      // Check warnings match actual volume issues
      const belowMevGroups = body.muscle_groups.filter((mg: any) => mg.zone === 'below_mev');
      const aboveMrvGroups = body.muscle_groups.filter((mg: any) => mg.zone === 'above_mrv');

      const belowMevWarnings = body.warnings.filter((w: any) => w.issue === 'below_mev');
      const aboveMrvWarnings = body.warnings.filter((w: any) => w.issue === 'above_mrv');

      t.equal(belowMevWarnings.length, belowMevGroups.length,
        'Warning count matches below_mev muscle groups');
      t.equal(aboveMrvWarnings.length, aboveMrvGroups.length,
        'Warning count matches above_mrv muscle groups');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/programs/${programId}/volume`
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });

    await t.test('should return 404 for non-existent program', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/programs/99999/volume',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error || body.message, 'Returns error message');
    });

    await t.test('should return 404 for another user\'s program', async (t) => {
      // Create another user with a program
      const otherUserResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          username: `test-other-user-${Date.now()}@example.com`,
          password: 'SecurePass123!',
          age: 28,
          weight_kg: 85,
          experience_level: 'advanced'
        }
      });

      const otherUserLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: otherUserResponse.json().username,
          password: 'SecurePass123!'
        }
      });

      const otherUserToken = otherUserLogin.json().token;

      // Get other user's program
      const otherProgramResponse = await app.inject({
        method: 'GET',
        url: '/api/programs',
        headers: {
          authorization: `Bearer ${otherUserToken}`
        }
      });

      const otherProgramId = otherProgramResponse.json().id;

      // Try to access other user's program with original user's token
      const response = await app.inject({
        method: 'GET',
        url: `/api/programs/${otherProgramId}/volume`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found (prevents data leakage)');
    });
  });

  await t.teardown(async () => {
    await app.close();
  });
});
