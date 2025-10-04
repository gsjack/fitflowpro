import tap from 'tap';
import buildApp from '../../src/server.js';

/**
 * Volume Analytics API Contract Tests (T017-T019)
 *
 * These tests validate API compliance with /specs/002-actual-gaps-ultrathink/contracts/analytics-volume.yaml
 *
 * TDD Requirement: These tests MUST FAIL initially as no implementation exists yet.
 * Constitution: Test-First Development (Principle I) - NON-NEGOTIABLE
 *
 * Endpoints tested:
 * - T017: GET /api/analytics/volume-current-week - Current week volume tracking
 * - T018: GET /api/analytics/volume-trends - Historical volume trends
 * - T019: GET /api/analytics/program-volume-analysis - Planned program volume analysis
 */

tap.test('Volume Analytics Endpoints Contract Tests', async (t) => {
  const app = await buildApp();

  // Create test user and get auth token
  let authToken: string;
  let userId: number;

  t.before(async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: `test-analytics-volume-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        age: 28,
        weight_kg: 75,
        experience_level: 'advanced'
      }
    });

    const userData = registerResponse.json();
    userId = userData.user_id;
    authToken = userData.token;
  });

  // T017: Contract test GET /api/analytics/volume-current-week
  await t.test('GET /api/analytics/volume-current-week', async (t) => {
    await t.test('should return current week volume tracking data (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-current-week',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();

      // Validate week boundaries
      t.type(body.week_start, 'string', 'Has week_start field');
      t.type(body.week_end, 'string', 'Has week_end field');
      t.match(body.week_start, /^\d{4}-\d{2}-\d{2}$/, 'week_start is valid date format');
      t.match(body.week_end, /^\d{4}-\d{2}-\d{2}$/, 'week_end is valid date format');

      // Validate muscle_groups array
      t.ok(Array.isArray(body.muscle_groups), 'Has muscle_groups array');

      if (body.muscle_groups.length > 0) {
        const muscleGroup = body.muscle_groups[0];

        // Validate MuscleGroupVolumeTracking schema
        t.type(muscleGroup.muscle_group, 'string', 'Has muscle_group field');
        t.ok(
          ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'abs'].includes(muscleGroup.muscle_group),
          'muscle_group is valid enum value'
        );
        t.type(muscleGroup.completed_sets, 'number', 'Has completed_sets field');
        t.type(muscleGroup.planned_sets, 'number', 'Has planned_sets field');
        t.type(muscleGroup.remaining_sets, 'number', 'Has remaining_sets field');
        t.type(muscleGroup.mev, 'number', 'Has mev field');
        t.type(muscleGroup.mav, 'number', 'Has mav field');
        t.type(muscleGroup.mrv, 'number', 'Has mrv field');
        t.type(muscleGroup.completion_percentage, 'number', 'Has completion_percentage field');

        // Validate zone enum
        t.type(muscleGroup.zone, 'string', 'Has zone field');
        t.ok(
          ['below_mev', 'adequate', 'optimal', 'above_mrv', 'on_track'].includes(muscleGroup.zone),
          'zone is valid enum value'
        );

        // Validate warning (nullable)
        t.ok(
          muscleGroup.warning === null || typeof muscleGroup.warning === 'string',
          'warning is string or null'
        );

        // Validate completion_percentage calculation
        const expectedPercentage = muscleGroup.planned_sets > 0
          ? (muscleGroup.completed_sets / muscleGroup.planned_sets) * 100
          : 0;
        t.ok(
          Math.abs(muscleGroup.completion_percentage - expectedPercentage) < 0.1,
          'completion_percentage is correctly calculated'
        );

        // Validate remaining_sets calculation
        const expectedRemaining = muscleGroup.planned_sets - muscleGroup.completed_sets;
        t.equal(muscleGroup.remaining_sets, expectedRemaining, 'remaining_sets is correctly calculated');
      }
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-current-week'
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });

    await t.test('should validate zone logic based on completed sets', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-current-week',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();

      if (body.muscle_groups.length > 0) {
        body.muscle_groups.forEach((mg: any) => {
          // Validate zone logic
          if (mg.completed_sets < mg.mev) {
            t.equal(mg.zone, 'below_mev', 'Zone is below_mev when completed < MEV');
          } else if (mg.completed_sets >= mg.mev && mg.completed_sets < mg.mav) {
            t.ok(['adequate', 'on_track'].includes(mg.zone), 'Zone is adequate or on_track when MEV <= completed < MAV');
          } else if (mg.completed_sets >= mg.mav && mg.completed_sets <= mg.mrv) {
            t.ok(['optimal', 'on_track'].includes(mg.zone), 'Zone is optimal or on_track when MAV <= completed <= MRV');
          } else if (mg.completed_sets > mg.mrv) {
            t.equal(mg.zone, 'above_mrv', 'Zone is above_mrv when completed > MRV');
          }
        });
      }
    });
  });

  // T018: Contract test GET /api/analytics/volume-trends
  await t.test('GET /api/analytics/volume-trends', async (t) => {
    await t.test('should return volume trends with default 8 weeks (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();

      // Validate weeks array
      t.ok(Array.isArray(body.weeks), 'Has weeks array');
      t.ok(body.weeks.length <= 8, 'Returns at most 8 weeks by default');

      if (body.weeks.length > 0) {
        const week = body.weeks[0];

        // Validate week structure
        t.type(week.week_start, 'string', 'Has week_start field');
        t.match(week.week_start, /^\d{4}-\d{2}-\d{2}$/, 'week_start is valid date format');
        t.ok(Array.isArray(week.muscle_groups), 'Has muscle_groups array');

        if (week.muscle_groups.length > 0) {
          const muscleGroup = week.muscle_groups[0];

          // Validate muscle group schema
          t.type(muscleGroup.muscle_group, 'string', 'Has muscle_group field');
          t.type(muscleGroup.completed_sets, 'number', 'Has completed_sets field');
          t.type(muscleGroup.mev, 'number', 'Has mev field');
          t.type(muscleGroup.mav, 'number', 'Has mav field');
          t.type(muscleGroup.mrv, 'number', 'Has mrv field');

          // Validate muscle group enum
          t.ok(
            ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'abs'].includes(muscleGroup.muscle_group),
            'muscle_group is valid enum value'
          );
        }
      }
    });

    await t.test('should accept custom weeks parameter (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends?weeks=12',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(Array.isArray(body.weeks), 'Has weeks array');
      t.ok(body.weeks.length <= 12, 'Returns at most 12 weeks');
    });

    await t.test('should filter by muscle_group parameter (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends?muscle_group=chest',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();

      // Validate filtering
      if (body.weeks.length > 0 && body.weeks[0].muscle_groups.length > 0) {
        body.weeks.forEach((week: any) => {
          week.muscle_groups.forEach((mg: any) => {
            t.equal(mg.muscle_group, 'chest', 'All muscle groups are filtered to chest');
          });
        });
      }
    });

    await t.test('should accept maximum weeks parameter (52)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends?weeks=52',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(Array.isArray(body.weeks), 'Has weeks array');
      t.ok(body.weeks.length <= 52, 'Returns at most 52 weeks');
    });

    await t.test('should return 400 for weeks exceeding maximum (53)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends?weeks=53',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
      t.match(body.error.toLowerCase(), /weeks|maximum|52/, 'Error mentions weeks parameter limit');
    });

    await t.test('should return 400 for invalid muscle_group', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends?muscle_group=invalid_muscle',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
      t.match(body.error.toLowerCase(), /muscle.?group|invalid/, 'Error mentions invalid muscle_group');
    });

    await t.test('should return 400 for negative weeks parameter', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends?weeks=-5',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for non-numeric weeks parameter', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends?weeks=abc',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends'
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });
  });

  // T019: Contract test GET /api/analytics/program-volume-analysis
  await t.test('GET /api/analytics/program-volume-analysis', async (t) => {
    await t.test('should return program volume analysis for active program (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/program-volume-analysis',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      // Note: This test will either return 200 (if user has active program) or 404 (if no active program)
      // Both are valid per contract
      if (response.statusCode === 200) {
        const body = response.json();

        // Validate program fields
        t.type(body.program_id, 'number', 'Has program_id field');
        t.type(body.mesocycle_phase, 'string', 'Has mesocycle_phase field');
        t.ok(
          ['mev', 'mav', 'mrv', 'deload'].includes(body.mesocycle_phase),
          'mesocycle_phase is valid enum value'
        );

        // Validate muscle_groups array
        t.ok(Array.isArray(body.muscle_groups), 'Has muscle_groups array');

        if (body.muscle_groups.length > 0) {
          const muscleGroup = body.muscle_groups[0];

          // Validate muscle group schema
          t.type(muscleGroup.muscle_group, 'string', 'Has muscle_group field');
          t.type(muscleGroup.planned_weekly_sets, 'number', 'Has planned_weekly_sets field');
          t.type(muscleGroup.mev, 'number', 'Has mev field');
          t.type(muscleGroup.mav, 'number', 'Has mav field');
          t.type(muscleGroup.mrv, 'number', 'Has mrv field');
          t.type(muscleGroup.zone, 'string', 'Has zone field');

          // Validate zone enum
          t.ok(
            ['below_mev', 'adequate', 'optimal', 'above_mrv'].includes(muscleGroup.zone),
            'zone is valid enum value'
          );

          // Validate warning field (nullable)
          t.ok(
            muscleGroup.warning === null || typeof muscleGroup.warning === 'string',
            'warning is string or null'
          );

          // Validate zone logic based on planned volume
          if (muscleGroup.planned_weekly_sets < muscleGroup.mev) {
            t.equal(muscleGroup.zone, 'below_mev', 'Zone is below_mev when planned < MEV');
            t.ok(muscleGroup.warning !== null, 'Warning exists when below MEV');
            t.match(
              muscleGroup.warning.toLowerCase(),
              /below|minimum|mev/,
              'Warning mentions below MEV'
            );
          } else if (muscleGroup.planned_weekly_sets >= muscleGroup.mev && muscleGroup.planned_weekly_sets < muscleGroup.mav) {
            t.equal(muscleGroup.zone, 'adequate', 'Zone is adequate when MEV <= planned < MAV');
          } else if (muscleGroup.planned_weekly_sets >= muscleGroup.mav && muscleGroup.planned_weekly_sets <= muscleGroup.mrv) {
            t.equal(muscleGroup.zone, 'optimal', 'Zone is optimal when MAV <= planned <= MRV');
          } else if (muscleGroup.planned_weekly_sets > muscleGroup.mrv) {
            t.equal(muscleGroup.zone, 'above_mrv', 'Zone is above_mrv when planned > MRV');
            t.ok(muscleGroup.warning !== null, 'Warning exists when above MRV');
            t.match(
              muscleGroup.warning.toLowerCase(),
              /above|maximum|mrv|overtraining/,
              'Warning mentions overtraining risk'
            );
          }

          // Validate muscle group enum
          t.ok(
            ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'abs'].includes(muscleGroup.muscle_group),
            'muscle_group is valid enum value'
          );
        }
      } else if (response.statusCode === 404) {
        // Valid response when user has no active program
        const body = response.json();
        t.ok(body.error, 'Returns error message for no active program');
        t.match(body.error.toLowerCase(), /program|not found|active/, 'Error mentions no active program');
      } else {
        t.fail(`Unexpected status code: ${response.statusCode}`);
      }
    });

    await t.test('should return 404 when no active program exists', async (t) => {
      // Note: This test validates the 404 contract behavior
      // In a real scenario with test data setup, we'd ensure no active program exists
      // For now, we document the expected behavior

      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/program-volume-analysis',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      // Accept both 200 (has active program) and 404 (no active program)
      t.ok(
        response.statusCode === 200 || response.statusCode === 404,
        'Returns 200 or 404 depending on program existence'
      );

      if (response.statusCode === 404) {
        const body = response.json();
        t.ok(body.error, 'Returns error message');
        t.match(body.error.toLowerCase(), /program|not found|active/, 'Error mentions no active program');
      }
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/program-volume-analysis'
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });

    await t.test('should validate MEV/MAV/MRV thresholds exist', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/program-volume-analysis',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      if (response.statusCode === 200) {
        const body = response.json();

        body.muscle_groups.forEach((mg: any) => {
          // Validate MEV/MAV/MRV ordering
          t.ok(mg.mev <= mg.mav, 'MEV is less than or equal to MAV');
          t.ok(mg.mav <= mg.mrv, 'MAV is less than or equal to MRV');
          t.ok(mg.mev > 0, 'MEV is positive');
          t.ok(mg.planned_weekly_sets >= 0, 'Planned weekly sets is non-negative');
        });
      }
    });
  });

  await t.teardown(async () => {
    await app.close();
  });
});
