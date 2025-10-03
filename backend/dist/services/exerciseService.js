import { db } from '../database/db.js';
const VALID_MUSCLE_GROUPS = [
    'chest',
    'lats',
    'mid_back',
    'rear_delts',
    'front_delts',
    'side_delts',
    'triceps',
    'biceps',
    'forearms',
    'quads',
    'hamstrings',
    'glutes',
    'calves',
    'abs',
    'obliques',
];
export function getExercises(filters = {}) {
    if (filters.muscle_group && !VALID_MUSCLE_GROUPS.includes(filters.muscle_group)) {
        throw new Error(`Invalid muscle_group: ${filters.muscle_group}. Valid options: ${VALID_MUSCLE_GROUPS.join(', ')}`);
    }
    const conditions = [];
    const params = [];
    if (filters.muscle_group) {
        conditions.push('(primary_muscle_group = ? OR secondary_muscle_groups LIKE ?)');
        params.push(filters.muscle_group);
        params.push(`%"${filters.muscle_group}"%`);
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
      description
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
      description
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
//# sourceMappingURL=exerciseService.js.map