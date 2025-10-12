import Database from 'better-sqlite3';

const db = new Database('./data/fitflow.db');

// Check exercises used in Oct 7 workout that should have biceps
const bicepsExercises = db.prepare(`
  SELECT DISTINCT
    e.id,
    e.name,
    e.muscle_groups
  FROM sets s
  JOIN workouts w ON s.workout_id = w.id
  JOIN exercises e ON s.exercise_id = e.id
  WHERE w.user_id = 118
    AND w.date = '2025-10-07'
    AND e.muscle_groups LIKE '%bicep%'
`).all();

console.log('Exercises from Oct 7 with "bicep" in muscle_groups:');
bicepsExercises.forEach(ex => {
  console.log(`- ${ex.name}: ${ex.muscle_groups}`);
});

// Check planned exercises for biceps
const program = db.prepare('SELECT id FROM programs WHERE user_id = 118 ORDER BY created_at DESC LIMIT 1').get();

if (program) {
  const planned = db.prepare(`
    SELECT DISTINCT
      e.name,
      e.muscle_groups,
      pe.sets as planned_sets
    FROM program_exercises pe
    JOIN program_days pd ON pe.program_day_id = pd.id
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pd.program_id = ?
      AND e.muscle_groups LIKE '%bicep%'
  `).all(program.id);

  console.log('\nPlanned exercises with "bicep" in muscle_groups:');
  planned.forEach(ex => {
    console.log(`- ${ex.name} (${ex.planned_sets} sets): ${ex.muscle_groups}`);
  });
}

db.close();
