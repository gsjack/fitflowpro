#!/usr/bin/env node

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'data', 'fitflow.db');
const USER_ID = 151;

console.log('🚀 Starting program seeding for user 151...\n');

// Connect to database
const db = new Database(DB_PATH);

db.exec('BEGIN TRANSACTION');

try {
  // Clear existing program data for user 151
  console.log('🗑️  Deleting existing program data...');
  const deleteExercises = db.prepare(`
    DELETE FROM program_exercises WHERE program_day_id IN (
      SELECT id FROM program_days WHERE program_id IN (
        SELECT id FROM programs WHERE user_id = ?
      )
    )
  `).run(USER_ID);

  const deleteDays = db.prepare(`
    DELETE FROM program_days WHERE program_id IN (
      SELECT id FROM programs WHERE user_id = ?
    )
  `).run(USER_ID);

  const deletePrograms = db.prepare('DELETE FROM programs WHERE user_id = ?').run(USER_ID);

  console.log(`   ✓ Deleted ${deleteExercises.changes} program exercises`);
  console.log(`   ✓ Deleted ${deleteDays.changes} program days`);
  console.log(`   ✓ Deleted ${deletePrograms.changes} programs\n`);

  // Create the program
  console.log('📝 Creating program...');
  const programResult = db.prepare(`
    INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
    VALUES (?, 'Renaissance Periodization 6-Day Split', 1, 'mev', ?)
  `).run(USER_ID, Date.now());

  const programId = programResult.lastInsertRowid;
  console.log(`   ✓ Created program (ID: ${programId})\n`);

  // Create program days
  console.log('📅 Creating program days...');
  const programDayIds = [];

  const days = [
    { dow: 1, name: 'Push A (Chest-Focused)', type: 'strength' },
    { dow: 2, name: 'Pull A (Lat-Focused)', type: 'strength' },
    { dow: 3, name: 'VO2max A (Norwegian 4x4)', type: 'vo2max' },
    { dow: 4, name: 'Push B (Shoulder-Focused)', type: 'strength' },
    { dow: 5, name: 'Pull B (Rhomboid/Trap-Focused)', type: 'strength' },
    { dow: 6, name: 'VO2max B (30/30 or Zone 2)', type: 'vo2max' }
  ];

  const insertDay = db.prepare(`
    INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
    VALUES (?, ?, ?, ?)
  `);

  days.forEach(day => {
    const result = insertDay.run(programId, day.dow, day.name, day.type);
    programDayIds.push(result.lastInsertRowid);
    console.log(`   ✓ Day ${day.dow}: ${day.name}`);
  });
  console.log('');

  // Create program exercises
  console.log('💪 Creating program exercises...');

  const insertExercise = db.prepare(`
    INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Day 1 (Monday) - Push A (Chest-Focused)
  const day1Exercises = [
    { exercise_id: 25, order: 1, sets: 3, reps: '6-8', rir: 3 },    // Barbell Back Squat
    { exercise_id: 1, order: 2, sets: 4, reps: '6-8', rir: 3 },     // Barbell Bench Press
    { exercise_id: 5, order: 3, sets: 3, reps: '8-10', rir: 2 },    // Incline Dumbbell Press
    { exercise_id: 7, order: 4, sets: 3, reps: '12-15', rir: 1 },   // Cable Flyes
    { exercise_id: 20, order: 5, sets: 4, reps: '12-15', rir: 1 },  // Lateral Raises
    { exercise_id: 49, order: 6, sets: 3, reps: '15-20', rir: 0 }   // Tricep Pushdown
  ];

  // Day 2 (Tuesday) - Pull A (Lat-Focused)
  const day2Exercises = [
    { exercise_id: 68, order: 1, sets: 3, reps: '5-8', rir: 3 },    // Conventional Deadlift
    { exercise_id: 14, order: 2, sets: 4, reps: '5-8', rir: 3 },    // Pull-Ups
    { exercise_id: 10, order: 3, sets: 4, reps: '8-10', rir: 2 },   // Barbell Row
    { exercise_id: 13, order: 4, sets: 3, reps: '12-15', rir: 1 },  // Seated Cable Row
    { exercise_id: 16, order: 5, sets: 3, reps: '15-20', rir: 0 },  // Face Pulls
    { exercise_id: 39, order: 6, sets: 3, reps: '8-12', rir: 1 }    // Barbell Curl
  ];

  // Day 3 (Wednesday) - VO2max A (no exercises)
  const day3Exercises = [];

  // Day 4 (Thursday) - Push B (Shoulder-Focused)
  const day4Exercises = [
    { exercise_id: 27, order: 1, sets: 3, reps: '8-12', rir: 3 },   // Leg Press
    { exercise_id: 18, order: 2, sets: 4, reps: '5-8', rir: 3 },    // Overhead Press
    { exercise_id: 4, order: 3, sets: 3, reps: '8-12', rir: 2 },    // Dumbbell Bench Press
    { exercise_id: 21, order: 4, sets: 4, reps: '15-20', rir: 0 },  // Cable Lateral Raises
    { exercise_id: 22, order: 5, sets: 3, reps: '15-20', rir: 0 },  // Rear Delt Flyes
    { exercise_id: 46, order: 6, sets: 3, reps: '8-10', rir: 2 }    // Close-Grip Bench Press
  ];

  // Day 5 (Friday) - Pull B (Rhomboid/Trap-Focused)
  const day5Exercises = [
    { exercise_id: 26, order: 1, sets: 3, reps: '6-8', rir: 3 },    // Front Squat
    { exercise_id: 10, order: 2, sets: 4, reps: '6-8', rir: 3 },    // Barbell Row
    { exercise_id: 12, order: 3, sets: 3, reps: '10-12', rir: 2 },  // Lat Pulldown
    { exercise_id: 62, order: 4, sets: 4, reps: '12-15', rir: 1 },  // Barbell Shrugs
    { exercise_id: 22, order: 5, sets: 3, reps: '15-20', rir: 0 },  // Rear Delt Flyes
    { exercise_id: 41, order: 6, sets: 3, reps: '10-15', rir: 1 }   // Hammer Curl
  ];

  // Day 6 (Saturday) - VO2max B (no exercises)
  const day6Exercises = [];

  const allExercises = [
    day1Exercises, day2Exercises, day3Exercises,
    day4Exercises, day5Exercises, day6Exercises
  ];

  let totalExercises = 0;
  allExercises.forEach((dayExercises, dayIndex) => {
    dayExercises.forEach(ex => {
      insertExercise.run(
        programDayIds[dayIndex],
        ex.exercise_id,
        ex.order,
        ex.sets,
        ex.reps,
        ex.rir
      );
      totalExercises++;
    });
  });

  console.log(`   ✓ Created ${totalExercises} program exercises\n`);

  // Create today's workout
  console.log('🏋️  Creating today\'s workout...');
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

  // Map day of week to program day index
  const dayMapping = {
    0: 5, // Sunday -> Saturday's workout (VO2max B)
    1: 0, // Monday -> Push A
    2: 1, // Tuesday -> Pull A
    3: 2, // Wednesday -> VO2max A
    4: 3, // Thursday -> Push B
    5: 4, // Friday -> Pull B
    6: 5  // Saturday -> VO2max B
  };

  const todayProgramDayId = programDayIds[dayMapping[dayOfWeek]];
  const dateStr = today.toISOString().split('T')[0];

  const workoutResult = db.prepare(`
    INSERT INTO workouts (user_id, program_day_id, date, status, synced)
    VALUES (?, ?, ?, 'not_started', 0)
  `).run(USER_ID, todayProgramDayId, dateStr);

  console.log(`   ✓ Created workout for ${dateStr} (ID: ${workoutResult.lastInsertRowid})\n`);

  db.exec('COMMIT');
  console.log('✅ Transaction committed successfully!\n');

} catch (error) {
  db.exec('ROLLBACK');
  console.error('❌ Error executing SQL, transaction rolled back:', error.message);
  console.error(error);
  process.exit(1);
}

// Verify the program was created
console.log('📊 Verification:\n');

const program = db.prepare('SELECT * FROM programs WHERE user_id = ?').get(USER_ID);
if (program) {
  console.log(`✓ Program created: "${program.name}" (ID: ${program.id})`);
  console.log(`  Phase: ${program.mesocycle_phase}, Week: ${program.mesocycle_week}`);
} else {
  console.error('❌ Program not found for user 151');
  process.exit(1);
}

const programDays = db.prepare('SELECT COUNT(*) as count FROM program_days WHERE program_id = ?').get(program.id);
console.log(`✓ Program days: ${programDays.count}`);

const programExercises = db.prepare(`
  SELECT COUNT(*) as count
  FROM program_exercises pe
  JOIN program_days pd ON pe.program_day_id = pd.id
  WHERE pd.program_id = ?
`).get(program.id);
console.log(`✓ Program exercises: ${programExercises.count}`);

const todayWorkout = db.prepare(`
  SELECT w.*, pd.day_name
  FROM workouts w
  JOIN program_days pd ON w.program_day_id = pd.id
  WHERE w.user_id = ? AND w.date = date('now')
`).get(USER_ID);

if (todayWorkout) {
  console.log(`✓ Today's workout: "${todayWorkout.day_name}" (Status: ${todayWorkout.status})`);
} else {
  console.log('⚠ No workout created for today');
}

// Show detailed breakdown by day
console.log('\n📋 Program Structure:\n');
const dayBreakdown = db.prepare(`
  SELECT
    pd.day_of_week,
    pd.day_name,
    pd.day_type,
    COUNT(pe.id) as exercise_count
  FROM program_days pd
  LEFT JOIN program_exercises pe ON pe.program_day_id = pd.id
  WHERE pd.program_id = ?
  GROUP BY pd.id
  ORDER BY pd.day_of_week
`).all(program.id);

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
dayBreakdown.forEach(day => {
  const dayLabel = dayNames[day.day_of_week];
  console.log(`  ${dayLabel}: ${day.day_name} (${day.exercise_count} exercises)`);
});

db.close();
console.log('\n✅ Database connection closed. Seeding complete!\n');
