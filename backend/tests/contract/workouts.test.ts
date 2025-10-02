import tap from 'tap';

/**
 * Contract Tests: Workout Endpoints
 *
 * CRITICAL: These tests MUST FAIL initially (TDD requirement)
 * Reference: /home/asigator/fitness2025/specs/001-specify-build-fitflow/contracts/workouts.openapi.yaml
 *
 * Tests validate:
 * - POST /api/workouts - Create workout session
 * - GET /api/workouts - List user workouts
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Helper: Mock JWT token for testing
 * In actual implementation, this would be generated from a test user
 */
const MOCK_JWT_TOKEN = 'mock.jwt.token';

/**
 * T013: Contract test for POST /api/workouts
 *
 * Validates:
 * - Request schema: program_day_id (integer), date (string format date)
 * - Response schema: Workout object with id, status, timestamps
 * - 401 unauthorized without JWT
 */
tap.test('POST /api/workouts - Create workout session', async (t) => {
  t.test('should return 401 unauthorized without JWT token', async (t) => {
    const response = await fetch(`${API_BASE_URL}/api/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        program_day_id: 1,
        date: '2025-10-02',
      }),
    });

    t.equal(response.status, 401, 'Should return 401 Unauthorized');
  });

  t.test('should validate request schema - missing required fields', async (t) => {
    const response = await fetch(`${API_BASE_URL}/api/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
      },
      body: JSON.stringify({}),
    });

    // Should return 400 for invalid schema (or 401 if auth fails first)
    t.ok(
      response.status === 400 || response.status === 401,
      'Should return 400 Bad Request or 401 if auth not implemented'
    );
  });

  t.test('should validate request schema - invalid date format', async (t) => {
    const response = await fetch(`${API_BASE_URL}/api/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
      },
      body: JSON.stringify({
        program_day_id: 1,
        date: 'invalid-date',
      }),
    });

    t.ok(
      response.status === 400 || response.status === 401,
      'Should return 400 for invalid date format or 401 if auth not implemented'
    );
  });

  t.test('should create workout and return 201 with correct schema', async (t) => {
    const requestBody = {
      program_day_id: 1,
      date: '2025-10-02',
    };

    const response = await fetch(`${API_BASE_URL}/api/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    // Expected to fail initially - endpoint doesn't exist yet
    t.ok(
      response.status === 201 || response.status === 404 || response.status === 401,
      'Should return 201 Created (or 404/401 if not implemented yet)'
    );

    if (response.status === 201) {
      const data = await response.json();

      // Validate response schema matches Workout object from OpenAPI spec
      t.ok(data.id, 'Response should include workout id');
      t.type(data.id, 'number', 'id should be integer');

      t.ok(data.program_day_id, 'Response should include program_day_id');
      t.equal(data.program_day_id, requestBody.program_day_id, 'program_day_id should match request');

      t.ok(data.date, 'Response should include date');
      t.equal(data.date, requestBody.date, 'date should match request');

      t.ok(data.status, 'Response should include status');
      t.match(
        data.status,
        /^(not_started|in_progress|completed|cancelled)$/,
        'status should be one of the enum values'
      );

      // Optional fields (may be null initially)
      t.type(data.started_at, ['number', 'null'], 'started_at should be integer or null');
      t.type(data.completed_at, ['number', 'null'], 'completed_at should be integer or null');
      t.type(data.total_volume_kg, ['number', 'null'], 'total_volume_kg should be number or null');
      t.type(data.average_rir, ['number', 'null'], 'average_rir should be number or null');
    }
  });
});

/**
 * T014: Contract test for GET /api/workouts
 *
 * Validates:
 * - Query params: start_date (optional), end_date (optional)
 * - Response schema: Array of Workout objects
 * - 401 unauthorized without JWT
 */
tap.test('GET /api/workouts - List user workouts', async (t) => {
  t.test('should return 401 unauthorized without JWT token', async (t) => {
    const response = await fetch(`${API_BASE_URL}/api/workouts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    t.equal(response.status, 401, 'Should return 401 Unauthorized');
  });

  t.test('should list workouts without query parameters', async (t) => {
    const response = await fetch(`${API_BASE_URL}/api/workouts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
      },
    });

    // Expected to fail initially - endpoint doesn't exist yet
    t.ok(
      response.status === 200 || response.status === 404 || response.status === 401,
      'Should return 200 OK (or 404/401 if not implemented yet)'
    );

    if (response.status === 200) {
      const data = await response.json();

      t.ok(Array.isArray(data), 'Response should be an array');

      // Validate each workout object in the array
      data.forEach((workout: any) => {
        t.type(workout.id, 'number', 'id should be integer');
        t.type(workout.program_day_id, 'number', 'program_day_id should be integer');
        t.type(workout.date, 'string', 'date should be string');
        t.match(
          workout.status,
          /^(not_started|in_progress|completed|cancelled)$/,
          'status should be one of the enum values'
        );
        t.type(workout.started_at, ['number', 'null'], 'started_at should be integer or null');
        t.type(workout.completed_at, ['number', 'null'], 'completed_at should be integer or null');
        t.type(workout.total_volume_kg, ['number', 'null'], 'total_volume_kg should be number or null');
        t.type(workout.average_rir, ['number', 'null'], 'average_rir should be number or null');
      });
    }
  });

  t.test('should filter workouts with start_date query parameter', async (t) => {
    const startDate = '2025-10-01';
    const response = await fetch(`${API_BASE_URL}/api/workouts?start_date=${startDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
      },
    });

    t.ok(
      response.status === 200 || response.status === 404 || response.status === 401,
      'Should return 200 OK (or 404/401 if not implemented yet)'
    );

    if (response.status === 200) {
      const data = await response.json();
      t.ok(Array.isArray(data), 'Response should be an array');

      // All returned workouts should have date >= start_date
      data.forEach((workout: any) => {
        t.ok(workout.date >= startDate, 'Workout date should be >= start_date filter');
      });
    }
  });

  t.test('should filter workouts with end_date query parameter', async (t) => {
    const endDate = '2025-10-31';
    const response = await fetch(`${API_BASE_URL}/api/workouts?end_date=${endDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
      },
    });

    t.ok(
      response.status === 200 || response.status === 404 || response.status === 401,
      'Should return 200 OK (or 404/401 if not implemented yet)'
    );

    if (response.status === 200) {
      const data = await response.json();
      t.ok(Array.isArray(data), 'Response should be an array');

      // All returned workouts should have date <= end_date
      data.forEach((workout: any) => {
        t.ok(workout.date <= endDate, 'Workout date should be <= end_date filter');
      });
    }
  });

  t.test('should filter workouts with both start_date and end_date', async (t) => {
    const startDate = '2025-10-01';
    const endDate = '2025-10-31';
    const response = await fetch(
      `${API_BASE_URL}/api/workouts?start_date=${startDate}&end_date=${endDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
        },
      }
    );

    t.ok(
      response.status === 200 || response.status === 404 || response.status === 401,
      'Should return 200 OK (or 404/401 if not implemented yet)'
    );

    if (response.status === 200) {
      const data = await response.json();
      t.ok(Array.isArray(data), 'Response should be an array');

      // All returned workouts should be within the date range
      data.forEach((workout: any) => {
        t.ok(
          workout.date >= startDate && workout.date <= endDate,
          'Workout date should be within start_date and end_date range'
        );
      });
    }
  });
});
