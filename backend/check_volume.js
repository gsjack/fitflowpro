import Database from 'better-sqlite3';

const db = new Database('./data/fitflow.db');

// Calculate current week boundaries (ISO week, Monday = start)
const now = new Date('2025-10-10'); // Today's date from context
const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since last Monday
const monday = new Date(now);
monday.setDate(now.getDate() - daysFromMonday);
monday.setHours(0, 0, 0, 0);

const sunday = new Date(monday);
sunday.setDate(monday.getDate() + 6);
sunday.setHours(23, 59, 59, 999);

const week_start = monday.toISOString().split('T')[0];
const week_end = sunday.toISOString().split('T')[0];

console.log('Current week boundaries:');
console.log('week_start:', week_start);
console.log('week_end:', week_end);

// Check what workouts exist for user 118 in this week
const workouts = db.prepare(`
  SELECT id, date, status
  FROM workouts
  WHERE user_id = 118
    AND date >= ?
    AND date <= ?
  ORDER BY date
`).all(week_start, week_end);

console.log('\nWorkouts in current week for user 118:');
console.log(workouts);

// Run the exact volume query
const completedQuery = db.prepare(`
  SELECT
    mg.value as muscle_group,
    COUNT(s.id) as completed_sets
  FROM sets s
  JOIN workouts w ON s.workout_id = w.id
  JOIN exercises e ON s.exercise_id = e.id
  JOIN json_each(e.muscle_groups) mg
  WHERE w.user_id = ?
    AND w.status = 'completed'
    AND w.date >= ?
    AND w.date <= ?
  GROUP BY mg.value
`);

const completedResults = completedQuery.all(118, week_start, week_end);

console.log('\nCompleted sets by muscle group:');
console.log(completedResults);

const biceps = completedResults.find(r => r.muscle_group === 'biceps');
console.log('\nBiceps specifically:');
console.log(biceps || 'NOT FOUND');

db.close();
