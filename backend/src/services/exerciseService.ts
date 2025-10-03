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
  const params: any[] = [];

  // Filter by muscle group (check both primary and secondary)
  if (filters.muscle_group) {
    conditions.push(
      '(primary_muscle_group = ? OR secondary_muscle_groups LIKE ?)'
    );
    params.push(filters.muscle_group);
    params.push(`%"${filters.muscle_group}"%`); // JSON array contains check
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
      description
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
      description
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
