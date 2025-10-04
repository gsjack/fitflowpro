import tap from 'tap';
import buildApp from '../../src/server.js';
tap.test('Scenario 4: Program Customization', async (t) => {
    const app = await buildApp();
    let authToken;
    let userId;
    let programId;
    let programDayId;
    await t.before(async () => {
        const testUsername = `test-scenario4-${Date.now()}@example.com`;
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
    });
    await t.test('AC-1: View program exercises with details', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(response.statusCode, 200, 'Returns 200 OK');
        const program = response.json();
        t.ok(Array.isArray(program.program_days), 'Has program_days array');
        const firstDay = program.program_days[0];
        t.ok(Array.isArray(firstDay.exercises), 'Has exercises array');
        t.ok(firstDay.exercises.length > 0, 'Has at least one exercise');
        const exercise = firstDay.exercises[0];
        t.type(exercise.exercise_name, 'string', 'Exercise has name');
        t.type(exercise.target_sets, 'number', 'Exercise has target_sets');
        t.type(exercise.target_rep_range, 'string', 'Exercise has target_rep_range');
        t.type(exercise.target_rir, 'number', 'Exercise has target_rir');
        t.type(exercise.order_index, 'number', 'Exercise has order_index');
    });
    await t.test('AC-2: Add new exercise to program day', async (t) => {
        const exercisesResponse = await app.inject({
            method: 'GET',
            url: '/api/exercises?muscle_group=chest',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const exercises = exercisesResponse.json().exercises;
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const currentExerciseIds = programResponse
            .json()
            .program_days[0].exercises.map((ex) => ex.exercise_id);
        const newExercise = exercises.find((ex) => !currentExerciseIds.includes(ex.id));
        t.ok(newExercise, 'Found an exercise to add');
        const addResponse = await app.inject({
            method: 'POST',
            url: '/api/program-exercises',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
            payload: {
                program_day_id: programDayId,
                exercise_id: newExercise.id,
                target_sets: 3,
                target_rep_range: '8-12',
                target_rir: 2,
            },
        });
        t.equal(addResponse.statusCode, 201, 'Exercise added successfully');
        const addResult = addResponse.json();
        t.type(addResult.program_exercise_id, 'number', 'Returns program_exercise_id');
    });
    await t.test('AC-3 & AC-4: Volume validation on add', async (t) => {
        const volumeResponse = await app.inject({
            method: 'GET',
            url: `/api/programs/${programId}/volume`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(volumeResponse.statusCode, 200, 'Volume analysis retrieved');
        const volumeData = volumeResponse.json();
        t.ok(Array.isArray(volumeData.muscle_groups), 'Has muscle_groups array');
        t.ok(volumeData.muscle_groups.length > 0, 'Has at least one muscle group');
        const chestVolume = volumeData.muscle_groups.find((mg) => mg.muscle_group === 'chest');
        if (chestVolume) {
            t.type(chestVolume.planned_sets, 'number', 'Has planned_sets');
            t.type(chestVolume.mev, 'number', 'Has MEV value');
            t.type(chestVolume.mav, 'number', 'Has MAV value');
            t.type(chestVolume.mrv, 'number', 'Has MRV value');
            t.type(chestVolume.zone, 'string', 'Has zone classification');
            t.ok(['below_mev', 'adequate', 'optimal', 'above_mrv'].includes(chestVolume.zone), 'Zone is valid enum value');
            t.ok(chestVolume.mev < chestVolume.mav, 'MEV < MAV');
            t.ok(chestVolume.mav < chestVolume.mrv, 'MAV < MRV');
        }
    });
    await t.test('AC-5: Remove exercise from program', async (t) => {
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const exercises = programResponse.json().program_days[0].exercises;
        const exerciseToRemove = exercises[exercises.length - 1];
        const deleteResponse = await app.inject({
            method: 'DELETE',
            url: `/api/program-exercises/${exerciseToRemove.id}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(deleteResponse.statusCode, 200, 'Exercise removed successfully');
        const deleteResult = deleteResponse.json();
        t.equal(deleteResult.deleted, true, 'Deletion confirmed');
    });
    await t.test('AC-6: Volume warning on remove if below MEV', async (t) => {
        const volumeResponse = await app.inject({
            method: 'GET',
            url: `/api/programs/${programId}/volume`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const volumeData = volumeResponse.json();
        t.ok(Array.isArray(volumeData.warnings), 'Has warnings array');
        if (volumeData.warnings.length > 0) {
            const warning = volumeData.warnings[0];
            t.type(warning.muscle_group, 'string', 'Warning has muscle_group');
            t.ok(['below_mev', 'above_mrv'].includes(warning.issue), 'Warning issue is valid enum');
            t.type(warning.current_volume, 'number', 'Warning has current_volume');
            t.type(warning.threshold, 'number', 'Warning has threshold');
        }
        else {
            t.pass('No volume warnings (volume is adequate)');
        }
    });
    await t.test('AC-7 & AC-8: Batch reorder exercises', async (t) => {
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const exercises = programResponse.json().program_days[0].exercises;
        t.ok(exercises.length >= 2, 'Has at least 2 exercises to reorder');
        const reorderPayload = {
            program_day_id: programDayId,
            exercise_order: [
                {
                    program_exercise_id: exercises[0].id,
                    new_order_index: 1,
                },
                {
                    program_exercise_id: exercises[1].id,
                    new_order_index: 0,
                },
            ],
        };
        const reorderResponse = await app.inject({
            method: 'PATCH',
            url: '/api/program-exercises/batch-reorder',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
            payload: reorderPayload,
        });
        t.equal(reorderResponse.statusCode, 200, 'Reorder successful');
        const reorderResult = reorderResponse.json();
        t.equal(reorderResult.reordered, true, 'Reorder confirmed');
        const afterResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const afterExercises = afterResponse.json().program_days[0].exercises;
        const firstExercise = afterExercises.find((ex) => ex.id === exercises[0].id);
        const secondExercise = afterExercises.find((ex) => ex.id === exercises[1].id);
        t.equal(firstExercise.order_index, 1, 'First exercise moved to index 1');
        t.equal(secondExercise.order_index, 0, 'Second exercise moved to index 0');
    });
    await t.test('AC-9: Update exercise sets/reps/RIR', async (t) => {
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const exercise = programResponse.json().program_days[0].exercises[0];
        const updatePayload = {
            target_sets: 5,
            target_rep_range: '6-10',
            target_rir: 1,
        };
        const updateResponse = await app.inject({
            method: 'PATCH',
            url: `/api/program-exercises/${exercise.id}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
            payload: updatePayload,
        });
        t.equal(updateResponse.statusCode, 200, 'Update successful');
        const updateResult = updateResponse.json();
        t.equal(updateResult.updated, true, 'Update confirmed');
        const afterResponse = await app.inject({
            method: 'GET',
            url: `/api/program-exercises/${exercise.id}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const updatedExercise = afterResponse.json();
        t.equal(updatedExercise.target_sets, 5, 'Sets updated');
        t.equal(updatedExercise.target_rep_range, '6-10', 'Rep range updated');
        t.equal(updatedExercise.target_rir, 1, 'RIR updated');
    });
    await t.test('AC-10: Multi-muscle exercise volume counting', async (t) => {
        const exercisesResponse = await app.inject({
            method: 'GET',
            url: '/api/exercises?movement_pattern=compound',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const compoundExercises = exercisesResponse.json().exercises;
        const multiMuscleExercise = compoundExercises.find((ex) => ex.secondary_muscle_groups && ex.secondary_muscle_groups.length > 0);
        if (multiMuscleExercise) {
            t.ok(multiMuscleExercise.secondary_muscle_groups.length > 0, 'Exercise works multiple muscle groups');
            const volumeResponse = await app.inject({
                method: 'GET',
                url: `/api/programs/${programId}/volume`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });
            const volumeData = volumeResponse.json();
            const primaryMuscle = volumeData.muscle_groups.find((mg) => mg.muscle_group === multiMuscleExercise.primary_muscle_group);
            t.ok(primaryMuscle, `Primary muscle group ${multiMuscleExercise.primary_muscle_group} tracked`);
            t.ok(primaryMuscle.planned_sets > 0, 'Primary muscle has planned sets');
            t.pass('Multi-muscle exercise structure validated');
        }
        else {
            t.skip('No multi-muscle compound exercises found in database');
        }
    });
    await t.test('AC-11: Changes persist across API calls', async (t) => {
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const exercise = programResponse.json().program_days[0].exercises[0];
        const updatePayload = {
            target_sets: 4,
            target_rir: 3,
        };
        await app.inject({
            method: 'PATCH',
            url: `/api/program-exercises/${exercise.id}`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
            payload: updatePayload,
        });
        for (let i = 0; i < 3; i++) {
            const checkResponse = await app.inject({
                method: 'GET',
                url: `/api/program-exercises/${exercise.id}`,
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            });
            const persistedExercise = checkResponse.json();
            t.equal(persistedExercise.target_sets, 4, `Call ${i + 1}: Sets persisted (4)`);
            t.equal(persistedExercise.target_rir, 3, `Call ${i + 1}: RIR persisted (3)`);
        }
        const finalProgramResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const finalExercise = finalProgramResponse
            .json()
            .program_days[0].exercises.find((ex) => ex.id === exercise.id);
        t.equal(finalExercise.target_sets, 4, 'Sets persisted in full program fetch');
        t.equal(finalExercise.target_rir, 3, 'RIR persisted in full program fetch');
    });
    await t.teardown(async () => {
        await app.close();
    });
});
//# sourceMappingURL=scenario4-program-customization.test.js.map