const Database = require('better-sqlite3');
const db = new Database('./data/fitflow.db');

const user = db.prepare("SELECT * FROM users WHERE id = 1220").get();
console.log('User:', user.username, '(ID', user.id + ')');

const program = db.prepare('SELECT * FROM programs WHERE user_id = ?').get(user.id);
console.log('Program:', program.id, 'phase:', program.mesocycle_phase);

const today = '2025-10-06';
const todayWeekday = 1; // Monday

const programDay = db.prepare(`
  SELECT * FROM program_days
  WHERE program_id = ? AND day_of_week = ?
`).get(program.id, todayWeekday);

console.log('Today (Monday):', programDay.name, '(ID', programDay.id + ')');

const exercises = db.prepare(`
  SELECT pe.*, e.name as exercise_name
  FROM program_exercises pe
  JOIN exercises e ON pe.exercise_id = e.id
  WHERE pe.program_day_id = ?
  ORDER BY pe.order_index
`).all(programDay.id);

console.log('\nExercises:');
exercises.forEach((ex, i) => {
  console.log(`  ${i+1}. ${ex.exercise_name} - ${ex.sets} sets`);
});

console.log('\n=== USE THIS URL ===');
console.log(`http://192.168.178.48:8081/workout?programDayId=${programDay.id}&date=${today}`);
