import tap from 'tap';
import buildApp from '../../src/server.js';

/**
 * VO2max Cardio Tracking API Contract Tests
 *
 * These tests validate API compliance with /specs/002-actual-gaps-ultrathink/contracts/vo2max.yaml
 *
 * TDD Requirement: These tests MUST FAIL initially as no implementation exists yet.
 * Constitution: Test-First Development (Principle I) - NON-NEGOTIABLE
 *
 * Tests cover:
 * - T014: POST /api/vo2max-sessions (log VO2max session)
 * - T015: GET /api/vo2max-sessions (list sessions with pagination/filtering)
 * - T016: GET /api/vo2max-sessions/:id (get session details)
 */

tap.test('VO2max Cardio Tracking Endpoints Contract Tests', async (t) => {
  const app = await buildApp();

  // Create test user and get auth token
  let authToken: string;

  await t.before(async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: `test-vo2max-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        age: 30,
        weight_kg: 80,
        experience_level: 'intermediate'
      }
    });

    const registerBody = registerResponse.json();

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: registerBody.username,
        password: 'SecurePass123!'
      }
    });

    authToken = loginResponse.json().token;
  });

  // T014: Contract test POST /api/vo2max-sessions
  await t.test('POST /api/vo2max-sessions', async (t) => {
    await t.test('should log VO2max session successfully (201)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 32,
          protocol_type: 'norwegian_4x4',
          average_heart_rate: 165,
          peak_heart_rate: 178,
          rpe: 8,
          intervals_completed: 4,
          notes: 'Felt strong, completed all intervals'
        }
      });

      t.equal(response.statusCode, 201, 'Returns 201 Created');
      const body = response.json();
      t.type(body.session_id, 'number', 'Returns session_id');
      t.type(body.estimated_vo2max, 'number', 'Returns calculated estimated_vo2max');
      t.ok(body.estimated_vo2max > 0, 'VO2max is positive value');
      t.ok(['completed', 'incomplete'].includes(body.completion_status), 'Returns valid completion_status');
    });

    await t.test('should calculate VO2max using Cooper formula when HR provided (201)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          average_heart_rate: 170,
          peak_heart_rate: 185,
          intervals_completed: 4
        }
      });

      t.equal(response.statusCode, 201, 'Returns 201 Created');
      const body = response.json();
      t.ok(body.estimated_vo2max !== null, 'VO2max calculated when HR provided');
      t.type(body.estimated_vo2max, 'number', 'VO2max is numeric');
    });

    await t.test('should accept session without heart rate data (201)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 28,
          protocol_type: 'norwegian_4x4',
          rpe: 7,
          intervals_completed: 3,
          notes: 'No HR monitor available'
        }
      });

      t.equal(response.statusCode, 201, 'Returns 201 Created');
      const body = response.json();
      t.type(body.session_id, 'number', 'Returns session_id');
      // estimated_vo2max may be null if no HR data
    });

    await t.test('should return 400 for invalid average_heart_rate (below minimum)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          average_heart_rate: 50, // Below minimum 60
          intervals_completed: 4
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid average_heart_rate (above maximum)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          average_heart_rate: 230, // Above maximum 220
          intervals_completed: 4
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid peak_heart_rate (below minimum)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          average_heart_rate: 165,
          peak_heart_rate: 55, // Below minimum 60
          intervals_completed: 4
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid peak_heart_rate (above maximum)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          average_heart_rate: 165,
          peak_heart_rate: 225, // Above maximum 220
          intervals_completed: 4
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid duration_minutes (below minimum)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 5, // Below minimum 10
          protocol_type: 'norwegian_4x4',
          intervals_completed: 1
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid duration_minutes (above maximum)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 150, // Above maximum 120
          protocol_type: 'norwegian_4x4',
          intervals_completed: 4
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid intervals_completed (above maximum)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          intervals_completed: 5 // Above maximum 4 for Norwegian 4x4
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid rpe (below minimum)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          rpe: 0, // Below minimum 1
          intervals_completed: 4
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid rpe (above maximum)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          rpe: 11, // Above maximum 10
          intervals_completed: 4
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for missing required fields', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          // Missing date, duration_minutes, protocol_type
          average_heart_rate: 165
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for notes exceeding max length', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          intervals_completed: 4,
          notes: 'x'.repeat(501) // Exceeds 500 character limit
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        payload: {
          date: '2025-10-03',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          intervals_completed: 4
        }
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });
  });

  // T015: Contract test GET /api/vo2max-sessions
  await t.test('GET /api/vo2max-sessions', async (t) => {
    // Create test sessions for list testing
    await t.before(async () => {
      // Create 3 test sessions with different dates
      const sessions = [
        {
          date: '2025-10-01',
          duration_minutes: 30,
          protocol_type: 'norwegian_4x4',
          average_heart_rate: 160,
          peak_heart_rate: 175,
          intervals_completed: 4
        },
        {
          date: '2025-10-02',
          duration_minutes: 28,
          protocol_type: 'norwegian_4x4',
          average_heart_rate: 165,
          peak_heart_rate: 180,
          intervals_completed: 3
        },
        {
          date: '2025-10-03',
          duration_minutes: 32,
          protocol_type: 'norwegian_4x4',
          average_heart_rate: 170,
          peak_heart_rate: 185,
          intervals_completed: 4
        }
      ];

      for (const session of sessions) {
        await app.inject({
          method: 'POST',
          url: '/api/vo2max-sessions',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: session
        });
      }
    });

    await t.test('should return all sessions without filters (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(Array.isArray(body.sessions), 'Returns sessions array');
      t.type(body.count, 'number', 'Returns count field');
      t.type(body.has_more, 'boolean', 'Returns has_more field');
      t.ok(body.sessions.length > 0, 'Returns at least one session');

      // Validate session schema
      const session = body.sessions[0];
      t.type(session.id, 'number', 'Session has id');
      t.type(session.user_id, 'number', 'Session has user_id');
      t.type(session.date, 'string', 'Session has date');
      t.type(session.duration_minutes, 'number', 'Session has duration_minutes');
      t.type(session.protocol_type, 'string', 'Session has protocol_type');
      t.type(session.intervals_completed, 'number', 'Session has intervals_completed');
      t.ok(['completed', 'incomplete'].includes(session.completion_status), 'Session has valid completion_status');
      t.ok(session.created_at, 'Session has created_at timestamp');
    });

    await t.test('should support pagination with limit (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vo2max-sessions?limit=2',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(body.sessions.length <= 2, 'Respects limit parameter');
      t.type(body.has_more, 'boolean', 'Returns has_more field');
    });

    await t.test('should support pagination with offset (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vo2max-sessions?limit=1&offset=1',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(body.sessions.length <= 1, 'Respects limit parameter');
    });

    await t.test('should filter by start_date (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vo2max-sessions?start_date=2025-10-02',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(body.sessions.every((s: any) => s.date >= '2025-10-02'), 'All sessions are on or after start_date');
    });

    await t.test('should filter by end_date (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vo2max-sessions?end_date=2025-10-02',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(body.sessions.every((s: any) => s.date <= '2025-10-02'), 'All sessions are on or before end_date');
    });

    await t.test('should filter by date range (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vo2max-sessions?start_date=2025-10-01&end_date=2025-10-02',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(body.sessions.every((s: any) =>
        s.date >= '2025-10-01' && s.date <= '2025-10-02'
      ), 'All sessions are within date range');
    });

    await t.test('should respect maximum limit of 200 (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vo2max-sessions?limit=300',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(body.sessions.length <= 200, 'Enforces maximum limit of 200');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vo2max-sessions'
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });
  });

  // T016: Contract test GET /api/vo2max-sessions/:id
  await t.test('GET /api/vo2max-sessions/:id', async (t) => {
    let sessionId: number;

    await t.before(async () => {
      // Create a test session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 32,
          protocol_type: 'norwegian_4x4',
          average_heart_rate: 165,
          peak_heart_rate: 178,
          rpe: 8,
          intervals_completed: 4,
          notes: 'Test session for detail endpoint'
        }
      });

      sessionId = createResponse.json().session_id;
    });

    await t.test('should return session details by ID (200)', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/vo2max-sessions/${sessionId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.equal(body.id, sessionId, 'Returns correct session');
      t.type(body.user_id, 'number', 'Has user_id');
      t.type(body.date, 'string', 'Has date');
      t.type(body.duration_minutes, 'number', 'Has duration_minutes');
      t.equal(body.protocol_type, 'norwegian_4x4', 'Has protocol_type');
      t.type(body.average_heart_rate, 'number', 'Has average_heart_rate');
      t.type(body.peak_heart_rate, 'number', 'Has peak_heart_rate');
      t.type(body.rpe, 'number', 'Has rpe');
      t.equal(body.intervals_completed, 4, 'Has intervals_completed');
      t.type(body.estimated_vo2max, 'number', 'Has estimated_vo2max');
      t.ok(['completed', 'incomplete'].includes(body.completion_status), 'Has valid completion_status');
      t.equal(body.notes, 'Test session for detail endpoint', 'Has notes');
      t.ok(body.created_at, 'Has created_at timestamp');
    });

    await t.test('should return session with nullable fields when not provided (200)', async (t) => {
      // Create session without optional fields
      const minimalResponse = await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          date: '2025-10-03',
          duration_minutes: 25,
          protocol_type: 'norwegian_4x4',
          intervals_completed: 2
        }
      });

      const minimalSessionId = minimalResponse.json().session_id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/vo2max-sessions/${minimalSessionId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.equal(body.id, minimalSessionId, 'Returns correct session');
      // Nullable fields may be null
      t.ok(body.average_heart_rate === null || typeof body.average_heart_rate === 'number', 'average_heart_rate is nullable');
      t.ok(body.peak_heart_rate === null || typeof body.peak_heart_rate === 'number', 'peak_heart_rate is nullable');
      t.ok(body.rpe === null || typeof body.rpe === 'number', 'rpe is nullable');
      t.ok(body.estimated_vo2max === null || typeof body.estimated_vo2max === 'number', 'estimated_vo2max is nullable');
      t.ok(body.notes === null || typeof body.notes === 'string', 'notes is nullable');
    });

    await t.test('should return 404 for non-existent session', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vo2max-sessions/99999',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 404 for session belonging to another user', async (t) => {
      // Create another user
      const otherUserResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          username: `test-vo2max-other-${Date.now()}@example.com`,
          password: 'SecurePass123!',
          age: 25,
          weight_kg: 75,
          experience_level: 'beginner'
        }
      });

      const otherLoginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: otherUserResponse.json().username,
          password: 'SecurePass123!'
        }
      });

      const otherToken = otherLoginResponse.json().token;

      // Try to access original user's session
      const response = await app.inject({
        method: 'GET',
        url: `/api/vo2max-sessions/${sessionId}`,
        headers: {
          authorization: `Bearer ${otherToken}`
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found for other users session');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/vo2max-sessions/${sessionId}`
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });
  });

  await t.teardown(async () => {
    await app.close();
  });
});
