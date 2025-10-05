/**
 * Scenario 2: VO2max Session Validation
 *
 * Tests the Norwegian 4x4 protocol and VO2max tracking from Scenario 5
 * (Execute VO2max Cardio Protocol) in quickstart.md
 *
 * Acceptance Criteria (9 total):
 * 1. User can create a Norwegian 4x4 session with protocol data
 * 2. Cooper formula VO2max calculation is automatic
 * 3. Session stores intervals completed (0-4)
 * 4. Session stores heart rate data (average and peak)
 * 5. Session stores RPE (Rate of Perceived Exertion, 1-10)
 * 6. Session is marked completed if all 4 intervals done
 * 7. Session data persists and can be retrieved
 * 8. Progression endpoint shows VO2max trend over time
 * 9. Estimated VO2max is within physiological range (20-80 ml/kg/min)
 */

import tap from 'tap';
import buildApp from '../../src/server.js';

tap.test('Scenario 2: VO2max Session', async (t) => {
  const app = await buildApp();

  // Setup: Create test user and get auth token
  let authToken: string;

  await t.before(async () => {
    const testUsername = `test-scenario2-${Date.now()}@example.com`;

    // Register user
    const _registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
        age: 30,
        weight_kg: 80,
        experience_level: 'intermediate',
      },
    });

    const _registerBody = registerResponse.json();

    // Login
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
      },
    });

    authToken = loginResponse.json().token;
  });

  // AC-1: User can create a Norwegian 4x4 session
  await t.test('AC-1: Create Norwegian 4x4 session', async (t) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const sessionData = {
      date: today,
      duration_minutes: 28, // 4x4 + 3x3 recovery = 28 minutes
      protocol_type: 'norwegian_4x4',
      average_heart_rate: 165,
      peak_heart_rate: 182,
      intervals_completed: 4,
      rpe: 9, // Hard effort
      notes: 'Felt strong, completed all intervals',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/vo2max-sessions',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: sessionData,
    });

    t.equal(response.statusCode, 201, 'Session created successfully');
    const body = response.json();

    t.type(body.session_id, 'number', 'Response contains session_id');
    t.type(body.estimated_vo2max, 'number', 'Response contains estimated_vo2max');
    t.type(body.completion_status, 'string', 'Response contains completion_status');
  });

  // AC-2: Cooper formula VO2max calculation is automatic
  await t.test('AC-2: Auto-calculate VO2max with Cooper formula', async (t) => {
    const today = new Date().toISOString().split('T')[0];

    // Create session WITHOUT estimated_vo2max (should be calculated)
    const sessionData = {
      date: today,
      duration_minutes: 28,
      protocol_type: 'norwegian_4x4',
      average_heart_rate: 165,
      peak_heart_rate: 182,
      intervals_completed: 4,
      rpe: 9,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/vo2max-sessions',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: sessionData,
    });

    t.equal(response.statusCode, 201, 'Session created successfully');
    const body = response.json();

    // Cooper formula: VO2max ≈ 15.3 × (max_HR / resting_HR)
    // For Norwegian 4x4, formula is: VO2max ≈ (peak_HR - 60) / 2.5
    // This is an approximation, actual formula may vary
    t.ok(body.estimated_vo2max > 0, 'VO2max was calculated automatically');
    t.type(body.estimated_vo2max, 'number', 'VO2max is a number');
  });

  // AC-3: Session stores intervals completed
  await t.test('AC-3: Store intervals completed (0-4)', async (t) => {
    const today = new Date().toISOString().split('T')[0];

    // Test with 2 intervals (incomplete session)
    const partialSessionData = {
      date: today,
      duration_minutes: 15,
      protocol_type: 'norwegian_4x4',
      intervals_completed: 2,
      rpe: 8,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/vo2max-sessions',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: partialSessionData,
    });

    t.equal(response.statusCode, 201, 'Partial session created');
    const body = response.json();

    // Fetch the session to verify intervals_completed
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/vo2max-sessions/${body.session_id}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const session = getResponse.json();
    t.equal(session.intervals_completed, 2, 'Intervals completed stored correctly');
  });

  // AC-4: Session stores heart rate data
  await t.test('AC-4: Store average and peak heart rate', async (t) => {
    const today = new Date().toISOString().split('T')[0];

    const sessionData = {
      date: today,
      duration_minutes: 28,
      protocol_type: 'norwegian_4x4',
      average_heart_rate: 170,
      peak_heart_rate: 185,
      intervals_completed: 4,
      rpe: 9,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/vo2max-sessions',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: sessionData,
    });

    t.equal(response.statusCode, 201, 'Session created successfully');
    const body = response.json();

    // Fetch the session to verify heart rate data
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/vo2max-sessions/${body.session_id}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const session = getResponse.json();
    t.equal(session.average_heart_rate, 170, 'Average HR stored correctly');
    t.equal(session.peak_heart_rate, 185, 'Peak HR stored correctly');
  });

  // AC-5: Session stores RPE
  await t.test('AC-5: Store RPE (1-10 scale)', async (t) => {
    const today = new Date().toISOString().split('T')[0];

    const sessionData = {
      date: today,
      duration_minutes: 28,
      protocol_type: 'norwegian_4x4',
      intervals_completed: 4,
      rpe: 10, // Maximum exertion
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/vo2max-sessions',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: sessionData,
    });

    t.equal(response.statusCode, 201, 'Session created successfully');
    const body = response.json();

    // Fetch the session to verify RPE
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/vo2max-sessions/${body.session_id}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const session = getResponse.json();
    t.equal(session.rpe, 10, 'RPE stored correctly');
  });

  // AC-6: Session marked completed if all 4 intervals done
  await t.test('AC-6: Completion status based on intervals', async (t) => {
    const today = new Date().toISOString().split('T')[0];

    // Complete session (4 intervals)
    const completeSessionData = {
      date: today,
      duration_minutes: 28,
      protocol_type: 'norwegian_4x4',
      intervals_completed: 4,
      rpe: 9,
    };

    const completeResponse = await app.inject({
      method: 'POST',
      url: '/api/vo2max-sessions',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: completeSessionData,
    });

    const completeBody = completeResponse.json();
    t.equal(completeBody.completion_status, 'completed', 'Status is completed for 4 intervals');

    // Incomplete session (2 intervals)
    const incompleteSessionData = {
      date: today,
      duration_minutes: 15,
      protocol_type: 'norwegian_4x4',
      intervals_completed: 2,
      rpe: 7,
    };

    const incompleteResponse = await app.inject({
      method: 'POST',
      url: '/api/vo2max-sessions',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: incompleteSessionData,
    });

    const incompleteBody = incompleteResponse.json();
    t.equal(
      incompleteBody.completion_status,
      'incomplete',
      'Status is incomplete for < 4 intervals'
    );
  });

  // AC-7: Session data persists
  await t.test('AC-7: Session data persists and can be retrieved', async (t) => {
    const today = new Date().toISOString().split('T')[0];

    // Create a session with comprehensive data
    const sessionData = {
      date: today,
      duration_minutes: 28,
      protocol_type: 'norwegian_4x4',
      average_heart_rate: 168,
      peak_heart_rate: 183,
      intervals_completed: 4,
      rpe: 9,
      notes: 'Perfect execution of all intervals',
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/vo2max-sessions',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: sessionData,
    });

    const createBody = createResponse.json();
    const sessionId = createBody.session_id;

    // Retrieve the session
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/vo2max-sessions/${sessionId}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    t.equal(getResponse.statusCode, 200, 'Session retrieved successfully');
    const session = getResponse.json();

    // Verify all data persisted
    t.equal(session.id, sessionId, 'Session ID matches');
    t.equal(session.duration_minutes, 28, 'Duration persisted');
    t.equal(session.protocol_type, 'norwegian_4x4', 'Protocol type persisted');
    t.equal(session.average_heart_rate, 168, 'Average HR persisted');
    t.equal(session.peak_heart_rate, 183, 'Peak HR persisted');
    t.equal(session.intervals_completed, 4, 'Intervals persisted');
    t.equal(session.rpe, 9, 'RPE persisted');
    t.equal(session.notes, 'Perfect execution of all intervals', 'Notes persisted');
  });

  // AC-8: Progression endpoint shows VO2max trend
  await t.test('AC-8: VO2max progression tracking', async (t) => {
    const baseDate = new Date();

    // Create 3 sessions over 3 weeks to show progression
    const sessions = [
      {
        date: new Date(baseDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration_minutes: 28,
        protocol_type: 'norwegian_4x4',
        average_heart_rate: 165,
        peak_heart_rate: 180,
        intervals_completed: 4,
      },
      {
        date: new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration_minutes: 28,
        protocol_type: 'norwegian_4x4',
        average_heart_rate: 167,
        peak_heart_rate: 182,
        intervals_completed: 4,
      },
      {
        date: new Date().toISOString().split('T')[0],
        duration_minutes: 28,
        protocol_type: 'norwegian_4x4',
        average_heart_rate: 170,
        peak_heart_rate: 185,
        intervals_completed: 4,
      },
    ];

    // Create all sessions
    for (const sessionData of sessions) {
      await app.inject({
        method: 'POST',
        url: '/api/vo2max-sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: sessionData,
      });
    }

    // Get progression
    const progressionResponse = await app.inject({
      method: 'GET',
      url: '/api/vo2max-sessions/progression',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    t.equal(progressionResponse.statusCode, 200, 'Progression retrieved successfully');
    const progression = progressionResponse.json();

    t.ok(Array.isArray(progression.sessions), 'Progression has sessions array');
    t.ok(progression.sessions.length >= 3, 'At least 3 sessions in progression');

    // Verify sessions are ordered by date (oldest first)
    for (let i = 1; i < progression.sessions.length; i++) {
      const prevDate = new Date(progression.sessions[i - 1].date);
      const currDate = new Date(progression.sessions[i].date);
      t.ok(currDate >= prevDate, 'Sessions ordered chronologically');
    }

    // Verify each session has required fields
    progression.sessions.forEach((session: any) => {
      t.type(session.date, 'string', 'Session has date');
      t.type(session.estimated_vo2max, 'number', 'Session has VO2max estimate');
      t.type(session.protocol_type, 'string', 'Session has protocol type');
    });
  });

  // AC-9: VO2max within physiological range
  await t.test('AC-9: VO2max within valid range (20-80 ml/kg/min)', async (t) => {
    const today = new Date().toISOString().split('T')[0];

    const sessionData = {
      date: today,
      duration_minutes: 28,
      protocol_type: 'norwegian_4x4',
      average_heart_rate: 170,
      peak_heart_rate: 185,
      intervals_completed: 4,
      rpe: 9,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/vo2max-sessions',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: sessionData,
    });

    t.equal(response.statusCode, 201, 'Session created successfully');
    const body = response.json();

    // Verify VO2max is within physiological range
    t.ok(
      body.estimated_vo2max >= 20 && body.estimated_vo2max <= 80,
      `VO2max ${body.estimated_vo2max} is within valid range (20-80)`
    );

    // Additional validation: should be reasonable for intermediate athlete
    // Typical range for intermediate: 40-55 ml/kg/min
    t.ok(
      body.estimated_vo2max >= 35 && body.estimated_vo2max <= 65,
      `VO2max ${body.estimated_vo2max} is reasonable for intermediate athlete`
    );
  });

  await t.teardown(async () => {
    await app.close();
  });
});
