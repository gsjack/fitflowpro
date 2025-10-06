const Database = require('better-sqlite3');
const db = new Database('/mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db', { readonly: true });

console.log('=== DATABASE INTEGRITY CHECK ===\n');

// 1. Check for orphaned records
console.log('1. ORPHANED RECORDS CHECK:');
console.log('---------------------------');

// Sets without workouts
const orphanedSets = db.prepare(`
  SELECT COUNT(*) as count
  FROM sets s
  LEFT JOIN workouts w ON s.workout_id = w.id
  WHERE w.id IS NULL
`).get();
console.log(`Sets without workouts: ${orphanedSets.count}`);

if (orphanedSets.count > 0) {
  const examples = db.prepare(`
    SELECT s.id, s.workout_id, s.exercise_id, s.weight_kg, s.reps
    FROM sets s
    LEFT JOIN workouts w ON s.workout_id = w.id
    WHERE w.id IS NULL
    LIMIT 5
  `).all();
  console.log('  Examples:', JSON.stringify(examples, null, 2));
}

// Workouts without program_days
const orphanedWorkouts = db.prepare(`
  SELECT COUNT(*) as count
  FROM workouts w
  LEFT JOIN program_days pd ON w.program_day_id = pd.id
  WHERE w.program_day_id IS NOT NULL AND pd.id IS NULL
`).get();
console.log(`Workouts without program_days: ${orphanedWorkouts.count}`);

if (orphanedWorkouts.count > 0) {
  const examples = db.prepare(`
    SELECT w.id, w.program_day_id, w.user_id, w.date, w.status
    FROM workouts w
    LEFT JOIN program_days pd ON w.program_day_id = pd.id
    WHERE w.program_day_id IS NOT NULL AND pd.id IS NULL
    LIMIT 5
  `).all();
  console.log('  Examples:', JSON.stringify(examples, null, 2));
}

// Program_days without programs
const orphanedProgramDays = db.prepare(`
  SELECT COUNT(*) as count
  FROM program_days pd
  LEFT JOIN programs p ON pd.program_id = p.id
  WHERE p.id IS NULL
`).get();
console.log(`Program_days without programs: ${orphanedProgramDays.count}`);

if (orphanedProgramDays.count > 0) {
  const examples = db.prepare(`
    SELECT pd.id, pd.program_id, pd.day_number, pd.name
    FROM program_days pd
    LEFT JOIN programs p ON pd.program_id = p.id
    WHERE p.id IS NULL
    LIMIT 5
  `).all();
  console.log('  Examples:', JSON.stringify(examples, null, 2));
}

// Sets without exercises
const setsWithoutExercises = db.prepare(`
  SELECT COUNT(*) as count
  FROM sets s
  LEFT JOIN exercises e ON s.exercise_id = e.id
  WHERE e.id IS NULL
`).get();
console.log(`Sets without exercises: ${setsWithoutExercises.count}`);

if (setsWithoutExercises.count > 0) {
  const examples = db.prepare(`
    SELECT s.id, s.workout_id, s.exercise_id, s.weight_kg, s.reps
    FROM sets s
    LEFT JOIN exercises e ON s.exercise_id = e.id
    WHERE e.id IS NULL
    LIMIT 5
  `).all();
  console.log('  Examples:', JSON.stringify(examples, null, 2));
}

console.log('\n2. NULL VALUES IN CRITICAL FIELDS:');
console.log('-----------------------------------');

// Workouts with NULL user_id
const workoutsNullUserId = db.prepare(`
  SELECT COUNT(*) as count FROM workouts WHERE user_id IS NULL
`).get();
console.log(`Workouts with NULL user_id: ${workoutsNullUserId.count}`);

if (workoutsNullUserId.count > 0) {
  const examples = db.prepare(`
    SELECT id, program_day_id, date, status
    FROM workouts WHERE user_id IS NULL LIMIT 5
  `).all();
  console.log('  Examples:', JSON.stringify(examples, null, 2));
}

// Sets with NULL workout_id
const setsNullWorkoutId = db.prepare(`
  SELECT COUNT(*) as count FROM sets WHERE workout_id IS NULL
`).get();
console.log(`Sets with NULL workout_id: ${setsNullWorkoutId.count}`);

// Sets with NULL exercise_id
const setsNullExerciseId = db.prepare(`
  SELECT COUNT(*) as count FROM sets WHERE exercise_id IS NULL
`).get();
console.log(`Sets with NULL exercise_id: ${setsNullExerciseId.count}`);

// Sets with NULL critical data
const setsNullData = db.prepare(`
  SELECT COUNT(*) as count FROM sets
  WHERE weight_kg IS NULL OR reps IS NULL OR rir IS NULL
`).get();
console.log(`Sets with NULL weight/reps/rir: ${setsNullData.count}`);

if (setsNullData.count > 0) {
  const examples = db.prepare(`
    SELECT id, workout_id, exercise_id, weight_kg, reps, rir
    FROM sets
    WHERE weight_kg IS NULL OR reps IS NULL OR rir IS NULL
    LIMIT 5
  `).all();
  console.log('  Examples:', JSON.stringify(examples, null, 2));
}

