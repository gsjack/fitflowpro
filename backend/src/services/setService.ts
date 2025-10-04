/**
 * Set Logging Service
 *
 * Business logic for exercise set tracking:
 * - Logging individual sets with weight, reps, RIR
 * - Deduplication via localId for idempotent sync
 * - 1RM calculation using Epley formula with RIR adjustment
 */

import { stmtLogSet, db, calculateOneRepMax } from '../database/db.js';

/**
 * Set interface matching database schema
 */
export interface Set {
  id: number;
  workout_id: number;
  exercise_id: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  rir: number;
  timestamp: number;
  notes: string | null;
  synced: number;
}

/**
 * Set logging response (for sync confirmation)
 */
export interface LogSetResponse {
  id: number;
  localId: number | null;
  synced: boolean;
  estimated_1rm: number;
  weight_kg: number;
  reps: number;
  rir: number;
}

/**
 * Log a new exercise set
 *
 * Implements idempotent sync: if localId exists for this workout,
 * returns existing set instead of creating duplicate.
 *
 * @param workoutId - ID of the workout session
 * @param exerciseId - ID of the exercise being performed
 * @param setNumber - Set number within the workout (1, 2, 3, etc.)
 * @param weightKg - Weight lifted in kilograms (0-500)
 * @param reps - Number of repetitions completed (1-50)
 * @param rir - Reps in Reserve (0-4)
 * @param timestamp - UTC milliseconds when set was completed
 * @param localId - Optional local ID from mobile app for deduplication
 * @param notes - Optional notes about the set (max 500 chars)
 * @returns LogSetResponse with id, localId, and synced status
 */
export function logSet(
  workoutId: number,
  exerciseId: number,
  setNumber: number,
  weightKg: number,
  reps: number,
  rir: number,
  timestamp: number,
  localId?: number,
  notes?: string
): LogSetResponse {
  // Validate input ranges (per FR-005)
  if (weightKg < 0 || weightKg > 500) {
    throw new Error('Weight must be between 0 and 500 kg');
  }
  if (reps < 1 || reps > 50) {
    throw new Error('Reps must be between 1 and 50');
  }
  if (rir < 0 || rir > 4) {
    throw new Error('RIR must be between 0 and 4');
  }

  // Validate notes length
  if (notes && notes.length > 500) {
    throw new Error('Notes must be 500 characters or less');
  }

  // Deduplication check: if localId provided, check if set already exists
  // This enables idempotent sync from mobile app
  if (localId) {
    const existingSet = db
      .prepare(
        `SELECT id, weight_kg, reps, rir FROM sets
         WHERE workout_id = ? AND id = ?`
      )
      .get(workoutId, localId) as
      | { id: number; weight_kg: number; reps: number; rir: number }
      | undefined;

    if (existingSet) {
      // Set already exists, return existing ID with calculated 1RM
      const estimated1RM = calculateOneRepMax(
        existingSet.weight_kg,
        existingSet.reps,
        existingSet.rir
      );
      return {
        id: existingSet.id,
        localId: localId,
        synced: true,
        estimated_1rm: estimated1RM,
        weight_kg: existingSet.weight_kg,
        reps: existingSet.reps,
        rir: existingSet.rir,
      };
    }
  }

  // Insert new set with synced=1 (server is source of truth)
  const result = stmtLogSet.run(
    workoutId,
    exerciseId,
    setNumber,
    weightKg,
    reps,
    rir,
    timestamp,
    notes ?? null
  );

  const setId = result.lastInsertRowid as number;

  // Calculate estimated 1RM for analytics (Epley formula with RIR)
  // Formula: 1RM = weight × (1 + (reps - rir) / 30)
  const estimated1RM = calculateOneRepMax(weightKg, reps, rir);

  // Log for performance monitoring (should be < 5ms per CLAUDE.md)
  console.log(
    `Set logged: workout=${workoutId}, exercise=${exerciseId}, ` +
      `${weightKg}kg × ${reps} @ RIR ${rir} (Est. 1RM: ${estimated1RM.toFixed(1)}kg)`
  );

  return {
    id: setId,
    localId: localId ?? null,
    synced: true,
    estimated_1rm: estimated1RM,
    weight_kg: weightKg,
    reps: reps,
    rir: rir,
  };
}

/**
 * Get all sets for a workout
 *
 * @param workoutId - ID of the workout session
 * @returns Array of sets
 */
export function getSetsForWorkout(workoutId: number): Set[] {
  const sets = db
    .prepare(
      `SELECT id, workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, notes, synced
       FROM sets
       WHERE workout_id = ?
       ORDER BY id ASC`
    )
    .all(workoutId) as Set[];

  return sets;
}
