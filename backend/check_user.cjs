const Database = require('better-sqlite3');
const db = new Database('./data/fitflow.db');

// Get user
const user = db.prepare("SELECT * FROM users WHERE username LIKE '%ccllccll1%'").get();
if (!user) {
  console.log('User not found');
  process.exit(1);
}

console.log('User:', user.id, user.username);

// Get program
const program = db.prepare('SELECT * FROM programs WHERE user_id = ?').get(user.id);
console.log('Program:', program?.id, 'phase:', program?.mesocycle_phase);

// Get today
const today = '2025-10-06';
const todayWeekday = 1; // Monday
console.log('Today:', today, 'weekday:', todayWeekday);

const programDay = db.prepare(`
  SELECT * FROM program_days
  WHERE program_id = ? AND day_of_week = ?
`).get(program.id, todayWeekday);

console.log('Program Day:', programDay?.id, programDay?.name);

// Get exercises
const exercises = db.prepare(`
  SELECT pe.*, e.name as exercise_name
  FROM program_exercises pe
  JOIN exercises e ON pe.exercise_id = e.id
  WHERE pe.program_day_id = ?
  ORDER BY pe.order_index
`).all(programDay?.id || 0);

console.log('\nExercises:', exercises.length);
exercises.forEach((ex, i) => {
  console.log(`  ${i+1}. ${ex.exercise_name} - ${ex.sets} sets @ RIR ${ex.target_rir}`);
});

console.log('\nURL: http://192.168.178.48:8081/workout?programDayId=' + programDay.id + '&date=' + today);
