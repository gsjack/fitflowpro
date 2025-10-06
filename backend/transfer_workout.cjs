#!/usr/bin/env node
const Database = require('better-sqlite3');

const db = new Database('./data/fitflow.db');

console.log('=== Workout Transfer Script ===\n');

// Step 1: Verify current state
console.log('Step 1: Verifying current state...');
const sourceWorkouts = db.prepare('SELECT COUNT(*) as count FROM workouts WHERE user_id = 131').get();
const targetWorkouts = db.prepare('SELECT COUNT(*) as count FROM workouts WHERE user_id = 118').get();
const workout = db.prepare('SELECT id, user_id, status, date, program_day_id FROM workouts WHERE id = 27').get();
const sets = db.prepare('SELECT COUNT(*) as count FROM sets WHERE workout_id = 27').get();

console.log(`Source user (131) workouts: ${sourceWorkouts.count}`);
console.log(`Target user (118) workouts: ${targetWorkouts.count}`);
console.log(`Workout 27:`, workout);
console.log(`Sets for workout 27: ${sets.count}\n`);

if (!workout) {
  console.error('ERROR: Workout 27 not found!');
  process.exit(1);
}

if (workout.user_id !== 131) {
  console.error(`ERROR: Workout 27 belongs to user ${workout.user_id}, not 131!`);
  process.exit(1);
}

// Step 2: Check program requirements
console.log('Step 2: Checking program requirements...');
const targetProgram = db.prepare('SELECT COUNT(*) as count FROM programs WHERE user_id = 118').get();
console.log(`Target user has ${targetProgram.count} programs`);

const sourceProgram = db.prepare(`
  SELECT p.id, p.name, p.mesocycle_phase, p.mesocycle_week
  FROM programs p
  JOIN program_days pd ON p.id = pd.program_id
  WHERE pd.id = ?
`).get(workout.program_day_id);

console.log('Source program:', sourceProgram);

const sourceProgramDay = db.prepare(`
  SELECT id, program_id, day_name, day_of_week, day_type
  FROM program_days WHERE id = ?
`).get(workout.program_day_id);

console.log('Source program_day:', sourceProgramDay);

// Step 3: Create program for target user
console.log('\nStep 3: Creating program for target user...');

const transaction = db.transaction(() => {
  // Copy program
  const insertProgram = db.prepare(`
    INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insertProgram.run(
    118,
    sourceProgram.name,
    sourceProgram.mesocycle_week,
    sourceProgram.mesocycle_phase,
    Date.now()
  );

  const newProgramId = result.lastInsertRowid;
  console.log(`Created new program: ${newProgramId}`);

  // Copy all program_days from source program
  const sourceProgramDays = db.prepare(`
    SELECT day_of_week, day_name, day_type
    FROM program_days
    WHERE program_id = ?
    ORDER BY day_of_week
  `).all(sourceProgram.id);

  console.log(`Copying ${sourceProgramDays.length} program days...`);

  const insertProgramDay = db.prepare(`
    INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
    VALUES (?, ?, ?, ?)
  `);

  const programDayMapping = {};

  for (const pd of sourceProgramDays) {
    const result = insertProgramDay.run(
      newProgramId,
      pd.day_of_week,
      pd.day_name,
      pd.day_type
    );

    // Map old program_day_id to new one by day_name
    const oldPd = db.prepare(`
      SELECT id FROM program_days
      WHERE program_id = ? AND day_name = ?
    `).get(sourceProgram.id, pd.day_name);

    programDayMapping[oldPd.id] = result.lastInsertRowid;

    console.log(`  ${pd.day_name} (day ${pd.day_of_week}): ${result.lastInsertRowid}`);
  }

  // Copy program_exercises for all program_days
  for (const [oldPdId, newPdId] of Object.entries(programDayMapping)) {
    const exercises = db.prepare(`
      SELECT exercise_id, order_index, sets, reps, rir
      FROM program_exercises
      WHERE program_day_id = ?
    `).all(parseInt(oldPdId));

    if (exercises.length > 0) {
      const insertExercise = db.prepare(`
        INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const ex of exercises) {
        insertExercise.run(
          newPdId,
          ex.exercise_id,
          ex.order_index,
          ex.sets,
          ex.reps,
          ex.rir
        );
      }

      console.log(`  Copied ${exercises.length} exercises for program_day ${newPdId}`);
    }
  }

  // Find the new program_day_id for Push B
  const newProgramDayId = programDayMapping[workout.program_day_id];

  if (!newProgramDayId) {
    throw new Error(`Could not find new program_day_id for ${workout.program_day_id}`);
  }

  console.log(`\nNew program_day for Push B: ${newProgramDayId}`);

  // Step 4: Transfer workout
  console.log('\nStep 4: Transferring workout...');

  const updateWorkout = db.prepare(`
    UPDATE workouts
    SET user_id = ?, program_day_id = ?, synced = 0
    WHERE id = ?
  `);

  updateWorkout.run(118, newProgramDayId, 27);
  console.log(`Workout 27 transferred to user 118`);

  // Delete active session for source user (if exists)
  db.prepare('DELETE FROM active_sessions WHERE workout_id = 27').run();
  console.log('Cleared active sessions');

  // Mark sets as unsynced
  db.prepare('UPDATE sets SET synced = 0 WHERE workout_id = 27').run();
  console.log(`Marked ${sets.count} sets as unsynced`);

  return { newProgramId, newProgramDayId };
});

try {
  const result = transaction();
  console.log('\n✅ Transfer completed successfully!');
  console.log(`New program ID: ${result.newProgramId}`);
  console.log(`New program_day ID: ${result.newProgramDayId}`);

  // Step 5: Verify transfer
  console.log('\nStep 5: Verifying transfer...');
  const verifyWorkout = db.prepare('SELECT id, user_id, status, date, program_day_id FROM workouts WHERE id = 27').get();
  const verifyTargetWorkouts = db.prepare('SELECT COUNT(*) as count FROM workouts WHERE user_id = 118').get();
  const verifySets = db.prepare('SELECT COUNT(*) as count FROM sets WHERE workout_id = 27').get();

  console.log('Workout 27 after transfer:', verifyWorkout);
  console.log(`Target user now has: ${verifyTargetWorkouts.count} workouts`);
  console.log(`Sets still linked: ${verifySets.count}`);

  if (verifyWorkout.user_id === 118 && verifySets.count === sets.count) {
    console.log('\n✅ All verification checks passed!');
  } else {
    console.error('\n❌ Verification failed!');
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ Transfer failed:', error.message);
  console.error('Transaction rolled back.');
  process.exit(1);
}

db.close();
console.log('\nDatabase closed.');
