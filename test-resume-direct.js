#!/usr/bin/env node

/**
 * Test script to verify workout resume functionality
 * Direct DB access version (no API calls needed)
 * Replicates the exact logic from /mobile/src/stores/workoutStore.ts lines 273-314
 *
 * User: asigator@googlemail.com (user_id: 151)
 * Workout ID: 29
 * Expected result: Resume at index 3 (Cable Lateral Raises)
 */

const path = require('path');
// Use backend's node_modules for better-sqlite3
const Database = require('./backend/node_modules/better-sqlite3');

const DB_PATH = path.join(__dirname, 'backend', 'data', 'fitflow.db');
const WORKOUT_ID = 29;
const USER_ID = 151;

console.log('='.repeat(80));
console.log('WORKOUT RESUME LOGIC TEST (Direct DB Access)');
console.log('='.repeat(80));
console.log();

try {
  // Connect to database
  const db = new Database(DB_PATH, { readonly: true });

  // Step 1: Verify user exists
  console.log('Step 1: Verifying user exists...');
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(USER_ID);
  if (!user) {
    console.error('❌ User not found with ID:', USER_ID);
    process.exit(1);
  }
  console.log('✓ User found:', user.username);
  console.log();

  // Step 2: Fetch workout data (mimicking GET /api/workouts?workout_id=29)
  console.log('Step 2: Fetching workout data...');
  const workout = db.prepare(`
    SELECT
      w.id,
      w.user_id,
      w.program_day_id,
      w.date,
      w.status,
      w.started_at,
      w.completed_at,
      pd.day_name,
      pd.day_type
    FROM workouts w
    LEFT JOIN program_days pd ON w.program_day_id = pd.id
    WHERE w.id = ?
  `).get(WORKOUT_ID);

  if (!workout) {
    console.error('❌ Workout not found with ID:', WORKOUT_ID);
    process.exit(1);
  }

  console.log('✓ Workout fetched');
  console.log('  Workout ID:', workout.id);
  console.log('  User ID:', workout.user_id);
  console.log('  Status:', workout.status);
  console.log('  Day:', workout.day_name);
  console.log();

  // Step 3: Fetch workout exercises (mimicking API response)
  console.log('Step 3: Fetching workout exercises...');
  const exercises = db.prepare(`
    SELECT
      pe.id as program_exercise_id,
      pe.exercise_id,
      pe.order_index,
      pe.sets,
      pe.reps,
      pe.rir,
      e.name as exercise_name,
      e.muscle_groups
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.program_day_id = ?
    ORDER BY pe.order_index
  `).all(workout.program_day_id);

  console.log('✓ Exercises fetched:', exercises.length, 'exercises');
  console.log();

  // Step 4: Fetch completed sets (mimicking GET /api/sets?workout_id=29)
  console.log('Step 4: Fetching completed sets...');
  const sets = db.prepare(`
    SELECT
      s.id,
      s.workout_id,
      s.exercise_id,
      s.set_number,
      s.weight_kg,
      s.reps,
      s.rir,
      s.timestamp,
      e.name as exercise_name
    FROM sets s
    LEFT JOIN exercises e ON s.exercise_id = e.id
    WHERE s.workout_id = ?
    ORDER BY s.timestamp
  `).all(WORKOUT_ID);

  console.log('✓ Sets fetched:', sets.length, 'total sets');
  console.log();

  db.close();

  // Now replicate the exact resume logic from workoutStore.ts

  // Add exercises to workout object (mimicking API response structure)
  workout.exercises = exercises;

  // Step 5: Display exercises
  console.log('Step 5: Workout exercises:');
  console.log('-'.repeat(80));
  if (workout.exercises && workout.exercises.length > 0) {
    workout.exercises.forEach((exercise, index) => {
      console.log(`  [${index}] ${exercise.exercise_name}`);
      console.log(`      Exercise ID: ${exercise.exercise_id}`);
      console.log(`      Target sets: ${exercise.sets}`);
      console.log(`      Order index: ${exercise.order_index}`);
    });
  } else {
    console.log('  ❌ No exercises found in workout!');
  }
  console.log();

  // Step 6: Display completed sets
  console.log('Step 6: Completed sets:');
  console.log('-'.repeat(80));
  sets.forEach((set, index) => {
    console.log(`  Set ${index + 1}: ${set.exercise_name} (ID ${set.exercise_id}) - ${set.weight_kg}kg x ${set.reps} reps @ RIR ${set.rir}`);
  });
  console.log();

  // Step 7: REPLICATE EXACT RESUME LOGIC FROM workoutStore.ts
  console.log('Step 7: Calculating resume position (EXACT logic from workoutStore.ts)');
  console.log('-'.repeat(80));

  let resumeExerciseIndex = 0;

  if (workout.exercises && workout.exercises.length > 0) {
    console.log('[WorkoutStore] Exercises:', workout.exercises.map(e => ({
      id: e.exercise_id,
      name: e.exercise_name,
      sets: e.sets,
      order: e.order_index
    })));
    console.log();

    // Count completed sets per exercise (EXACT logic from lines 284-288)
    const setsPerExercise = new Map();
    sets.forEach((set) => {
      const count = setsPerExercise.get(set.exercise_id) || 0;
      setsPerExercise.set(set.exercise_id, count + 1);
    });

    console.log('[WorkoutStore] Sets per exercise:', Array.from(setsPerExercise.entries()));
    console.log();

    // Find first exercise that isn't fully completed (EXACT logic from lines 293-309)
    for (let i = 0; i < workout.exercises.length; i++) {
      const exercise = workout.exercises[i];
      const completedSetsCount = setsPerExercise.get(exercise.exercise_id) || 0;

      console.log(`[WorkoutStore] Exercise ${i}: ${exercise.exercise_name} - ${completedSetsCount}/${exercise.sets} sets`);

      if (completedSetsCount < exercise.sets) {
        resumeExerciseIndex = i;
        console.log(`[WorkoutStore] Found incomplete exercise at index ${i}: ${exercise.exercise_name}`);
        break;
      }

      // If we've completed all exercises, stay at the last one
      if (i === workout.exercises.length - 1) {
        resumeExerciseIndex = i;
      }
    }

    console.log('[WorkoutStore] Calculated resume exercise index:', resumeExerciseIndex);
  } else {
    console.log('[WorkoutStore] No exercises found in workout object');
  }

  console.log();
  console.log('='.repeat(80));
  console.log('FINAL RESULT');
  console.log('='.repeat(80));
  console.log();
  console.log('Resume Exercise Index:', resumeExerciseIndex);

  if (workout.exercises && workout.exercises.length > resumeExerciseIndex) {
    const resumeExercise = workout.exercises[resumeExerciseIndex];
    console.log('Resume Exercise Name:', resumeExercise.exercise_name);
    console.log('Resume Exercise ID:', resumeExercise.exercise_id);

    console.log();

    // Verify against expected result
    const expectedIndex = 3;
    const expectedName = 'Cable Lateral Raises';

    if (resumeExerciseIndex === expectedIndex && resumeExercise.exercise_name === expectedName) {
      console.log('✅ TEST PASSED!');
      console.log(`   Correctly resumes at index ${expectedIndex} (${expectedName})`);
    } else {
      console.log('❌ TEST FAILED!');
      console.log(`   Expected: index ${expectedIndex} (${expectedName})`);
      console.log(`   Got: index ${resumeExerciseIndex} (${resumeExercise.exercise_name})`);
      console.log();
      console.log('ANALYSIS:');

      // Analyze why it failed
      if (workout.exercises) {
        const setsPerExercise = new Map();
        sets.forEach((set) => {
          const count = setsPerExercise.get(set.exercise_id) || 0;
          setsPerExercise.set(set.exercise_id, count + 1);
        });

        console.log();
        console.log('Detailed breakdown:');
        workout.exercises.forEach((exercise, index) => {
          const completedSetsCount = setsPerExercise.get(exercise.exercise_id) || 0;
          const isComplete = completedSetsCount >= exercise.sets;
          console.log(`  [${index}] ${exercise.exercise_name}: ${completedSetsCount}/${exercise.sets} sets ${isComplete ? '✓' : '✗'}`);
        });
      }
    }
  } else {
    console.log('❌ TEST FAILED!');
    console.log('   Resume index out of bounds');
  }

  console.log();
  console.log('='.repeat(80));

} catch (error) {
  console.error('❌ Test failed with error:', error.message);
  console.error(error);
  process.exit(1);
}
