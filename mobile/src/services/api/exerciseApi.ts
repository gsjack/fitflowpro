import { getAuthenticatedClient } from './authApi';

/**
 * Exercise API Client for FitFlow Pro
 *
 * Provides API calls for exercise library endpoints:
 * - List exercises with filtering
 * - Get exercise details by ID
 *
 * All endpoints require JWT authentication.
 */

/**
 * Exercise object returned from API
 */
export interface Exercise {
  id: number;
  name: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  equipment: string;
  movement_pattern: 'compound' | 'isolation';
  difficulty?: string;
  default_sets: number;
  default_reps: string;
  default_rir: number;
  description?: string;
}

/**
 * Exercise filters for GET /api/exercises
 */
export interface ExerciseFilters {
  muscle_group?: string;
  equipment?: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight';
  movement_pattern?: 'compound' | 'isolation';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Response from GET /api/exercises
 */
export interface GetExercisesResponse {
  exercises: Exercise[];
  count: number;
}

/**
 * Get exercises with optional filtering
 *
 * @param filters - Optional filters for muscle group, equipment, movement pattern, difficulty
 * @returns Array of exercises matching filters and total count
 * @throws Error if API call fails (401 unauthorized, 400 invalid filter)
 *
 * @example
 * const { exercises, count } = await getExercises({ muscle_group: 'chest', equipment: 'barbell' });
 */
export async function getExercises(filters?: ExerciseFilters): Promise<GetExercisesResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.get<GetExercisesResponse>('/api/exercises', {
    params: filters,
  });

  return response.data;
}

/**
 * Get exercise details by ID
 *
 * @param id - Exercise ID
 * @returns Exercise object with full details
 * @throws Error if API call fails (401 unauthorized, 404 not found, 400 invalid ID)
 *
 * @example
 * const exercise = await getExerciseById(1);
 * console.log(exercise.name); // "Barbell Bench Press"
 */
export async function getExerciseById(id: number): Promise<Exercise> {
  const client = await getAuthenticatedClient();

  const response = await client.get<Exercise>(`/api/exercises/${id}`);

  return response.data;
}
