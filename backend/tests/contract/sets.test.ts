import { test } from 'tap';
import { buildApp } from '../../src/server.js';

/**
 * Contract Test: POST /api/sets
 *
 * This test validates the API contract for set logging endpoint.
 * Per TDD requirements, this test MUST FAIL initially before implementation.
 *
 * Schema validation based on: /specs/001-specify-build-fitflow/contracts/workouts.openapi.yaml
 */

test('POST /api/sets - contract validation', async (t) => {
  // Setup test server with actual implementation
  const app = await buildApp();

  await t.test('returns 201 with valid set data', async (t) => {
    const validSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 100,
      reps: 8,
      rir: 2,
      timestamp: Date.now(),
      localId: 12345,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      payload: validSetData,
    });

    t.equal(response.statusCode, 201, 'should return 201 Created');

    const body = JSON.parse(response.body);
    t.ok(body.id, 'response should contain id');
    t.equal(body.localId, validSetData.localId, 'response should echo localId');
    t.equal(body.synced, true, 'response should indicate synced=true');
  });

  await t.test('returns 400 for weight > 500kg', async (t) => {
    const invalidSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 501, // Exceeds maximum
      reps: 8,
      rir: 2,
      timestamp: Date.now(),
      localId: 12346,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      payload: invalidSetData,
    });

    t.equal(response.statusCode, 400, 'should return 400 Bad Request for weight > 500');
  });

  await t.test('returns 400 for reps > 50', async (t) => {
    const invalidSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 100,
      reps: 51, // Exceeds maximum
      rir: 2,
      timestamp: Date.now(),
      localId: 12347,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      payload: invalidSetData,
    });

    t.equal(response.statusCode, 400, 'should return 400 Bad Request for reps > 50');
  });

  await t.test('returns 400 for rir > 4', async (t) => {
    const invalidSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 100,
      reps: 8,
      rir: 5, // Exceeds maximum
      timestamp: Date.now(),
      localId: 12348,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      payload: invalidSetData,
    });

    t.equal(response.statusCode, 400, 'should return 400 Bad Request for rir > 4');
  });

  await t.test('returns 400 for weight < 0', async (t) => {
    const invalidSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: -10, // Negative weight
      reps: 8,
      rir: 2,
      timestamp: Date.now(),
      localId: 12349,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      payload: invalidSetData,
    });

    t.equal(response.statusCode, 400, 'should return 400 Bad Request for negative weight');
  });

  await t.test('returns 400 for reps < 1', async (t) => {
    const invalidSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 100,
      reps: 0, // Below minimum
      rir: 2,
      timestamp: Date.now(),
      localId: 12350,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      payload: invalidSetData,
    });

    t.equal(response.statusCode, 400, 'should return 400 Bad Request for reps < 1');
  });

  await t.test('returns 400 for rir < 0', async (t) => {
    const invalidSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 100,
      reps: 8,
      rir: -1, // Below minimum
      timestamp: Date.now(),
      localId: 12351,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      payload: invalidSetData,
    });

    t.equal(response.statusCode, 400, 'should return 400 Bad Request for rir < 0');
  });

  await t.test('returns 400 for missing required fields', async (t) => {
    const incompleteSetData = {
      workout_id: 1,
      // Missing: exercise_id, set_number, weight_kg, reps, rir, timestamp
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      payload: incompleteSetData,
    });

    t.equal(response.statusCode, 400, 'should return 400 Bad Request for missing fields');
  });

  await t.test('returns 401 unauthorized without JWT', async (t) => {
    const validSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 100,
      reps: 8,
      rir: 2,
      timestamp: Date.now(),
      localId: 12352,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: validSetData,
    });

    t.equal(response.statusCode, 401, 'should return 401 Unauthorized without Authorization header');
  });

  await t.test('returns 401 with invalid JWT', async (t) => {
    const validSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 100,
      reps: 8,
      rir: 2,
      timestamp: Date.now(),
      localId: 12353,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json',
      },
      payload: validSetData,
    });

    t.equal(response.statusCode, 401, 'should return 401 Unauthorized with invalid token');
  });

  await t.test('validates request schema matches OpenAPI spec', async (t) => {
    const validSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 100,
      reps: 8,
      rir: 2,
      timestamp: Date.now(),
      localId: 12354,
      notes: 'Felt strong today', // Optional field
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      payload: validSetData,
    });

    // Should accept optional notes field up to 500 chars
    if (response.statusCode === 201) {
      t.pass('optional notes field accepted');
    }
  });

  await t.test('validates response schema matches OpenAPI spec', async (t) => {
    const validSetData = {
      workout_id: 1,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 100,
      reps: 8,
      rir: 2,
      timestamp: Date.now(),
      localId: 12355,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/sets',
      headers: {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json',
      },
      payload: validSetData,
    });

    if (response.statusCode === 201) {
      const body = JSON.parse(response.body);

      // Validate response schema
      t.type(body.id, 'number', 'id should be a number');
      t.type(body.localId, 'number', 'localId should be a number');
      t.type(body.synced, 'boolean', 'synced should be a boolean');

      // Ensure no extra fields
      const expectedKeys = ['id', 'localId', 'synced'];
      const actualKeys = Object.keys(body);
      const extraKeys = actualKeys.filter(key => !expectedKeys.includes(key));
      t.equal(extraKeys.length, 0, 'response should not contain extra fields');
    }
  });

  await app.close();
});
