import { getAuthenticatedClient } from './authApi';

/**
 * Program Exercise API Client for FitFlow Pro
 *
 * Provides API calls for managing program exercises:
 * - List exercises with filtering
 * - Add exercise to program day
 * - Update sets/reps/RIR
 * - Remove exercise
 * - Swap exercise with alternative
 * - Reorder exercises (drag-and-drop)
 *
 * All endpoints require JWT authentication.
 * Most operations return volume warnings if changes push muscle groups outside optimal range.
 */

/**
 * Program exercise object
 */
export interface ProgramExercise {
  id: number;
  program_day_id: number;
  exercise_id: number;
  exercise_name: string;
  order_index: number;
  target_sets: number;
  target_rep_range: string;
  target_rir: number;
  muscle_groups: string;
  equipment: string;
}

/**
 * Filters for GET /api/program-exercises
 */
export interface ProgramExerciseFilters {
  program_day_id?: number;
  exercise_id?: number;
}

/**
 * Response from GET /api/program-exercises
 */
export interface GetProgramExercisesResponse {
  exercises: ProgramExercise[];
}

/**
 * Request body for POST /api/program-exercises
 */
export interface CreateProgramExerciseRequest {
  program_day_id: number;
  exercise_id: number;
  target_sets: number;
  target_rep_range: string;
  target_rir: number;
  order_index?: number;
}

/**
 * Response from POST /api/program-exercises
 */
export interface CreateProgramExerciseResponse {
  program_exercise_id: number;
  volume_warning?: string;
}

/**
 * Request body for PATCH /api/program-exercises/:id
 */
export interface UpdateProgramExerciseRequest {
  target_sets?: number;
  target_rep_range?: string;
  target_rir?: number;
}

/**
 * Response from PATCH /api/program-exercises/:id
 */
export interface UpdateProgramExerciseResponse {
  updated: true;
  volume_warning?: string;
}

/**
 * Generic response from program exercise mutations (swap, update, etc.)
 */
export type ProgramExerciseResponse =
  | SwapExerciseResponse
  | UpdateProgramExerciseResponse
  | CreateProgramExerciseResponse;

/**
 * Response from DELETE /api/program-exercises/:id
 */
export interface DeleteProgramExerciseResponse {
  deleted: true;
  volume_warning?: string;
}

/**
 * Response from PUT /api/program-exercises/:id/swap
 */
export interface SwapExerciseResponse {
  swapped: true;
  old_exercise_name: string;
  new_exercise_name: string;
  volume_warning?: string;
}

/**
 * Item in reorder array
 */
export interface ReorderItem {
  program_exercise_id: number;
  new_order_index: number;
}

/**
 * Response from PATCH /api/program-exercises/batch-reorder
 */
export interface ReorderExercisesResponse {
  reordered: true;
}

/**
 * Get program exercises with optional filtering
 *
 * @param filters - Optional filters for program_day_id or exercise_id
 * @returns Array of program exercises matching filters
 * @throws Error if API call fails (401 unauthorized, 403 forbidden)
 *
 * @example
 * // Get all exercises for a specific program day
 * const { exercises } = await getProgramExercises({ program_day_id: 1 });
 * console.log(exercises.length); // 5
 */
export async function getProgramExercises(
  filters?: ProgramExerciseFilters
): Promise<GetProgramExercisesResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.get<GetProgramExercisesResponse>('/api/program-exercises', {
    params: filters,
  });

  return response.data;
}

/**
 * Add exercise to program day
 *
 * Validates target_sets (1-10), target_rep_range (N-M format), target_rir (0-4).
 * Returns volume warning if addition pushes muscle group above MRV or below MEV.
 *
 * @param data - Exercise data (program_day_id, exercise_id, sets, reps, RIR, optional order_index)
 * @returns Created program exercise ID and optional volume warning
 * @throws Error if API call fails (401 unauthorized, 404 not found, 400 validation error)
 *
 * @example
 * const result = await addProgramExercise({
 *   program_day_id: 1,
 *   exercise_id: 5,
 *   target_sets: 4,
 *   target_rep_range: "8-12",
 *   target_rir: 2,
 * });
 * console.log(result.program_exercise_id); // 42
 * if (result.volume_warning) {
 *   console.warn(result.volume_warning); // "Chest volume now above MRV (24 sets > 22)"
 * }
 */
