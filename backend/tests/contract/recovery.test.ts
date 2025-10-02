import tap from 'tap';
import { buildApp } from '../../src/server.js';

/**
 * Contract Test: POST /api/recovery-assessments
 *
 * Tests recovery assessment endpoint contract compliance per FR-008 and FR-009.
 * This test MUST FAIL initially (TDD requirement).
 *
 * Recovery Scale: 1-5 per question (sleep_quality, muscle_soreness, mental_motivation)
 * Total Score Range: 3-15
 * Auto-Regulation Logic (FR-009):
 *   - 12-15: no adjustment
 *   - 9-11: reduce_1_set
 *   - 6-8: reduce_2_sets
 *   - 3-5: rest_day
 */

tap.test('POST /api/recovery-assessments - Contract Tests', async (t) => {
  const fastify = await buildApp();

  // Create test user and get JWT token for authenticated tests
  let authToken = '';

  t.before(async () => {
    // Register test user
    const registerResponse = await fastify.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: `recovery-test-${Date.now()}@example.com`,
        password: 'TestPass123!',
        age: 30,
        weight_kg: 80,
        experience_level: 'intermediate',
      },
    });

    if (registerResponse.statusCode === 201) {
      const body = JSON.parse(registerResponse.body);
      authToken = body.token;
    }
  });

  t.teardown(async () => {
    await fastify.close();
  });

  await t.test('should return 401 when no JWT token provided', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      payload: {
        date: '2025-10-02',
        sleep_quality: 3,
        muscle_soreness: 3,
        mental_motivation: 2,
      },
    });

    t.equal(response.statusCode, 401, 'returns 401 Unauthorized');
  });

  await t.test('should validate request schema - all fields required', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        // Missing required fields
      },
    });

    t.equal(response.statusCode, 400, 'returns 400 Bad Request for missing fields');
  });

  await t.test('should validate sleep_quality range (1-5)', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 6, // Invalid: outside 1-5 range
        muscle_soreness: 3,
        mental_motivation: 3,
      },
    });

    t.equal(response.statusCode, 400, 'returns 400 for sleep_quality > 5');
  });

  await t.test('should validate muscle_soreness range (1-5)', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 3,
        muscle_soreness: 0, // Invalid: outside 1-5 range
        mental_motivation: 3,
      },
    });

    t.equal(response.statusCode, 400, 'returns 400 for muscle_soreness < 1');
  });

  await t.test('should validate mental_motivation range (1-5)', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 3,
        muscle_soreness: 3,
        mental_motivation: 10, // Invalid: outside 1-5 range
      },
    });

    t.equal(response.statusCode, 400, 'returns 400 for mental_motivation > 5');
  });

  await t.test('should create recovery assessment with valid data', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 4,
        muscle_soreness: 3,
        mental_motivation: 5,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.ok(body.total_score, 'response includes total_score');
    t.equal(body.total_score, 12, 'total_score = 4 + 3 + 5 = 12');
    t.ok(body.volume_adjustment, 'response includes volume_adjustment');
    t.type(body.volume_adjustment, 'string', 'volume_adjustment is a string');
  });

  await t.test('should return response schema with correct fields', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 3,
        muscle_soreness: 3,
        mental_motivation: 3,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.hasProp(body, 'total_score', 'response has total_score property');
    t.hasProp(body, 'volume_adjustment', 'response has volume_adjustment property');
    t.type(body.total_score, 'number', 'total_score is a number');
    t.ok(body.total_score >= 3 && body.total_score <= 15, 'total_score in range 3-15');
  });

  await t.test('should apply auto-regulation logic: score 12-15 → no adjustment', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 5,
        muscle_soreness: 5,
        mental_motivation: 5,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.equal(body.total_score, 15, 'total_score = 5 + 5 + 5 = 15');
    t.equal(body.volume_adjustment, 'none', 'volume_adjustment is "none" for score 15');
  });

  await t.test('should apply auto-regulation logic: score 9-11 → reduce_1_set', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 3,
        muscle_soreness: 3,
        mental_motivation: 4,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.equal(body.total_score, 10, 'total_score = 3 + 3 + 4 = 10');
    t.equal(body.volume_adjustment, 'reduce_1_set', 'volume_adjustment is "reduce_1_set" for score 10');
  });

  await t.test('should apply auto-regulation logic: score 6-8 → reduce_2_sets (FR-009)', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 2,
        muscle_soreness: 3,
        mental_motivation: 3,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.equal(body.total_score, 8, 'total_score = 2 + 3 + 3 = 8');
    t.equal(body.volume_adjustment, 'reduce_2_sets', 'volume_adjustment is "reduce_2_sets" for score 8 (per FR-009)');
  });

  await t.test('should apply auto-regulation logic: score 3-5 → rest_day', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 1,
        muscle_soreness: 1,
        mental_motivation: 2,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.equal(body.total_score, 4, 'total_score = 1 + 1 + 2 = 4');
    t.equal(body.volume_adjustment, 'rest_day', 'volume_adjustment is "rest_day" for score 4');
  });

  await t.test('should validate volume_adjustment enum values', async (t) => {
    const validAdjustments = ['none', 'reduce_1_set', 'reduce_2_sets', 'rest_day'];

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 3,
        muscle_soreness: 3,
        mental_motivation: 3,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.ok(
      validAdjustments.includes(body.volume_adjustment),
      'volume_adjustment is one of the valid enum values'
    );
  });

  await t.test('should validate date format', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: 'invalid-date',
        sleep_quality: 3,
        muscle_soreness: 3,
        mental_motivation: 3,
      },
    });

    t.equal(response.statusCode, 400, 'returns 400 for invalid date format');
  });

  await t.test('should calculate edge case: minimum score (3)', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 1,
        muscle_soreness: 1,
        mental_motivation: 1,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.equal(body.total_score, 3, 'total_score = 1 + 1 + 1 = 3 (minimum)');
    t.equal(body.volume_adjustment, 'rest_day', 'volume_adjustment is "rest_day" for minimum score');
  });

  await t.test('should calculate boundary: score 12 → no adjustment', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 4,
        muscle_soreness: 4,
        mental_motivation: 4,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.equal(body.total_score, 12, 'total_score = 4 + 4 + 4 = 12');
    t.equal(body.volume_adjustment, 'none', 'volume_adjustment is "none" for score 12 (boundary)');
  });

  await t.test('should calculate boundary: score 11 → reduce_1_set', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 4,
        muscle_soreness: 4,
        mental_motivation: 3,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.equal(body.total_score, 11, 'total_score = 4 + 4 + 3 = 11');
    t.equal(body.volume_adjustment, 'reduce_1_set', 'volume_adjustment is "reduce_1_set" for score 11 (boundary)');
  });

  await t.test('should calculate boundary: score 9 → reduce_1_set', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 3,
        muscle_soreness: 3,
        mental_motivation: 3,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.equal(body.total_score, 9, 'total_score = 3 + 3 + 3 = 9');
    t.equal(body.volume_adjustment, 'reduce_1_set', 'volume_adjustment is "reduce_1_set" for score 9 (boundary)');
  });

  await t.test('should calculate boundary: score 6 → reduce_2_sets', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 2,
        muscle_soreness: 2,
        mental_motivation: 2,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.equal(body.total_score, 6, 'total_score = 2 + 2 + 2 = 6');
    t.equal(body.volume_adjustment, 'reduce_2_sets', 'volume_adjustment is "reduce_2_sets" for score 6 (boundary)');
  });

  await t.test('should calculate boundary: score 5 → rest_day', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/recovery-assessments',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        date: '2025-10-02',
        sleep_quality: 2,
        muscle_soreness: 2,
        mental_motivation: 1,
      },
    });

    t.equal(response.statusCode, 201, 'returns 201 Created');

    const body = JSON.parse(response.body);
    t.equal(body.total_score, 5, 'total_score = 2 + 2 + 1 = 5');
    t.equal(body.volume_adjustment, 'rest_day', 'volume_adjustment is "rest_day" for score 5 (boundary)');
  });
});