console.log('\n3. FOREIGN KEY RELATIONSHIP VERIFICATION:');
console.log('------------------------------------------');

// All workout.program_day_id references exist (already checked above as orphaned workouts)
console.log(`Invalid workout.program_day_id references: ${orphanedWorkouts.count}`);

// All sets.workout_id references exist (already checked above as orphaned sets)
console.log(`Invalid sets.workout_id references: ${orphanedSets.count}`);

// All sets.exercise_id references exist (already checked above)
console.log(`Invalid sets.exercise_id references: ${setsWithoutExercises.count}`);

// Program_days.program_id references
console.log(`Invalid program_days.program_id references: ${orphanedProgramDays.count}`);

console.log('\n4. DUPLICATE DATA CHECK:');
console.log('------------------------');

// Duplicate users by username
const duplicateUsers = db.prepare(`
  SELECT username, COUNT(*) as count
  FROM users
  GROUP BY username
  HAVING count > 1
`).all();
console.log(`Duplicate usernames: ${duplicateUsers.length}`);
if (duplicateUsers.length > 0) {
  console.log('  Duplicates:', JSON.stringify(duplicateUsers, null, 2));
}

// Multiple programs per user
const multiplePrograms = db.prepare(`
  SELECT user_id, COUNT(*) as count
  FROM programs
  GROUP BY user_id
  HAVING count > 1
`).all();
console.log(`Users with multiple programs: ${multiplePrograms.length}`);
if (multiplePrograms.length > 0) {
  console.log('  Users:', JSON.stringify(multiplePrograms, null, 2));
}

// Duplicate exercises by name
const duplicateExercises = db.prepare(`
  SELECT name, COUNT(*) as count
  FROM exercises
  GROUP BY name
  HAVING count > 1
`).all();
console.log(`Duplicate exercise names: ${duplicateExercises.length}`);
if (duplicateExercises.length > 0 && duplicateExercises.length <= 10) {
  console.log('  Duplicates:', JSON.stringify(duplicateExercises, null, 2));
}

console.log('\n5. DATA QUALITY ISSUES:');
console.log('-----------------------');

// Workouts with sets but status not completed
const workoutsWithSetsNotCompleted = db.prepare(`
  SELECT w.id, w.status, COUNT(s.id) as set_count
  FROM workouts w
  INNER JOIN sets s ON w.id = s.workout_id
  WHERE w.status != 'completed'
  GROUP BY w.id, w.status
`).all();
console.log(`Workouts with sets but status != completed: ${workoutsWithSetsNotCompleted.length}`);
if (workoutsWithSetsNotCompleted.length > 0 && workoutsWithSetsNotCompleted.length <= 5) {
  console.log('  Examples:', JSON.stringify(workoutsWithSetsNotCompleted, null, 2));
}

// Sets with invalid RIR values (should be 0-4)
const invalidRIR = db.prepare(`
  SELECT COUNT(*) as count FROM sets WHERE rir < 0 OR rir > 4
`).get();
console.log(`Sets with invalid RIR (not 0-4): ${invalidRIR.count}`);

if (invalidRIR.count > 0) {
  const examples = db.prepare(`
    SELECT id, workout_id, exercise_id, weight_kg, reps, rir
    FROM sets WHERE rir < 0 OR rir > 4 LIMIT 5
  `).all();
  console.log('  Examples:', JSON.stringify(examples, null, 2));
}

// Sets with weight_kg = 0
const zeroWeight = db.prepare(`
  SELECT COUNT(*) as count FROM sets WHERE weight_kg = 0
`).get();
console.log(`Sets with weight_kg = 0: ${zeroWeight.count}`);

// Sets with reps = 0
const zeroReps = db.prepare(`
  SELECT COUNT(*) as count FROM sets WHERE reps = 0
`).get();
console.log(`Sets with reps = 0: ${zeroReps.count}`);

// Future dated workouts
const futureWorkouts = db.prepare(`
  SELECT COUNT(*) as count FROM workouts WHERE date > datetime('now')
`).get();
console.log(`Future dated workouts: ${futureWorkouts.count}`);

console.log('\n6. TABLE RECORD COUNTS:');
console.log('-----------------------');

const tables = ['users', 'programs', 'program_days', 'exercises', 'workouts', 'sets', 'recovery_assessments'];
tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
  console.log(`${table}: ${count.count} records`);
});

console.log('\n7. SYNC STATUS:');
console.log('---------------');

const unsyncedSets = db.prepare(`
  SELECT COUNT(*) as count FROM sets WHERE synced = 0
`).get();
console.log(`Unsynced sets: ${unsyncedSets.count}`);

const unsyncedWorkouts = db.prepare(`
  SELECT COUNT(*) as count FROM workouts WHERE synced = 0
`).get();
console.log(`Unsynced workouts: ${unsyncedWorkouts.count}`);

db.close();
console.log('\n=== END OF INTEGRITY CHECK ===');
