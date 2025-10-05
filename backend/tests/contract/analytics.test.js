import tap from 'tap';
import buildApp from '../../src/server.js';
tap.test('GET /api/analytics/1rm-progression - T017', async (t) => {
    const app = await buildApp();
    await t.test('returns 401 unauthorized without JWT', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/analytics/1rm-progression?exercise_id=1&start_date=2025-01-01&end_date=2025-01-31',
        });
        t.equal(response.statusCode, 401, 'should return 401 without auth token');
    });
    await t.test('validates query parameters and response schema', async (t) => {
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
    await t.test('returns 401 unauthorized without JWT', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/analytics/volume-trends?muscle_group=chest&start_date=2025-01-01&end_date=2025-01-31',
        });
        t.equal(response.statusCode, 401, 'should return 401 without auth token');
    });
    await t.test('validates query parameters and response schema', async (t) => {
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
        await t.test('requires muscle_group query param', async (t) => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/analytics/volume-trends?start_date=2025-01-01&end_date=2025-01-31',
                headers: {
                    authorization: `Bearer ${token}`,
                },
            });
            t.equal(response.statusCode, 400, 'should return 400 without muscle_group');
        });
        await t.test('requires start_date query param', async (t) => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/analytics/volume-trends?muscle_group=chest&end_date=2025-01-31',
                headers: {
                    authorization: `Bearer ${token}`,
                },
            });
            t.equal(response.statusCode, 400, 'should return 400 without start_date');
        });
        await t.test('requires end_date query param', async (t) => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/analytics/volume-trends?muscle_group=chest&start_date=2025-01-01',
                headers: {
                    authorization: `Bearer ${token}`,
                },
            });
            t.equal(response.statusCode, 400, 'should return 400 without end_date');
        });
        await t.test('returns valid response schema with all params', async (t) => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/analytics/volume-trends?muscle_group=chest&start_date=2025-01-01&end_date=2025-01-31',
                headers: {
                    authorization: `Bearer ${token}`,
                },
            });
            t.equal(response.statusCode, 200, 'should return 200 with valid params');
            const data = JSON.parse(response.body);
            t.ok(Array.isArray(data), 'response should be an array');
            if (data.length > 0) {
                const firstItem = data[0];
                t.ok(firstItem.hasOwnProperty('week'), 'item should have week property');
                t.ok(firstItem.hasOwnProperty('total_sets'), 'item should have total_sets property');
                t.ok(firstItem.hasOwnProperty('mev'), 'item should have mev property');
                t.ok(firstItem.hasOwnProperty('mav'), 'item should have mav property');
                t.ok(firstItem.hasOwnProperty('mrv'), 'item should have mrv property');
                t.type(firstItem.week, 'string', 'week should be string (ISO week format)');
                t.type(firstItem.total_sets, 'number', 'total_sets should be number');
                t.type(firstItem.mev, 'number', 'mev should be number');
                t.type(firstItem.mav, 'number', 'mav should be number');
                t.type(firstItem.mrv, 'number', 'mrv should be number');
            }
        });
    });
});
tap.test('GET /api/analytics/consistency - T019', async (t) => {
    const app = await buildApp();
    await t.test('returns 401 unauthorized without JWT', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/analytics/consistency',
        });
        t.equal(response.statusCode, 401, 'should return 401 without auth token');
    });
    await t.test('validates response schema', async (t) => {
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
//# sourceMappingURL=analytics.test.js.map