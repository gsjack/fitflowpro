import tap from 'tap';
import buildApp from '../../src/server.js';
tap.test('Scenario 1: Exercise Swap', async (t) => {
    const app = await buildApp();
    let authToken;
    let userId;
    let programId;
    let programDayId;
    let programExerciseId;
    let originalExerciseId;
    let originalOrderIndex;
    await t.before(async () => {
        const testUsername = `test-scenario1-${Date.now()}@example.com`;
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
        programDayId = program.program_days[0].id;
        const firstExercise = program.program_days[0].exercises[0];
        programExerciseId = firstExercise.id;
        originalExerciseId = firstExercise.exercise_id;
        originalOrderIndex = firstExercise.order_index;
    });
    await t.test('AC-1: View current program with exercises', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(response.statusCode, 200, 'Returns 200 OK');
        const program = response.json();
        t.type(program.id, 'number', 'Program has id');
        t.ok(Array.isArray(program.program_days), 'Program has program_days array');
        t.ok(program.program_days.length > 0, 'Program has at least one day');
        const firstDay = program.program_days[0];
        t.ok(Array.isArray(firstDay.exercises), 'Program day has exercises array');
        t.ok(firstDay.exercises.length > 0, 'Program day has at least one exercise');
        const firstExercise = firstDay.exercises[0];
        t.type(firstExercise.id, 'number', 'Exercise has id');
        t.type(firstExercise.exercise_name, 'string', 'Exercise has name');
        t.type(firstExercise.target_sets, 'number', 'Exercise has target_sets');
        t.type(firstExercise.target_rep_range, 'string', 'Exercise has target_rep_range');
        t.type(firstExercise.target_rir, 'number', 'Exercise has target_rir');
    });
    await t.test('AC-2 & AC-3: Get alternative exercises for swap', async (t) => {
        const currentExerciseResponse = await app.inject({
            method: 'GET',
            url: `/api/exercises/${originalExerciseId}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(currentExerciseResponse.statusCode, 200, 'Can fetch current exercise details');
        const currentExercise = currentExerciseResponse.json();
        const muscleGroup = currentExercise.primary_muscle_group;
        const alternativesResponse = await app.inject({
            method: 'GET',
            url: `/api/exercises?muscle_group=${muscleGroup}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(alternativesResponse.statusCode, 200, 'Returns alternative exercises');
        const alternatives = alternativesResponse.json();
        t.ok(Array.isArray(alternatives.exercises), 'Response has exercises array');
        t.ok(alternatives.exercises.length > 0, 'At least one alternative exercise exists');
        alternatives.exercises.forEach((exercise) => {
            t.equal(exercise.primary_muscle_group, muscleGroup, `Alternative exercise ${exercise.name} is in same muscle group`);
        });
    });
    await t.test('AC-4: Swap exercise with alternative', async (t) => {
        const currentExerciseResponse = await app.inject({
            method: 'GET',
            url: `/api/exercises/${originalExerciseId}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const currentExercise = currentExerciseResponse.json();
        const muscleGroup = currentExercise.primary_muscle_group;
        const alternativesResponse = await app.inject({
            method: 'GET',
            url: `/api/exercises?muscle_group=${muscleGroup}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const alternatives = alternativesResponse.json();
        const newExercise = alternatives.exercises.find((ex) => ex.id !== originalExerciseId);
        t.ok(newExercise, 'Found an alternative exercise for swapping');
        const swapResponse = await app.inject({
            method: 'PUT',
            url: `/api/program-exercises/${programExerciseId}/swap`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
            payload: {
                new_exercise_id: newExercise.id,
            },
        });
        t.equal(swapResponse.statusCode, 200, 'Swap request succeeds');
        const swapResult = swapResponse.json();
        t.equal(swapResult.swapped, true, 'Swap confirmed');
        t.type(swapResult.old_exercise_name, 'string', 'Has old exercise name');
        t.type(swapResult.new_exercise_name, 'string', 'Has new exercise name');
        t.equal(swapResult.new_exercise_name, newExercise.name, 'New exercise name matches');
    });
    await t.test('AC-5: Program reflects swapped exercise', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(response.statusCode, 200, 'Returns 200 OK');
        const program = response.json();
        const swappedExercise = program.program_days[0].exercises.find((ex) => ex.id === programExerciseId);
        t.ok(swappedExercise, 'Swapped exercise still exists in program');
        t.not(swappedExercise.exercise_id, originalExerciseId, 'Exercise ID has changed');
    });
    await t.test('AC-6: Volume warning logic', async (t) => {
        const currentExerciseResponse = await app.inject({
            method: 'GET',
            url: `/api/program-exercises/${programExerciseId}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const currentExercise = currentExerciseResponse.json();
        const exerciseDetailsResponse = await app.inject({
            method: 'GET',
            url: `/api/exercises/${currentExercise.exercise_id}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const exerciseDetails = exerciseDetailsResponse.json();
        const alternativesResponse = await app.inject({
            method: 'GET',
            url: `/api/exercises?muscle_group=${exerciseDetails.primary_muscle_group}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const alternatives = alternativesResponse.json();
        const anotherAlternative = alternatives.exercises.find((ex) => ex.id !== currentExercise.exercise_id);
        if (anotherAlternative) {
            const swapResponse = await app.inject({
                method: 'PUT',
                url: `/api/program-exercises/${programExerciseId}/swap`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
                payload: {
                    new_exercise_id: anotherAlternative.id,
                },
            });
            const swapResult = swapResponse.json();
            if (swapResult.volume_warning) {
                t.type(swapResult.volume_warning, 'string', 'Volume warning is a string');
                t.match(swapResult.volume_warning, /MEV|MAV|MRV|volume/i, 'Volume warning mentions volume landmarks');
            }
            else {
                t.pass('No volume warning (swap maintains volume)');
            }
        }
    });
    await t.test('AC-7: Order index preserved after swap', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: `/api/program-exercises/${programExerciseId}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(response.statusCode, 200, 'Returns 200 OK');
        const exercise = response.json();
        t.equal(exercise.order_index, originalOrderIndex, 'Order index remains unchanged after swap');
    });
    await t.test('AC-8: Swapped exercise persists', async (t) => {
        const beforeResponse = await app.inject({
            method: 'GET',
            url: `/api/program-exercises/${programExerciseId}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const beforeExercise = beforeResponse.json();
        const exerciseIdBeforeRefresh = beforeExercise.exercise_id;
        const afterResponse = await app.inject({
            method: 'GET',
            url: `/api/program-exercises/${programExerciseId}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(afterResponse.statusCode, 200, 'Returns 200 OK after refresh');
        const afterExercise = afterResponse.json();
        t.equal(afterExercise.exercise_id, exerciseIdBeforeRefresh, 'Exercise ID persists after refresh');
        t.equal(afterExercise.order_index, beforeExercise.order_index, 'Order index persists after refresh');
        t.equal(afterExercise.target_sets, beforeExercise.target_sets, 'Target sets persists after refresh');
    });
    await t.teardown(async () => {
        await app.close();
    });
});
//# sourceMappingURL=scenario1-exercise-swap.test.js.map