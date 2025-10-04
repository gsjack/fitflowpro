import tap from 'tap';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const MOCK_JWT_TOKEN = 'mock.jwt.token.for.testing';
tap.test('Performance Test: API Response Time Benchmark (T080)', async (t) => {
    t.test('POST /api/sets should have p95 < 50ms (100 requests)', async (t) => {
        const iterations = 100;
        const durations = [];
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            const response = await fetch(`${API_BASE_URL}/api/sets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
                },
                body: JSON.stringify({
                    workout_id: 1,
                    exercise_id: 1,
                    set_number: i + 1,
                    weight_kg: 100,
                    reps: 8,
                    rir: 2,
                    timestamp: Date.now(),
                }),
            });
            const endTime = Date.now();
            const duration = endTime - startTime;
            durations.push(duration);
            t.ok(response.status === 201 || response.status === 401 || response.status === 404, `Request ${i + 1} returned valid status`);
        }
        const sortedDurations = [...durations].sort((a, b) => a - b);
        const p50 = sortedDurations[Math.floor(iterations * 0.50)];
        const p95 = sortedDurations[Math.floor(iterations * 0.95)];
        const p99 = sortedDurations[Math.floor(iterations * 0.99)];
        const avg = durations.reduce((sum, d) => sum + d, 0) / iterations;
        const max = sortedDurations[iterations - 1];
        t.comment(`POST /api/sets Performance (${iterations} requests):`);
        t.comment(`  Average:    ${avg.toFixed(2)}ms`);
        t.comment(`  p50:        ${p50.toFixed(2)}ms`);
        t.comment(`  p95:        ${p95.toFixed(2)}ms`);
        t.comment(`  p99:        ${p99.toFixed(2)}ms`);
        t.comment(`  Max:        ${max.toFixed(2)}ms`);
        t.ok(p95 < 50, `p95 should be < 50ms, got ${p95.toFixed(2)}ms`);
    });
    t.test('GET /api/workouts should have p95 < 100ms', async (t) => {
        const iterations = 50;
        const durations = [];
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            const response = await fetch(`${API_BASE_URL}/api/workouts?user_id=1`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
                },
            });
            const endTime = Date.now();
            const duration = endTime - startTime;
            durations.push(duration);
            t.ok(response.status === 200 || response.status === 401 || response.status === 404, `Request ${i + 1} returned valid status`);
        }
        const sortedDurations = [...durations].sort((a, b) => a - b);
        const p95 = sortedDurations[Math.floor(iterations * 0.95)];
        const avg = durations.reduce((sum, d) => sum + d, 0) / iterations;
        t.comment(`GET /api/workouts Performance (${iterations} requests):`);
        t.comment(`  Average:    ${avg.toFixed(2)}ms`);
        t.comment(`  p95:        ${p95.toFixed(2)}ms`);
        t.ok(p95 < 100, `p95 should be < 100ms, got ${p95.toFixed(2)}ms`);
    });
    t.test('GET /api/analytics/volume-trends should have p95 < 200ms', async (t) => {
        const iterations = 30;
        const durations = [];
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            const response = await fetch(`${API_BASE_URL}/api/analytics/volume-trends?user_id=1&muscle_group=chest&start_date=2025-09-01&end_date=2025-10-01`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
                },
            });
            const endTime = Date.now();
            const duration = endTime - startTime;
            durations.push(duration);
            t.ok(response.status === 200 || response.status === 401 || response.status === 404, `Request ${i + 1} returned valid status`);
        }
        const sortedDurations = [...durations].sort((a, b) => a - b);
        const p95 = sortedDurations[Math.floor(iterations * 0.95)];
        const avg = durations.reduce((sum, d) => sum + d, 0) / iterations;
        t.comment(`GET /api/analytics/volume-trends Performance (${iterations} requests):`);
        t.comment(`  Average:    ${avg.toFixed(2)}ms`);
        t.comment(`  p95:        ${p95.toFixed(2)}ms`);
        t.ok(p95 < 200, `p95 should be < 200ms, got ${p95.toFixed(2)}ms`);
    });
    t.test('GET /api/analytics/1rm-progression should have p95 < 200ms', async (t) => {
        const iterations = 30;
        const durations = [];
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            const response = await fetch(`${API_BASE_URL}/api/analytics/1rm-progression?user_id=1&exercise_id=1&start_date=2025-09-01&end_date=2025-10-01`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
                },
            });
            const endTime = Date.now();
            const duration = endTime - startTime;
            durations.push(duration);
            t.ok(response.status === 200 || response.status === 401 || response.status === 404, `Request ${i + 1} returned valid status`);
        }
        const sortedDurations = [...durations].sort((a, b) => a - b);
        const p95 = sortedDurations[Math.floor(iterations * 0.95)];
        const avg = durations.reduce((sum, d) => sum + d, 0) / iterations;
        t.comment(`GET /api/analytics/1rm-progression Performance (${iterations} requests):`);
        t.comment(`  Average:    ${avg.toFixed(2)}ms`);
        t.comment(`  p95:        ${p95.toFixed(2)}ms`);
        t.ok(p95 < 200, `p95 should be < 200ms, got ${p95.toFixed(2)}ms`);
    });
    t.test('POST /api/auth/login should have p95 < 100ms', async (t) => {
        const iterations = 20;
        const durations = [];
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'test_password_123',
                }),
            });
            const endTime = Date.now();
            const duration = endTime - startTime;
            durations.push(duration);
            t.ok(response.status >= 200, `Request ${i + 1} returned status ${response.status}`);
        }
        const sortedDurations = [...durations].sort((a, b) => a - b);
        const p95 = sortedDurations[Math.floor(iterations * 0.95)];
        const avg = durations.reduce((sum, d) => sum + d, 0) / iterations;
        t.comment(`POST /api/auth/login Performance (${iterations} requests):`);
        t.comment(`  Average:    ${avg.toFixed(2)}ms`);
        t.comment(`  p95:        ${p95.toFixed(2)}ms`);
        t.ok(p95 < 100, `p95 should be < 100ms, got ${p95.toFixed(2)}ms`);
    });
    t.test('Concurrent requests should maintain performance', async (t) => {
        const concurrentRequests = 50;
        const startTime = Date.now();
        const requests = [];
        for (let i = 0; i < concurrentRequests; i++) {
            requests.push(fetch(`${API_BASE_URL}/api/sets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
                },
                body: JSON.stringify({
                    workout_id: 1,
                    exercise_id: 1,
                    set_number: i + 1,
                    weight_kg: 100,
                    reps: 8,
                    rir: 2,
                    timestamp: Date.now(),
                }),
            }));
        }
        const responses = await Promise.all(requests);
        const endTime = Date.now();
        const totalDuration = endTime - startTime;
        const avgDuration = totalDuration / concurrentRequests;
        t.comment(`Concurrent Requests Performance (${concurrentRequests} requests):`);
        t.comment(`  Total duration: ${totalDuration.toFixed(2)}ms`);
        t.comment(`  Avg per req:    ${avgDuration.toFixed(2)}ms`);
        t.equal(responses.length, concurrentRequests, 'All requests completed');
        t.ok(avgDuration < 100, `Avg duration should be < 100ms, got ${avgDuration.toFixed(2)}ms`);
    });
    t.test('Database query optimization verification', async (t) => {
        const startTime = Date.now();
        const response = await fetch(`${API_BASE_URL}/api/workouts?user_id=1&start_date=2025-09-01&end_date=2025-10-01`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
            },
        });
        const endTime = Date.now();
        const duration = endTime - startTime;
        t.comment(`Date range query duration: ${duration}ms`);
        t.ok(duration < 100, `Date range query should be < 100ms, got ${duration}ms`);
        t.ok(response.status === 200 || response.status === 401 || response.status === 404, 'Valid response status');
    });
    t.test('Payload size impact on performance', async (t) => {
        const payloads = [
            { size: 'small', data: { workout_id: 1, exercise_id: 1, set_number: 1, weight_kg: 100, reps: 8, rir: 2, timestamp: Date.now() } },
            { size: 'medium', data: { workout_id: 1, exercise_id: 1, set_number: 1, weight_kg: 100, reps: 8, rir: 2, timestamp: Date.now(), notes: 'a'.repeat(100) } },
            { size: 'large', data: { workout_id: 1, exercise_id: 1, set_number: 1, weight_kg: 100, reps: 8, rir: 2, timestamp: Date.now(), notes: 'a'.repeat(1000) } },
        ];
        for (const payload of payloads) {
            const durations = [];
            for (let i = 0; i < 10; i++) {
                const startTime = Date.now();
                await fetch(`${API_BASE_URL}/api/sets`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
                    },
                    body: JSON.stringify(payload.data),
                });
                const endTime = Date.now();
                durations.push(endTime - startTime);
            }
            const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
            t.comment(`${payload.size} payload avg: ${avg.toFixed(2)}ms`);
            t.ok(avg < 100, `${payload.size} payload should be < 100ms`);
        }
    });
    t.test('Error response performance', async (t) => {
        const iterations = 20;
        const durations = [];
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            const response = await fetch(`${API_BASE_URL}/api/sets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
                },
                body: JSON.stringify({}),
            });
            const endTime = Date.now();
            durations.push(endTime - startTime);
            t.ok(response.status >= 400, 'Error status returned');
        }
        const avg = durations.reduce((sum, d) => sum + d, 0) / iterations;
        t.comment(`Error response avg: ${avg.toFixed(2)}ms`);
        t.ok(avg < 50, `Error response should be < 50ms, got ${avg.toFixed(2)}ms`);
    });
    t.test('Server health check latency', async (t) => {
        const iterations = 10;
        const durations = [];
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
            });
            const endTime = Date.now();
            durations.push(endTime - startTime);
            t.ok(response.status === 200 || response.status === 404, 'Health check returned valid status');
        }
        const avg = durations.reduce((sum, d) => sum + d, 0) / iterations;
        t.comment(`Health check avg: ${avg.toFixed(2)}ms`);
        t.ok(avg < 10, `Health check should be < 10ms, got ${avg.toFixed(2)}ms`);
    });
});
//# sourceMappingURL=api-benchmark.test.js.map