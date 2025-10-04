import tap from 'tap';
import buildApp from '../../src/server.js';

/**
 * Exercise Library API Contract Tests
 *
 * These tests validate API compliance with /specs/002-actual-gaps-ultrathink/contracts/exercises.yaml
 *
 * TDD Requirement: These tests MUST FAIL initially as no implementation exists yet.
 * Constitution: Test-First Development (Principle I) - NON-NEGOTIABLE
 */

tap.test('Exercise Library Endpoints Contract Tests', async (t) => {
  const app = await buildApp();

  // Create test user and get auth token
  let authToken: string;

  t.before(async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: `test-exercises-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        age: 30,
        weight_kg: 80,
        experience_level: 'intermediate'
      }
    });

    const body = registerResponse.json();
    authToken = body.token;
  });

  // T004: Contract test GET /api/exercises with filtering
  await t.test('GET /api/exercises', async (t) => {
    await t.test('should return all exercises without filters (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(Array.isArray(body.exercises), 'Returns exercises array');
      t.type(body.count, 'number', 'Returns count field');
      t.ok(body.exercises.length > 0, 'Returns at least one exercise');

      // Validate exercise schema
      const exercise = body.exercises[0];
      t.type(exercise.id, 'number', 'Exercise has id');
      t.type(exercise.name, 'string', 'Exercise has name');
      t.type(exercise.primary_muscle_group, 'string', 'Exercise has primary_muscle_group');
      t.ok(Array.isArray(exercise.secondary_muscle_groups), 'Exercise has secondary_muscle_groups array');
      t.type(exercise.equipment, 'string', 'Exercise has equipment');
      t.ok(['compound', 'isolation'].includes(exercise.movement_pattern), 'Exercise has valid movement_pattern');
    });

    await t.test('should filter by muscle_group (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises?muscle_group=chest',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(body.exercises.every((ex: any) =>
        ex.primary_muscle_group === 'chest' ||
        ex.secondary_muscle_groups.includes('chest')
      ), 'All exercises target chest');
    });

    await t.test('should filter by equipment (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises?equipment=barbell',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(body.exercises.every((ex: any) => ex.equipment === 'barbell'), 'All exercises use barbell');
    });

    await t.test('should filter by movement_pattern (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises?movement_pattern=compound',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(body.exercises.every((ex: any) => ex.movement_pattern === 'compound'), 'All exercises are compound');
    });

    await t.test('should return 400 for invalid muscle_group', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises?muscle_group=invalid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });
  });

  // T005: Contract test GET /api/exercises/:id
  await t.test('GET /api/exercises/:id', async (t) => {
    await t.test('should return exercise details by ID (200)', async (t) => {
      // First get an exercise ID
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      const exerciseId = listResponse.json().exercises[0].id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/exercises/${exerciseId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.equal(body.id, exerciseId, 'Returns correct exercise');
      t.type(body.name, 'string', 'Has name');
      t.type(body.primary_muscle_group, 'string', 'Has primary_muscle_group');
      t.ok(Array.isArray(body.secondary_muscle_groups), 'Has secondary_muscle_groups');
      t.type(body.equipment, 'string', 'Has equipment');
      t.type(body.movement_pattern, 'string', 'Has movement_pattern');
      t.type(body.description, 'string', 'Has description');
    });

    await t.test('should return 404 for non-existent exercise', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises/99999',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises/1'
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });
  });

  await t.teardown(async () => {
    await app.close();
  });
});
