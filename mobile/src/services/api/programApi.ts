import { getAuthenticatedClient } from './authApi';

/**
 * Program API Client for FitFlow Pro
 *
 * Provides API calls for training program management:
 * - Get user's active program with full structure
 * - Advance mesocycle phase with volume adjustment
 * - Get program volume analysis per muscle group
 *
 * All endpoints require JWT authentication.
 */

/**
 * Program exercise in program day
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
 * Program day with exercises
 */
export interface ProgramDay {
  id: number;
  program_id: number;
  day_of_week: number;
  day_name: string;
  day_type: 'strength' | 'vo2max';
  exercises: ProgramExercise[];
}

/**
 * Full program structure with nested days and exercises
 */
export interface Program {
  id: number;
  user_id: number;
  name: string;
  mesocycle_week: number;
  mesocycle_phase: 'mev' | 'mav' | 'mrv' | 'deload';
  created_at: number;
  program_days: ProgramDay[];
}

/**
 * Response from PATCH /api/programs/:id/advance-phase
 */
export interface AdvancePhaseResponse {
  previous_phase: string;
  new_phase: string;
  volume_multiplier: number;
  exercises_updated: number;
}

/**
 * Muscle group volume data point
 */
export interface MuscleGroupVolume {
  muscle_group: string;
  planned_sets: number;
  mev: number;
  mav: number;
  mrv: number;
  zone: 'below_mev' | 'adequate' | 'optimal' | 'above_mrv';
}

/**
 * Volume warning for muscle group
 */
export interface VolumeWarning {
  muscle_group: string;
  issue: 'below_mev' | 'above_mrv';
  current_volume: number;
  threshold: number;
}

/**
 * Program volume analysis response
 */
export interface VolumeAnalysis {
  muscle_groups: MuscleGroupVolume[];
  warnings: VolumeWarning[];
}

/**
 * Create a new default program for the authenticated user
 *
 * Creates a 6-day Renaissance Periodization split with pre-configured exercises.
 * Starting phase: MEV (Minimum Effective Volume)
 *
 * @returns Full program structure with program days and exercises
 * @throws Error if API call fails (401 unauthorized, 409 user already has program)
 *
 * @example
 * const program = await createProgram();
 * console.log(program.mesocycle_phase); // "mev"
 * console.log(program.program_days.length); // 6
 */
export async function createProgram(): Promise<Program> {
  const client = await getAuthenticatedClient();

  const response = await client.post<Program>('/api/programs');

  return response.data;
}

/**
 * Get the authenticated user's active program with full structure
 *
 * Returns the program with nested program days and exercises.
 * Each program day includes all exercises in order with target sets/reps/RIR.
 *
 * @returns Full program structure
 * @throws Error if API call fails (401 unauthorized, 404 no program found)
 *
 * @example
 * const program = await getUserProgram();
 * console.log(program.mesocycle_phase); // "mav"
 * console.log(program.program_days[0].exercises.length); // 5
 */
export async function getUserProgram(): Promise<Program> {
  const client = await getAuthenticatedClient();

  const response = await client.get<Program>('/api/programs');

  return response.data;
}

/**
 * Advance program to next mesocycle phase with automatic volume adjustment
 *
 * Phase progression: mev → mav → mrv → deload → mev (repeats)
 * Volume multipliers:
 * - MEV → MAV: 1.2x (+20%)
 * - MAV → MRV: 1.15x (+15%)
 * - MRV → Deload: 0.5x (-50%)
 * - Deload → MEV: 2.0x (reset to baseline)
 *
 * @param programId - Program ID to advance
 * @param options - Optional: manual mode and target phase
 * @param options.manual - If true, allows manual phase selection
 * @param options.target_phase - Target phase (required if manual=true)
 * @returns Phase transition details (previous, new phase, multiplier, exercises updated)
 * @throws Error if API call fails (401 unauthorized, 404 program not found, 400 validation error)
 *
 * @example
 * // Automatic progression (mav → mrv)
 * const result = await advancePhase(1);
 * console.log(result.new_phase); // "mrv"
 * console.log(result.volume_multiplier); // 1.15
 *
 * // Manual progression (force deload)
 * const result = await advancePhase(1, { manual: true, target_phase: 'deload' });
 */
export async function advancePhase(
  programId: number,
  options?: { manual?: boolean; target_phase?: 'mev' | 'mav' | 'mrv' | 'deload' }
): Promise<AdvancePhaseResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.patch<AdvancePhaseResponse>(
    `/api/programs/${programId}/advance-phase`,
    options || {}
  );

  return response.data;
}

/**
 * Get program volume analysis per muscle group
 *
 * Analyzes planned weekly volume per muscle group and compares against
 * MEV/MAV/MRV landmarks. Returns volume zones and warnings for muscle groups
 * outside optimal range.
 *
 * Zones:
 * - below_mev: Planned sets < MEV (insufficient for growth)
 * - adequate: MEV ≤ planned < MAV (adequate stimulus)
 * - optimal: MAV ≤ planned ≤ MRV (optimal range)
 * - above_mrv: Planned > MRV (risk of overtraining)
 *
 * @param programId - Program ID to analyze
 * @returns Volume analysis with muscle groups and warnings
 * @throws Error if API call fails (401 unauthorized, 404 program not found)
 *
 * @example
 * const analysis = await getProgramVolume(1);
 * const chestVolume = analysis.muscle_groups.find(mg => mg.muscle_group === 'chest');
 * console.log(chestVolume.zone); // "optimal"
 * console.log(analysis.warnings.length); // 2 (e.g., biceps below MEV, quads above MRV)
 */
export async function getProgramVolume(programId: number): Promise<VolumeAnalysis> {
  const client = await getAuthenticatedClient();

  const response = await client.get<VolumeAnalysis>(`/api/programs/${programId}/volume`);

  return response.data;
}
