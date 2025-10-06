#!/usr/bin/env node

/**
 * Test complete workout flow for asigator@googlemail.com
 */

const Database = require('better-sqlite3');
const db = new Database('./data/fitflow.db');

console.log('=== Testing Workout Flow ===\n');

// 1. Get user
const user = db.prepare("SELECT * FROM users WHERE username = 'asigator@googlemail.com'").get();
if (!user) {
  console.error('❌ User not found');
  process.exit(1);
}
console.log(`✅ User found: ID ${user.id}, username ${user.username}`);

// 2. Get user's program
const program = db.prepare('SELECT * FROM programs WHERE user_id = ?').get(user.id);
if (!program) {
  console.error('❌ No program found for user');
  process.exit(1);
}
console.log(`✅ Program found: ID ${program.id}, phase ${program.mesocycle_phase}`);

// 3. Get today's recommended workout
const today = new Date().toISOString().split('T')[0];
const todayWeekday = new Date().getDay();
console.log(`📅 Today: ${today} (weekday ${todayWeekday})`);

const programDay = db.prepare(`
  SELECT * FROM program_days
  WHERE program_id = ? AND day_of_week = ?
`).get(program.id, todayWeekday);

if (!programDay) {
  console.error(`❌ No program day found for weekday ${todayWeekday}`);
  process.exit(1);
}
console.log(`✅ Program day found: ID ${programDay.id}, name "${programDay.name}", type ${programDay.day_type}`);

// 4. Check for existing workout
const existingWorkout = db.prepare(`
  SELECT * FROM workouts
  WHERE user_id = ? AND date = ?
`).get(user.id, today);

if (existingWorkout) {
  console.log(`⚠️  Workout already exists: ID ${existingWorkout.id}, status ${existingWorkout.status}`);
} else {
  console.log('✅ No existing workout for today');
}

// 5. Get exercises for this program day
const exercises = db.prepare(`
  SELECT pe.*, e.name as exercise_name, e.muscle_groups
  FROM program_exercises pe
  JOIN exercises e ON pe.exercise_id = e.id
  WHERE pe.program_day_id = ?
  ORDER BY pe.order_index
`).all(programDay.id);

console.log(`\n📋 Exercises (${exercises.length}):`);
exercises.forEach((ex, i) => {
  console.log(`  ${i + 1}. ${ex.exercise_name} - ${ex.sets} sets of ${ex.target_reps_min}-${ex.target_reps_max} @ RIR ${ex.target_rir}`);
});

console.log('\n=== Summary ===');
console.log(`User: ${user.username} (ID ${user.id})`);
console.log(`Program Day: ${programDay.name} (ID ${programDay.id})`);
console.log(`URL to test: http://192.168.178.48:8081/workout?programDayId=${programDay.id}&date=${today}`);
console.log('\n✅ All data looks good - workout flow should work');
