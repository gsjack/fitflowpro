import tap from 'tap';
import buildApp from '../../src/server.js';
tap.test('Scenario 2: VO2max Session', async (t) => {
    const app = await buildApp();
    let authToken;
    let userId;
    await t.before(async () => {
        const testUsername = `test-scenario2-${Date.now()}@example.com`;
        const registerResponse = await app.inject({
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
        const registerBody = registerResponse.json();
        userId = registerBody.user_id;
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
    await t.test('AC-1: Create Norwegian 4x4 session', async (t) => {
        const today = new Date().toISOString().split('T')[0];
        const sessionData = {
            date: today,
            duration_minutes: 28,
            protocol_type: 'norwegian_4x4',
            average_heart_rate: 165,
            peak_heart_rate: 182,
            intervals_completed: 4,
            rpe: 9,
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
    await t.test('AC-2: Auto-calculate VO2max with Cooper formula', async (t) => {
        const today = new Date().toISOString().split('T')[0];
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
        t.ok(body.estimated_vo2max > 0, 'VO2max was calculated automatically');
        t.type(body.estimated_vo2max, 'number', 'VO2max is a number');
    });
    await t.test('AC-3: Store intervals completed (0-4)', async (t) => {
        const today = new Date().toISOString().split('T')[0];
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
    await t.test('AC-5: Store RPE (1-10 scale)', async (t) => {
        const today = new Date().toISOString().split('T')[0];
        const sessionData = {
            date: today,
            duration_minutes: 28,
            protocol_type: 'norwegian_4x4',
            intervals_completed: 4,
            rpe: 10,
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
    await t.test('AC-6: Completion status based on intervals', async (t) => {
        const today = new Date().toISOString().split('T')[0];
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
        t.equal(incompleteBody.completion_status, 'incomplete', 'Status is incomplete for < 4 intervals');
    });
    await t.test('AC-7: Session data persists and can be retrieved', async (t) => {
        const today = new Date().toISOString().split('T')[0];
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
        const getResponse = await app.inject({
            method: 'GET',
            url: `/api/vo2max-sessions/${sessionId}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(getResponse.statusCode, 200, 'Session retrieved successfully');
        const session = getResponse.json();
        t.equal(session.id, sessionId, 'Session ID matches');
        t.equal(session.duration_minutes, 28, 'Duration persisted');
        t.equal(session.protocol_type, 'norwegian_4x4', 'Protocol type persisted');
        t.equal(session.average_heart_rate, 168, 'Average HR persisted');
        t.equal(session.peak_heart_rate, 183, 'Peak HR persisted');
        t.equal(session.intervals_completed, 4, 'Intervals persisted');
        t.equal(session.rpe, 9, 'RPE persisted');
        t.equal(session.notes, 'Perfect execution of all intervals', 'Notes persisted');
    });
    await t.test('AC-8: VO2max progression tracking', async (t) => {
        const baseDate = new Date();
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
        for (let i = 1; i < progression.sessions.length; i++) {
            const prevDate = new Date(progression.sessions[i - 1].date);
            const currDate = new Date(progression.sessions[i].date);
            t.ok(currDate >= prevDate, 'Sessions ordered chronologically');
        }
        progression.sessions.forEach((session) => {
            t.type(session.date, 'string', 'Session has date');
            t.type(session.estimated_vo2max, 'number', 'Session has VO2max estimate');
            t.type(session.protocol_type, 'string', 'Session has protocol type');
        });
    });
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
        t.ok(body.estimated_vo2max >= 20 && body.estimated_vo2max <= 80, `VO2max ${body.estimated_vo2max} is within valid range (20-80)`);
        t.ok(body.estimated_vo2max >= 35 && body.estimated_vo2max <= 65, `VO2max ${body.estimated_vo2max} is reasonable for intermediate athlete`);
    });
    await t.teardown(async () => {
        await app.close();
    });
});
//# sourceMappingURL=scenario2-vo2max-session.test.js.map