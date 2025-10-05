import { db } from '../database/db.js';
import { VALID_MUSCLE_GROUPS } from '../utils/constants.js';
import { calculateOneRepMax, roundToDecimals } from '../utils/calculations.js';
export function getExercises(filters = {}) {
    if (filters.muscle_group &&
        !VALID_MUSCLE_GROUPS.includes(filters.muscle_group)) {
        throw new Error(`Invalid muscle_group: ${filters.muscle_group}. Valid options: ${VALID_MUSCLE_GROUPS.join(', ')}`);
    }
    const conditions = [];
    const params = [];
    if (filters.muscle_group) {
        if (filters.muscle_group === 'back') {
            conditions.push('(primary_muscle_group IN (?, ?) OR secondary_muscle_groups LIKE ? OR secondary_muscle_groups LIKE ?)');
            params.push('lats', 'mid_back', '%"lats"%', '%"mid_back"%');
        }
        else {
            conditions.push('(primary_muscle_group = ? OR secondary_muscle_groups LIKE ?)');
            params.push(filters.muscle_group);
            params.push(`%"${filters.muscle_group}"%`);
        }
    }
    if (filters.equipment) {
        conditions.push('equipment = ?');
        params.push(filters.equipment);
    }
    if (filters.movement_pattern) {
        conditions.push('movement_pattern = ?');
        params.push(filters.movement_pattern);
    }
    if (filters.difficulty) {
        conditions.push('difficulty = ?');
        params.push(filters.difficulty);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
    SELECT
      id,
      name,
      primary_muscle_group,
      secondary_muscle_groups,
      equipment,
      movement_pattern,
      difficulty,
      default_sets,
      default_reps,
      default_rir,
      description,
      video_url
    FROM exercises
    ${whereClause}
    ORDER BY name
  `;
    const rows = db.prepare(sql).all(...params);
    return rows.map((row) => ({
        ...row,
        secondary_muscle_groups: JSON.parse(row.secondary_muscle_groups || '[]'),
    }));
}
export function getExerciseById(id) {
    const sql = `
    SELECT
      id,
      name,
      primary_muscle_group,
      secondary_muscle_groups,
      equipment,
      movement_pattern,
      difficulty,
      default_sets,
      default_reps,
      default_rir,
      description,
      video_url
    FROM exercises
    WHERE id = ?
  `;
    const row = db.prepare(sql).get(id);
    if (!row) {
        return undefined;
    }
    return {
        ...row,
        secondary_muscle_groups: JSON.parse(row.secondary_muscle_groups || '[]'),
    };
}
export function getLastPerformance(userId, exerciseId) {
    const lastWorkoutSql = `
    SELECT DISTINCT w.id, w.date
    FROM workouts w
    JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = ?
      AND s.exercise_id = ?
      AND w.status = 'completed'
    ORDER BY w.date DESC, w.completed_at DESC
    LIMIT 1
  `;
    const lastWorkout = db.prepare(lastWorkoutSql).get(userId, exerciseId);
    if (!lastWorkout) {
        return null;
    }
    const setsSql = `
    SELECT weight_kg, reps, rir
    FROM sets
    WHERE workout_id = ? AND exercise_id = ?
    ORDER BY set_number ASC
  `;
    const sets = db.prepare(setsSql).all(lastWorkout.id, exerciseId);
    if (sets.length === 0) {
        return null;
    }
    let bestOneRM = 0;
    sets.forEach((set) => {
        const oneRM = calculateOneRepMax(set.weight_kg, set.reps, set.rir);
        if (oneRM > bestOneRM) {
            bestOneRM = oneRM;
        }
    });
    return {
        last_workout_date: lastWorkout.date,
        sets,
        estimated_1rm: roundToDecimals(bestOneRM, 1),
    };
}
//# sourceMappingURL=exerciseService.js.map