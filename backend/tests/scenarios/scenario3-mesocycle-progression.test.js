import tap from 'tap';
import buildApp from '../../src/server.js';
tap.test('Scenario 3: Mesocycle Progression', async (t) => {
    const app = await buildApp();
    let authToken;
    let userId;
    let programId;
    await t.before(async () => {
        const testUsername = `test-scenario3-${Date.now()}@example.com`;
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
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const program = programResponse.json();
        programId = program.id;
    });
    await t.test('AC-1: Program starts in MEV phase', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(response.statusCode, 200, 'Returns 200 OK');
        const program = response.json();
        t.equal(program.mesocycle_phase, 'mev', 'Program starts in MEV phase');
        t.type(program.mesocycle_week, 'number', 'Has mesocycle_week');
    });
    await t.test('AC-2: Advance MEV→MAV automatically', async (t) => {
        const beforeResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const beforeProgram = beforeResponse.json();
        t.equal(beforeProgram.mesocycle_phase, 'mev', 'Currently in MEV phase');
        const advanceResponse = await app.inject({
            method: 'PATCH',
            url: `/api/programs/${programId}/advance-phase`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
            payload: {
                manual: false,
            },
        });
        t.equal(advanceResponse.statusCode, 200, 'Phase advancement succeeds');
        const advanceResult = advanceResponse.json();
        t.equal(advanceResult.previous_phase, 'mev', 'Previous phase was MEV');
        t.equal(advanceResult.new_phase, 'mav', 'New phase is MAV');
        t.type(advanceResult.volume_multiplier, 'number', 'Has volume multiplier');
        t.type(advanceResult.exercises_updated, 'number', 'Has exercises updated count');
    });
    await t.test('AC-3: Volume increases ~20% for MEV→MAV', async (t) => {
        const testUsername = `test-volume-mev-${Date.now()}@example.com`;
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
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                username: testUsername,
                password: 'SecurePass123!',
            },
        });
        const newAuthToken = loginResponse.json().token;
        const beforeResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${newAuthToken}`,
            },
        });
        const beforeProgram = beforeResponse.json();
        const newProgramId = beforeProgram.id;
        let totalSetsBefore = 0;
        beforeProgram.program_days.forEach((day) => {
            day.exercises.forEach((exercise) => {
                totalSetsBefore += exercise.target_sets;
            });
        });
        const advanceResponse = await app.inject({
            method: 'PATCH',
            url: `/api/programs/${newProgramId}/advance-phase`,
            headers: {
                authorization: `Bearer ${newAuthToken}`,
            },
            payload: {
                manual: false,
            },
        });
        const advanceResult = advanceResponse.json();
        t.ok(advanceResult.volume_multiplier >= 1.15 && advanceResult.volume_multiplier <= 1.25, `Volume multiplier ${advanceResult.volume_multiplier} is ~1.20 (within 1.15-1.25 range)`);
        const afterResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${newAuthToken}`,
            },
        });
        const afterProgram = afterResponse.json();
        let totalSetsAfter = 0;
        afterProgram.program_days.forEach((day) => {
            day.exercises.forEach((exercise) => {
                totalSetsAfter += exercise.target_sets;
            });
        });
        const actualIncrease = totalSetsAfter / totalSetsBefore;
        t.ok(actualIncrease >= 1.1 && actualIncrease <= 1.3, `Actual volume increase ${actualIncrease.toFixed(2)}x is reasonable`);
    });
    await t.test('AC-4 & AC-5: Advance MAV→MRV with ~15% volume increase', async (t) => {
        const beforeResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const beforeProgram = beforeResponse.json();
        if (beforeProgram.mesocycle_phase !== 'mav') {
            await app.inject({
                method: 'PATCH',
                url: `/api/programs/${programId}/advance-phase`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
                payload: {
                    manual: true,
                    target_phase: 'mav',
                },
            });
        }
        const advanceResponse = await app.inject({
            method: 'PATCH',
            url: `/api/programs/${programId}/advance-phase`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
            payload: {
                manual: false,
            },
        });
        t.equal(advanceResponse.statusCode, 200, 'Phase advancement succeeds');
        const advanceResult = advanceResponse.json();
        t.equal(advanceResult.previous_phase, 'mav', 'Previous phase was MAV');
        t.equal(advanceResult.new_phase, 'mrv', 'New phase is MRV');
        t.ok(advanceResult.volume_multiplier >= 1.10 && advanceResult.volume_multiplier <= 1.20, `Volume multiplier ${advanceResult.volume_multiplier} is ~1.15 (within 1.10-1.20 range)`);
    });
    await t.test('AC-6 & AC-7: Advance MRV→Deload with ~50% volume decrease', async (t) => {
        const beforeResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const beforeProgram = beforeResponse.json();
        if (beforeProgram.mesocycle_phase !== 'mrv') {
            await app.inject({
                method: 'PATCH',
                url: `/api/programs/${programId}/advance-phase`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
                payload: {
                    manual: true,
                    target_phase: 'mrv',
                },
            });
        }
        const advanceResponse = await app.inject({
            method: 'PATCH',
            url: `/api/programs/${programId}/advance-phase`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
            payload: {
                manual: true,
                target_phase: 'deload',
            },
        });
        t.equal(advanceResponse.statusCode, 200, 'Phase advancement succeeds');
        const advanceResult = advanceResponse.json();
        t.equal(advanceResult.previous_phase, 'mrv', 'Previous phase was MRV');
        t.equal(advanceResult.new_phase, 'deload', 'New phase is Deload');
        t.ok(advanceResult.volume_multiplier <= 0.6, `Volume multiplier ${advanceResult.volume_multiplier} reduces volume by ~50%`);
        t.ok(advanceResult.volume_multiplier >= 0.4, `Volume multiplier ${advanceResult.volume_multiplier} is at least 40%`);
    });
    await t.test('AC-8: All exercises updated atomically', async (t) => {
        const testUsername = `test-atomic-${Date.now()}@example.com`;
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
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                username: testUsername,
                password: 'SecurePass123!',
            },
        });
        const newAuthToken = loginResponse.json().token;
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${newAuthToken}`,
            },
        });
        const program = programResponse.json();
        const newProgramId = program.id;
        let totalExercisesBefore = 0;
        program.program_days.forEach((day) => {
            totalExercisesBefore += day.exercises.length;
        });
        const advanceResponse = await app.inject({
            method: 'PATCH',
            url: `/api/programs/${newProgramId}/advance-phase`,
            headers: {
                authorization: `Bearer ${newAuthToken}`,
            },
            payload: {
                manual: false,
            },
        });
        const advanceResult = advanceResponse.json();
        t.equal(advanceResult.exercises_updated, totalExercisesBefore, 'All exercises were updated atomically');
        const afterResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${newAuthToken}`,
            },
        });
        const afterProgram = afterResponse.json();
        let totalExercisesAfter = 0;
        afterProgram.program_days.forEach((day) => {
            totalExercisesAfter += day.exercises.length;
        });
        t.equal(totalExercisesAfter, totalExercisesBefore, 'Exercise count remains the same (no exercises lost)');
    });
    await t.test('AC-9: Manually specify target phase', async (t) => {
        const testUsername = `test-manual-${Date.now()}@example.com`;
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
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                username: testUsername,
                password: 'SecurePass123!',
            },
        });
        const newAuthToken = loginResponse.json().token;
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${newAuthToken}`,
            },
        });
        const program = programResponse.json();
        const newProgramId = program.id;
        t.equal(program.mesocycle_phase, 'mev', 'Starts in MEV phase');
        const advanceResponse = await app.inject({
            method: 'PATCH',
            url: `/api/programs/${newProgramId}/advance-phase`,
            headers: {
                authorization: `Bearer ${newAuthToken}`,
            },
            payload: {
                manual: true,
                target_phase: 'mrv',
            },
        });
        t.equal(advanceResponse.statusCode, 200, 'Manual phase advancement succeeds');
        const advanceResult = advanceResponse.json();
        t.equal(advanceResult.previous_phase, 'mev', 'Previous phase was MEV');
        t.equal(advanceResult.new_phase, 'mrv', 'New phase is MRV (skipped MAV)');
    });
    await t.test('AC-10: Proper phase progression sequence', async (t) => {
        const testUsername = `test-progression-${Date.now()}@example.com`;
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
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                username: testUsername,
                password: 'SecurePass123!',
            },
        });
        const newAuthToken = loginResponse.json().token;
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${newAuthToken}`,
            },
        });
        const program = programResponse.json();
        const newProgramId = program.id;
        const expectedProgression = [
            { from: 'mev', to: 'mav' },
            { from: 'mav', to: 'mrv' },
            { from: 'mrv', to: 'deload' },
        ];
        for (const step of expectedProgression) {
            const advanceResponse = await app.inject({
                method: 'PATCH',
                url: `/api/programs/${newProgramId}/advance-phase`,
                headers: {
                    authorization: `Bearer ${newAuthToken}`,
                },
                payload: {
                    manual: false,
                },
            });
            const advanceResult = advanceResponse.json();
            t.equal(advanceResult.previous_phase, step.from, `Advancing from ${step.from}`);
            t.equal(advanceResult.new_phase, step.to, `Advancing to ${step.to}`);
        }
        const finalResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${newAuthToken}`,
            },
        });
        const finalProgram = finalResponse.json();
        t.equal(finalProgram.mesocycle_phase, 'deload', 'Final phase is Deload');
    });
    await t.teardown(async () => {
        await app.close();
    });
});
//# sourceMappingURL=scenario3-mesocycle-progression.test.js.map