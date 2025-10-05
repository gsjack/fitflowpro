import tap from 'tap';
import buildApp from '../../src/server.js';

/**
 * Analytics API Contract Tests
 *
 * These tests validate API compliance for analytics endpoints
 *
 * Tests: T017, T018, T019
 */

tap.test('GET /api/analytics/1rm-progression - T017', async (t) => {
  const app = await buildApp();

  // Test without authentication - should return 401
  await t.test('returns 401 unauthorized without JWT', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/analytics/1rm-progression?exercise_id=1&start_date=2025-01-01&end_date=2025-01-31',
    });

    t.equal(response.statusCode, 401, 'should return 401 without auth token');
  });

  // Test with authentication - validate request params and response schema
  await t.test('validates query parameters and response schema', async (t) => {
    // First register a user to get a token (use unique username)
    const uniqueUsername = `analytics-test-1rm-${Date.now()}@example.com`;
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: uniqueUsername,
        password: 'SecurePass123!',
        age: 28,
        weight_kg: 75.5,
        experience_level: 'intermediate',
      },
    });

    const { token } = JSON.parse(registerResponse.body);

    // Test missing query params
    await t.test('requires exercise_id query param', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/1rm-progression?start_date=2025-01-01&end_date=2025-01-31',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      t.equal(response.statusCode, 400, 'should return 400 without exercise_id');
    });

    await t.test('requires start_date query param', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/1rm-progression?exercise_id=1&end_date=2025-01-31',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      t.equal(response.statusCode, 400, 'should return 400 without start_date');
    });

    await t.test('requires end_date query param', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/1rm-progression?exercise_id=1&start_date=2025-01-01',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      t.equal(response.statusCode, 400, 'should return 400 without end_date');
    });

    // Test with valid params - validate response schema
    await t.test('returns valid response schema with all params', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/1rm-progression?exercise_id=1&start_date=2025-01-01&end_date=2025-01-31',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      t.equal(response.statusCode, 200, 'should return 200 with valid params');

      const data = JSON.parse(response.body);
      t.ok(Array.isArray(data), 'response should be an array');

      // If data exists, validate schema
      if (data.length > 0) {
        const firstItem = data[0];
        t.ok(firstItem.hasOwnProperty('date'), 'item should have date property');
        t.ok(firstItem.hasOwnProperty('estimated_1rm'), 'item should have estimated_1rm property');
        t.type(firstItem.date, 'string', 'date should be string (ISO format)');
        t.type(firstItem.estimated_1rm, 'number', 'estimated_1rm should be number');
      }
    });
  });
});

tap.test('GET /api/analytics/volume-trends - T018', async (t) => {
  const app = await buildApp();

  // Test without authentication - should return 401
  await t.test('returns 401 unauthorized without JWT', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/analytics/volume-trends?muscle_group=chest&start_date=2025-01-01&end_date=2025-01-31',
    });

    t.equal(response.statusCode, 401, 'should return 401 without auth token');
  });

  // Test with authentication - validate request params and response schema
  await t.test('validates query parameters and response schema', async (t) => {
    // First register a user to get a token (use unique username)
    const uniqueUsername = `analytics-test-volume-${Date.now()}@example.com`;
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: uniqueUsername,
        password: 'SecurePass123!',
        age: 28,
        weight_kg: 75.5,
        experience_level: 'intermediate',
      },
    });

    const { token } = JSON.parse(registerResponse.body);

    // Test optional query params (muscle_group and weeks are optional in new API)
    await t.test('accepts requests without muscle_group (returns all muscle groups)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      // Should succeed with 200 (muscle_group is optional)
      t.equal(response.statusCode, 200, 'should return 200 without muscle_group (optional param)');
    });

    await t.test('accepts custom weeks parameter', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends?weeks=12',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      t.equal(response.statusCode, 200, 'should return 200 with weeks parameter');
    });

    await t.test('validates weeks parameter (must be positive)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends?weeks=-5',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      t.equal(response.statusCode, 400, 'should return 400 for negative weeks');
    });

    // Test with valid params - validate response schema
    await t.test('returns valid response schema with all params', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/analytics/volume-trends?muscle_group=chest&weeks=8',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      t.equal(response.statusCode, 200, 'should return 200 with valid params');

      const data = JSON.parse(response.body);
      t.ok(data.weeks, 'response should have weeks property');
      t.ok(Array.isArray(data.weeks), 'weeks should be an array');

      // If data exists, validate schema
      if (data.weeks.length > 0) {
        const firstWeek = data.weeks[0];
        t.ok(firstWeek.hasOwnProperty('week_start'), 'week should have week_start property');
        t.ok(firstWeek.hasOwnProperty('muscle_groups'), 'week should have muscle_groups array');
        t.type(firstWeek.week_start, 'string', 'week_start should be string (ISO date format)');
        t.ok(Array.isArray(firstWeek.muscle_groups), 'muscle_groups should be array');

        if (firstWeek.muscle_groups.length > 0) {
          const firstMuscle = firstWeek.muscle_groups[0];
          t.ok(firstMuscle.hasOwnProperty('muscle_group'), 'should have muscle_group');
          t.ok(firstMuscle.hasOwnProperty('completed_sets'), 'should have completed_sets');
        }
      }
    });
  });
});

tap.test('GET /api/analytics/consistency - T019', async (t) => {
  const app = await buildApp();

  // Test without authentication - should return 401
  await t.test('returns 401 unauthorized without JWT', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/analytics/consistency',
    });

    t.equal(response.statusCode, 401, 'should return 401 without auth token');
  });

  // Test with authentication - validate response schema
  await t.test('validates response schema', async (t) => {
    // First register a user to get a token (use unique username)
    const uniqueUsername = `analytics-test-consistency-${Date.now()}@example.com`;
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: uniqueUsername,
        password: 'SecurePass123!',
        age: 28,
        weight_kg: 75.5,
        experience_level: 'intermediate',
      },
    });

    const { token } = JSON.parse(registerResponse.body);

    // Test with valid auth - validate response schema
    const response = await app.inject({
      method: 'GET',
      url: '/api/analytics/consistency',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    t.equal(response.statusCode, 200, 'should return 200 with valid auth');

    const data = JSON.parse(response.body);
    t.type(data, 'object', 'response should be an object');
    t.ok(data.hasOwnProperty('adherence_rate'), 'response should have adherence_rate property');
    t.ok(data.hasOwnProperty('avg_session_duration'), 'response should have avg_session_duration property');
    t.ok(data.hasOwnProperty('total_workouts'), 'response should have total_workouts property');
    t.type(data.adherence_rate, 'number', 'adherence_rate should be number');
    t.type(data.avg_session_duration, 'number', 'avg_session_duration should be number');
    t.type(data.total_workouts, 'number', 'total_workouts should be number');
  });
});
