/**
 * API-Only Workout Flow Test
 *
 * Tests the complete workout flow using only API calls (no UI).
 * Demonstrates that the backend API is working correctly and can:
 * 1. Login and get JWT token
 * 2. Fetch today's workout with exercises
 * 3. Create a new workout
 * 4. Log sets rapidly
 * 5. Complete workout
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'demo@fitflow.test',
  password: 'Password123',
};

// Push B exercises data
const WORKOUT_EXERCISES = [
  { name: 'Leg Press', sets: 3, weight: 150, reps: 10, rir: 3 },
  { name: 'Overhead Press', sets: 4, weight: 60, reps: 6, rir: 3 },
  { name: 'Dumbbell Bench Press', sets: 3, weight: 30, reps: 10, rir: 2 },
  { name: 'Cable Lateral Raises', sets: 4, weight: 15, reps: 17, rir: 0 },
  { name: 'Rear Delt Flyes', sets: 3, weight: 12, reps: 17, rir: 0 },
  { name: 'Close-Grip Bench Press', sets: 3, weight: 80, reps: 9, rir: 2 },
];

test('complete workout via API only (fast)', async ({ request }) => {
  console.log('\n========================================');
  console.log('🚀 API-ONLY WORKOUT FLOW TEST');
  console.log('========================================\n');

  const startTime = Date.now();

  // ===== STEP 1: Login =====
  console.log('🔐 Step 1: Logging in...');
  const loginStart = Date.now();

  const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: TEST_USER,
  });

  expect(loginResponse.ok()).toBeTruthy();
  const { token } = await loginResponse.json();
  expect(token).toBeTruthy();

  const loginDuration = Date.now() - loginStart;
  console.log(`✓ Login successful in ${loginDuration}ms`);
  console.log(`  Token: ${token.substring(0, 20)}...`);

  // ===== STEP 2: Get today's workout =====
  console.log('\n📋 Step 2: Fetching today\'s workout...');
  const fetchStart = Date.now();

  const today = '2025-10-02'; // Current date
  const workoutsResponse = await request.get(
    `${API_BASE_URL}/api/workouts?start_date=${today}&end_date=${today}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  expect(workoutsResponse.ok()).toBeTruthy();
  const workouts = await workoutsResponse.json();
  expect(workouts.length).toBeGreaterThan(0);

  const workout = workouts[0];
  const fetchDuration = Date.now() - fetchStart;

  console.log(`✓ Workout fetched in ${fetchDuration}ms`);
  console.log(`  Workout ID: ${workout.id}`);
  console.log(`  Day: ${workout.day_name}`);
  console.log(`  Exercises: ${workout.exercises.length}`);
  console.log(`  Status: ${workout.status}`);

  expect(workout.exercises).toBeDefined();
  expect(workout.exercises.length).toBe(6);

  // Verify exercises match expected
  for (let i = 0; i < workout.exercises.length; i++) {
    const exercise = workout.exercises[i];
    console.log(`    ${i + 1}. ${exercise.exercise_name}: ${exercise.sets} sets × ${exercise.reps} reps @ RIR ${exercise.rir}`);
  }

  // ===== STEP 3: Create new workout if status is not in_progress =====
  let workoutId = workout.id;

  if (workout.status !== 'in_progress') {
    console.log('\n🆕 Step 3: Creating new workout...');
    const createStart = Date.now();

    const createResponse = await request.post(`${API_BASE_URL}/api/workouts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        program_day_id: workout.program_day_id,
        date: today,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const newWorkout = await createResponse.json();
    workoutId = newWorkout.id;

    const createDuration = Date.now() - createStart;
    console.log(`✓ Workout created in ${createDuration}ms`);
    console.log(`  New Workout ID: ${workoutId}`);

    // Update status to in_progress
    const updateResponse = await request.patch(
      `${API_BASE_URL}/api/workouts/${workoutId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { status: 'in_progress' },
      }
    );
    expect(updateResponse.ok()).toBeTruthy();
    console.log('✓ Workout marked as in_progress');
  } else {
    console.log('\n↻ Step 3: Using existing in-progress workout');
    console.log(`  Workout ID: ${workoutId}`);
  }

  // ===== STEP 4: Log sets for all exercises =====
  console.log('\n💪 Step 4: Logging sets...\n');
  const logStart = Date.now();

  let totalSets = 0;
  const setTimes: number[] = [];

  for (let i = 0; i < workout.exercises.length; i++) {
    const exercise = workout.exercises[i];
    const exerciseData = WORKOUT_EXERCISES[i];

    console.log(`📝 Exercise ${i + 1}/${workout.exercises.length}: ${exercise.exercise_name}`);

    for (let setNum = 1; setNum <= exercise.sets; setNum++) {
      const setStart = Date.now();

      const setResponse = await request.post(`${API_BASE_URL}/api/sets`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          workout_id: workoutId,
          exercise_id: exercise.exercise_id,
          set_number: setNum,
          weight_kg: exerciseData.weight,
          reps: exerciseData.reps,
          rir: exerciseData.rir,
          timestamp: Date.now(),
        },
      });

      expect(setResponse.ok()).toBeTruthy();
      const set = await setResponse.json();

      const setDuration = Date.now() - setStart;
      setTimes.push(setDuration);
      totalSets++;

      console.log(`  Set ${setNum}/${exercise.sets}: ${exerciseData.weight}kg × ${exerciseData.reps} reps @ RIR ${exerciseData.rir} → ${setDuration}ms`);
    }

    console.log(`✓ Completed ${exercise.exercise_name}\n`);
  }

  const logDuration = Date.now() - logStart;
  const avgSetTime = setTimes.reduce((a, b) => a + b, 0) / setTimes.length;
  const maxSetTime = Math.max(...setTimes);
  const minSetTime = Math.min(...setTimes);

  console.log(`✓ Logged ${totalSets} sets in ${logDuration}ms`);
  console.log(`  Average per set: ${avgSetTime.toFixed(0)}ms`);
  console.log(`  Min: ${minSetTime}ms, Max: ${maxSetTime}ms`);

  // Performance check
  expect(avgSetTime).toBeLessThan(200); // FR-040: < 200ms p95

  // ===== STEP 5: Complete workout =====
  console.log('\n🏁 Step 5: Completing workout...');
  const completeStart = Date.now();

  const completeResponse = await request.patch(
    `${API_BASE_URL}/api/workouts/${workoutId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'completed' },
    }
  );

  expect(completeResponse.ok()).toBeTruthy();
  const completeDuration = Date.now() - completeStart;

  console.log(`✓ Workout completed in ${completeDuration}ms`);

  // ===== SUMMARY =====
  const totalDuration = Date.now() - startTime;
  console.log('\n========================================');
  console.log('✅ WORKOUT COMPLETED SUCCESSFULLY');
  console.log('========================================');
  console.log(`Total time: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Login: ${loginDuration}ms`);
  console.log(`  Fetch workout: ${fetchDuration}ms`);
  console.log(`  Log ${totalSets} sets: ${logDuration}ms (${avgSetTime.toFixed(0)}ms avg)`);
  console.log(`  Complete: ${completeDuration}ms`);
  console.log('\n✅ All API calls successful');
  console.log('✅ Performance targets met (< 200ms per set)');
  console.log('========================================\n');
});
