/**
 * Scenario 1: Exercise Swap Validation
 *
 * Tests the exercise swap functionality from Scenario 4 (Plan and Customize Training)
 * in quickstart.md
 *
 * Acceptance Criteria (8 total):
 * 1. User can view current program with exercises
 * 2. User can open exercise swap modal (API: get alternative exercises)
 * 3. Modal shows alternative exercises (same muscle group)
 * 4. User can swap exercise (API call succeeds)
 * 5. Program updates with new exercise
 * 6. Volume warning displayed if applicable
 * 7. Exercise order preserved after swap
 * 8. Changes persist after refresh
 */

import tap from 'tap';
import buildApp from '../../src/server.js';

tap.test('Scenario 1: Exercise Swap', async (t) => {
  const app = await buildApp();

  // Setup: Create test user and get auth token
  let authToken: string;
  let userId: number;
  let programId: number;
  let programDayId: number;
  let programExerciseId: number;
  let originalExerciseId: number;
  let originalOrderIndex: number;

  await t.before(async () => {
    const testUsername = `test-scenario1-${Date.now()}@example.com`;

    // Register user
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

    // Get user's program
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

    // Get first program exercise (should be a chest exercise like Barbell Bench Press)
    const firstExercise = program.program_days[0].exercises[0];
    programExerciseId = firstExercise.id;
    originalExerciseId = firstExercise.exercise_id;
    originalOrderIndex = firstExercise.order_index;
  });

  // AC-1: User can view current program with exercises
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

  // AC-2 & AC-3: Get alternative exercises (same muscle group)
  await t.test('AC-2 & AC-3: Get alternative exercises for swap', async (t) => {
    // First, get the current exercise to find its muscle group
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

    // Get alternative exercises in the same muscle group
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

    // Verify all alternatives are in the same muscle group
    alternatives.exercises.forEach((exercise: any) => {
      t.equal(
        exercise.primary_muscle_group,
        muscleGroup,
        `Alternative exercise ${exercise.name} is in same muscle group`
      );
    });
  });

  // AC-4: User can swap exercise
  await t.test('AC-4: Swap exercise with alternative', async (t) => {
    // Get alternative exercises
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

    // Find a different exercise to swap to
    const newExercise = alternatives.exercises.find(
      (ex: any) => ex.id !== originalExerciseId
    );

    t.ok(newExercise, 'Found an alternative exercise for swapping');

    // Perform the swap
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

  // AC-5: Program updates with new exercise
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

    // Find the swapped exercise
    const swappedExercise = program.program_days[0].exercises.find(
      (ex: any) => ex.id === programExerciseId
    );

    t.ok(swappedExercise, 'Swapped exercise still exists in program');
    t.not(
      swappedExercise.exercise_id,
      originalExerciseId,
      'Exercise ID has changed'
    );
  });

  // AC-6: Volume warning displayed if applicable
  await t.test('AC-6: Volume warning logic', async (t) => {
    // Get alternative exercises
    const currentExerciseResponse = await app.inject({
      method: 'GET',
      url: `/api/program-exercises/${programExerciseId}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const currentExercise = currentExerciseResponse.json();

    // Get exercise details to find muscle group
    const exerciseDetailsResponse = await app.inject({
      method: 'GET',
      url: `/api/exercises/${currentExercise.exercise_id}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const exerciseDetails = exerciseDetailsResponse.json();

    // Get another alternative
    const alternativesResponse = await app.inject({
      method: 'GET',
      url: `/api/exercises?muscle_group=${exerciseDetails.primary_muscle_group}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const alternatives = alternativesResponse.json();
    const anotherAlternative = alternatives.exercises.find(
      (ex: any) => ex.id !== currentExercise.exercise_id
    );

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

      // Volume warning is optional, but if present should be a string
      if (swapResult.volume_warning) {
        t.type(swapResult.volume_warning, 'string', 'Volume warning is a string');
        t.match(
          swapResult.volume_warning,
          /MEV|MAV|MRV|volume/i,
          'Volume warning mentions volume landmarks'
        );
      } else {
        t.pass('No volume warning (swap maintains volume)');
      }
    }
  });

  // AC-7: Exercise order preserved after swap
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

    t.equal(
      exercise.order_index,
      originalOrderIndex,
      'Order index remains unchanged after swap'
    );
  });

  // AC-8: Changes persist after refresh
  await t.test('AC-8: Swapped exercise persists', async (t) => {
    // Get the current exercise ID after swaps
    const beforeResponse = await app.inject({
      method: 'GET',
      url: `/api/program-exercises/${programExerciseId}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const beforeExercise = beforeResponse.json();
    const exerciseIdBeforeRefresh = beforeExercise.exercise_id;

    // Simulate refresh by making another GET request
    const afterResponse = await app.inject({
      method: 'GET',
      url: `/api/program-exercises/${programExerciseId}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    t.equal(afterResponse.statusCode, 200, 'Returns 200 OK after refresh');
    const afterExercise = afterResponse.json();

    t.equal(
      afterExercise.exercise_id,
      exerciseIdBeforeRefresh,
      'Exercise ID persists after refresh'
    );
    t.equal(
      afterExercise.order_index,
      beforeExercise.order_index,
      'Order index persists after refresh'
    );
    t.equal(
      afterExercise.target_sets,
      beforeExercise.target_sets,
      'Target sets persists after refresh'
    );
  });

  await t.teardown(async () => {
    await app.close();
  });
});