export async function addProgramExercise(
  data: CreateProgramExerciseRequest
): Promise<CreateProgramExerciseResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.post<CreateProgramExerciseResponse>('/api/program-exercises', data);

  return response.data;
}

/**
 * Update program exercise sets/reps/RIR
 *
 * Partially updates target_sets, target_rep_range, or target_rir.
 * Returns volume warning if changes push muscle group outside optimal range.
 *
 * @param id - Program exercise ID to update
 * @param data - Partial updates (any combination of sets/reps/RIR)
 * @returns Confirmation and optional volume warning
 * @throws Error if API call fails (401 unauthorized, 404 not found, 400 validation error)
 *
 * @example
 * const result = await updateProgramExercise(42, { target_sets: 5 });
 * if (result.volume_warning) {
 *   console.warn(result.volume_warning); // "Chest volume now above MRV"
 * }
 */
export async function updateProgramExercise(
  id: number,
  data: UpdateProgramExerciseRequest
): Promise<UpdateProgramExerciseResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.patch<UpdateProgramExerciseResponse>(
    `/api/program-exercises/${id}`,
    data
  );

  return response.data;
}

/**
 * Remove exercise from program day
 *
 * Returns volume warning if removal drops muscle group below MEV.
 *
 * @param id - Program exercise ID to delete
 * @returns Confirmation and optional volume warning
 * @throws Error if API call fails (401 unauthorized, 404 not found)
 *
 * @example
 * const result = await deleteProgramExercise(42);
 * if (result.volume_warning) {
 *   console.warn(result.volume_warning); // "Chest volume now below MEV (6 sets < 8)"
 * }
 */
export async function deleteProgramExercise(id: number): Promise<DeleteProgramExerciseResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.delete<DeleteProgramExerciseResponse>(
    `/api/program-exercises/${id}`
  );

  return response.data;
}

/**
 * Swap exercise with compatible alternative
 *
 * Replaces exercise_id while preserving order_index, sets, reps, RIR.
 * Backend validates that new exercise targets same primary muscle group.
 *
 * @param id - Program exercise ID to swap
 * @param newExerciseId - Replacement exercise ID
 * @returns Swap confirmation with old/new exercise names and optional volume warning
 * @throws Error if API call fails (401 unauthorized, 404 not found, 400 incompatible exercises)
 *
 * @example
 * // Swap barbell bench press (ID 1) with dumbbell bench press (ID 2)
 * const result = await swapExercise(42, 2);
 * console.log(result.old_exercise_name); // "Barbell Bench Press"
 * console.log(result.new_exercise_name); // "Dumbbell Bench Press"
 */
export async function swapExercise(
  id: number,
  newExerciseId: number
): Promise<SwapExerciseResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.put<SwapExerciseResponse>(`/api/program-exercises/${id}/swap`, {
    new_exercise_id: newExerciseId,
  });

  return response.data;
}

/**
 * Reorder exercises within a program day (batch update)
 *
 * Atomically updates order_index for multiple exercises.
 * Typically used for drag-and-drop reordering in UI.
 *
 * @param programDayId - Program day ID containing exercises
 * @param newOrder - Array of {program_exercise_id, new_order_index} mappings
 * @returns Confirmation of reorder
 * @throws Error if API call fails (401 unauthorized, 404 not found, 403 forbidden, 400 validation)
 *
 * @example
 * // Move exercise 42 to position 0, exercise 43 to position 1, exercise 44 to position 2
 * await reorderExercises(1, [
 *   { program_exercise_id: 42, new_order_index: 0 },
 *   { program_exercise_id: 43, new_order_index: 1 },
 *   { program_exercise_id: 44, new_order_index: 2 },
 * ]);
 */
export async function reorderExercises(
  programDayId: number,
  newOrder: ReorderItem[]
): Promise<ReorderExercisesResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.patch<ReorderExercisesResponse>(
    '/api/program-exercises/batch-reorder',
    {
      program_day_id: programDayId,
      exercise_order: newOrder,
    }
  );

  return response.data;
}
