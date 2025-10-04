import tap from 'tap';
import buildApp from '../../src/server.js';
tap.test('Volume Analytics Endpoints Contract Tests', async (t) => {
    const app = await buildApp();
    let authToken;
    let userId;
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
            t.type(body.week_start, 'string', 'Has week_start field');
            t.type(body.week_end, 'string', 'Has week_end field');
            t.match(body.week_start, /^\d{4}-\d{2}-\d{2}$/, 'week_start is valid date format');
            t.match(body.week_end, /^\d{4}-\d{2}-\d{2}$/, 'week_end is valid date format');
            t.ok(Array.isArray(body.muscle_groups), 'Has muscle_groups array');
            if (body.muscle_groups.length > 0) {
                const muscleGroup = body.muscle_groups[0];
                t.type(muscleGroup.muscle_group, 'string', 'Has muscle_group field');
                t.ok(['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'abs'].includes(muscleGroup.muscle_group), 'muscle_group is valid enum value');
                t.type(muscleGroup.completed_sets, 'number', 'Has completed_sets field');
                t.type(muscleGroup.planned_sets, 'number', 'Has planned_sets field');
                t.type(muscleGroup.remaining_sets, 'number', 'Has remaining_sets field');
                t.type(muscleGroup.mev, 'number', 'Has mev field');
                t.type(muscleGroup.mav, 'number', 'Has mav field');
                t.type(muscleGroup.mrv, 'number', 'Has mrv field');
                t.type(muscleGroup.completion_percentage, 'number', 'Has completion_percentage field');
                t.type(muscleGroup.zone, 'string', 'Has zone field');
                t.ok(['below_mev', 'adequate', 'optimal', 'above_mrv', 'on_track'].includes(muscleGroup.zone), 'zone is valid enum value');
                t.ok(muscleGroup.warning === null || typeof muscleGroup.warning === 'string', 'warning is string or null');
                const expectedPercentage = muscleGroup.planned_sets > 0
                    ? (muscleGroup.completed_sets / muscleGroup.planned_sets) * 100
                    : 0;
                t.ok(Math.abs(muscleGroup.completion_percentage - expectedPercentage) < 0.1, 'completion_percentage is correctly calculated');
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
                body.muscle_groups.forEach((mg) => {
                    if (mg.completed_sets < mg.mev) {
                        t.equal(mg.zone, 'below_mev', 'Zone is below_mev when completed < MEV');
                    }
                    else if (mg.completed_sets >= mg.mev && mg.completed_sets < mg.mav) {
                        t.ok(['adequate', 'on_track'].includes(mg.zone), 'Zone is adequate or on_track when MEV <= completed < MAV');
                    }
                    else if (mg.completed_sets >= mg.mav && mg.completed_sets <= mg.mrv) {
                        t.ok(['optimal', 'on_track'].includes(mg.zone), 'Zone is optimal or on_track when MAV <= completed <= MRV');
                    }
                    else if (mg.completed_sets > mg.mrv) {
                        t.equal(mg.zone, 'above_mrv', 'Zone is above_mrv when completed > MRV');
                    }
                });
            }
        });
    });
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
            t.ok(Array.isArray(body.weeks), 'Has weeks array');
            t.ok(body.weeks.length <= 8, 'Returns at most 8 weeks by default');
            if (body.weeks.length > 0) {
                const week = body.weeks[0];
                t.type(week.week_start, 'string', 'Has week_start field');
                t.match(week.week_start, /^\d{4}-\d{2}-\d{2}$/, 'week_start is valid date format');
                t.ok(Array.isArray(week.muscle_groups), 'Has muscle_groups array');
                if (week.muscle_groups.length > 0) {
                    const muscleGroup = week.muscle_groups[0];
                    t.type(muscleGroup.muscle_group, 'string', 'Has muscle_group field');
                    t.type(muscleGroup.completed_sets, 'number', 'Has completed_sets field');
                    t.type(muscleGroup.mev, 'number', 'Has mev field');
                    t.type(muscleGroup.mav, 'number', 'Has mav field');
                    t.type(muscleGroup.mrv, 'number', 'Has mrv field');
                    t.ok(['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'abs'].includes(muscleGroup.muscle_group), 'muscle_group is valid enum value');
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
            if (body.weeks.length > 0 && body.weeks[0].muscle_groups.length > 0) {
                body.weeks.forEach((week) => {
                    week.muscle_groups.forEach((mg) => {
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
    await t.test('GET /api/analytics/program-volume-analysis', async (t) => {
        await t.test('should return program volume analysis for active program (200)', async (t) => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/analytics/program-volume-analysis',
                headers: {
                    authorization: `Bearer ${authToken}`
                }
            });
            if (response.statusCode === 200) {
                const body = response.json();
                t.type(body.program_id, 'number', 'Has program_id field');
                t.type(body.mesocycle_phase, 'string', 'Has mesocycle_phase field');
                t.ok(['mev', 'mav', 'mrv', 'deload'].includes(body.mesocycle_phase), 'mesocycle_phase is valid enum value');
                t.ok(Array.isArray(body.muscle_groups), 'Has muscle_groups array');
                if (body.muscle_groups.length > 0) {
                    const muscleGroup = body.muscle_groups[0];
                    t.type(muscleGroup.muscle_group, 'string', 'Has muscle_group field');
                    t.type(muscleGroup.planned_weekly_sets, 'number', 'Has planned_weekly_sets field');
                    t.type(muscleGroup.mev, 'number', 'Has mev field');
                    t.type(muscleGroup.mav, 'number', 'Has mav field');
                    t.type(muscleGroup.mrv, 'number', 'Has mrv field');
                    t.type(muscleGroup.zone, 'string', 'Has zone field');
                    t.ok(['below_mev', 'adequate', 'optimal', 'above_mrv'].includes(muscleGroup.zone), 'zone is valid enum value');
                    t.ok(muscleGroup.warning === null || typeof muscleGroup.warning === 'string', 'warning is string or null');
                    if (muscleGroup.planned_weekly_sets < muscleGroup.mev) {
                        t.equal(muscleGroup.zone, 'below_mev', 'Zone is below_mev when planned < MEV');
                        t.ok(muscleGroup.warning !== null, 'Warning exists when below MEV');
                        t.match(muscleGroup.warning.toLowerCase(), /below|minimum|mev/, 'Warning mentions below MEV');
                    }
                    else if (muscleGroup.planned_weekly_sets >= muscleGroup.mev && muscleGroup.planned_weekly_sets < muscleGroup.mav) {
                        t.equal(muscleGroup.zone, 'adequate', 'Zone is adequate when MEV <= planned < MAV');
                    }
                    else if (muscleGroup.planned_weekly_sets >= muscleGroup.mav && muscleGroup.planned_weekly_sets <= muscleGroup.mrv) {
                        t.equal(muscleGroup.zone, 'optimal', 'Zone is optimal when MAV <= planned <= MRV');
                    }
                    else if (muscleGroup.planned_weekly_sets > muscleGroup.mrv) {
                        t.equal(muscleGroup.zone, 'above_mrv', 'Zone is above_mrv when planned > MRV');
                        t.ok(muscleGroup.warning !== null, 'Warning exists when above MRV');
                        t.match(muscleGroup.warning.toLowerCase(), /above|maximum|mrv|overtraining/, 'Warning mentions overtraining risk');
                    }
                    t.ok(['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'abs'].includes(muscleGroup.muscle_group), 'muscle_group is valid enum value');
                }
            }
            else if (response.statusCode === 404) {
                const body = response.json();
                t.ok(body.error, 'Returns error message for no active program');
                t.match(body.error.toLowerCase(), /program|not found|active/, 'Error mentions no active program');
            }
            else {
                t.fail(`Unexpected status code: ${response.statusCode}`);
            }
        });
        await t.test('should return 404 when no active program exists', async (t) => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/analytics/program-volume-analysis',
                headers: {
                    authorization: `Bearer ${authToken}`
                }
            });
            t.ok(response.statusCode === 200 || response.statusCode === 404, 'Returns 200 or 404 depending on program existence');
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
                body.muscle_groups.forEach((mg) => {
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
//# sourceMappingURL=analytics-volume.test.js.map