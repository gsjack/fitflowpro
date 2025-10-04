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
 * Get last performance for a specific exercise
 *
 * Returns the user's most recent completed performance for this exercise,
 * including all sets logged and estimated 1RM.
 *
 * @param exerciseId - Exercise ID
 * @returns Last performance data or null if no history exists
 * @throws Error if API call fails (401 unauthorized, 500 server error)
 *
 * @example
 * const lastPerformance = await getLastPerformance(1);
 * if (lastPerformance) {
 *   console.log(`Last workout: ${lastPerformance.last_workout_date}`);
 *   console.log(`Sets: ${lastPerformance.sets.length}`);
 *   console.log(`Est 1RM: ${lastPerformance.estimated_1rm}kg`);
 * }
 */
export async function getLastPerformance(exerciseId: number): Promise<LastPerformance | null> {
  const client = await getAuthenticatedClient();

  try {
    const response = await client.get<LastPerformance>(
      `/api/exercises/${exerciseId}/last-performance`
    );

    return response.data;
  } catch (error: any) {
    // 204 No Content means no history - return null
    if (error.response?.status === 204) {
      return null;
    }

    // Re-throw other errors
    throw error;
  }
}
