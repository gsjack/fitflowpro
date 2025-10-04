/**
 * Exercise Service
 *
 * Handles exercise library filtering and retrieval for program planning
 */

import { db } from '../database/db.js';

/**
 * Exercise entity with typed fields
 */
export interface Exercise {
  id: number;
  name: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[]; // Parsed from JSON
  equipment: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight';
  movement_pattern: 'compound' | 'isolation';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  default_sets: number;
  default_reps: string;
  default_rir: number;
  description: string;
  video_url?: string; // YouTube demonstration video URL
}

/**
 * Exercise filters
 */
export interface ExerciseFilters {
  muscle_group?: string;
  equipment?: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight';
  movement_pattern?: 'compound' | 'isolation';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Valid muscle groups for validation
 */
const VALID_MUSCLE_GROUPS = [
  'chest',
  'back', // Alias for lats/mid_back exercises
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

/**
 * Get exercises with optional filtering
 *
 * @param filters - Optional filters for muscle_group, equipment, movement_pattern, difficulty
 * @returns Array of exercises matching filters
 */
export function getExercises(filters: ExerciseFilters = {}): Exercise[] {
  // Validate muscle_group if provided
  if (filters.muscle_group && !VALID_MUSCLE_GROUPS.includes(filters.muscle_group)) {
    throw new Error(
      `Invalid muscle_group: ${filters.muscle_group}. Valid options: ${VALID_MUSCLE_GROUPS.join(', ')}`
    );
  }

  // Build WHERE clause dynamically
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Filter by muscle group (check both primary and secondary)
  if (filters.muscle_group) {
    // Handle "back" as an alias for lats/mid_back exercises
    if (filters.muscle_group === 'back') {
      conditions.push(
        '(primary_muscle_group IN (?, ?) OR secondary_muscle_groups LIKE ? OR secondary_muscle_groups LIKE ?)'
      );
      params.push('lats', 'mid_back', '%"lats"%', '%"mid_back"%');
    } else {
      conditions.push('(primary_muscle_group = ? OR secondary_muscle_groups LIKE ?)');
      params.push(filters.muscle_group);
      params.push(`%"${filters.muscle_group}"%`); // JSON array contains check
    }
  }

  // Filter by equipment
  if (filters.equipment) {
    conditions.push('equipment = ?');
    params.push(filters.equipment);
  }

  // Filter by movement pattern
  if (filters.movement_pattern) {
    conditions.push('movement_pattern = ?');
    params.push(filters.movement_pattern);
  }

  // Filter by difficulty
  if (filters.difficulty) {
    conditions.push('difficulty = ?');
    params.push(filters.difficulty);
  }

  // Build SQL query
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

  // Execute query
  const rows = db.prepare(sql).all(...params) as any[];

  // Parse secondary_muscle_groups JSON for each exercise
  return rows.map((row) => ({
    ...row,
    secondary_muscle_groups: JSON.parse(row.secondary_muscle_groups || '[]'),
  }));
}

/**
 * Get exercise by ID
 *
 * @param id - Exercise ID
 * @returns Exercise details or undefined if not found
 */
export function getExerciseById(id: number): Exercise | undefined {
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

  const row = db.prepare(sql).get(id) as any;

  if (!row) {
    return undefined;
  }

  // Parse secondary_muscle_groups JSON
  return {
    ...row,
    secondary_muscle_groups: JSON.parse(row.secondary_muscle_groups || '[]'),
  };
}

/**
 * Set performance data from previous workout
 */
export interface SetPerformance {
  weight_kg: number;
  reps: number;
  rir: number;
}

/**
 * Last performance data for an exercise
 */
export interface LastPerformance {
  last_workout_date: string;
  sets: SetPerformance[];
  estimated_1rm: number;
}

/**
 * Get last performance for a specific exercise by user
 *
 * Finds the most recent completed workout containing this exercise
 * and returns all sets logged for that exercise with estimated 1RM.
 *
 * @param userId - User ID
 * @param exerciseId - Exercise ID
 * @returns Last performance data or null if no history exists
 */
export function getLastPerformance(userId: number, exerciseId: number): LastPerformance | null {
  // Find the most recent completed workout containing this exercise
  // Exclude in_progress workouts to avoid showing incomplete current session
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

  const lastWorkout = db.prepare(lastWorkoutSql).get(userId, exerciseId) as
    | { id: number; date: string }
    | undefined;

  if (!lastWorkout) {
    return null;
  }

  // Get all sets for this exercise from that workout
  const setsSql = `
    SELECT weight_kg, reps, rir
    FROM sets
    WHERE workout_id = ? AND exercise_id = ?
    ORDER BY set_number ASC
  `;

  const sets = db.prepare(setsSql).all(lastWorkout.id, exerciseId) as SetPerformance[];

  if (sets.length === 0) {
    return null;
  }

  // Calculate estimated 1RM from the best set (highest 1RM estimate)
  // Use Epley formula with RIR adjustment: 1RM = weight × (1 + (reps - rir) / 30)
  let bestOneRM = 0;
  sets.forEach((set) => {
    const oneRM = set.weight_kg * (1 + (set.reps - set.rir) / 30);
    if (oneRM > bestOneRM) {
      bestOneRM = oneRM;
    }
  });

  return {
    last_workout_date: lastWorkout.date,
    sets,
    estimated_1rm: Math.round(bestOneRM * 10) / 10, // Round to 1 decimal place
  };
}
