/**
 * Set Logging Service
 *
 * Business logic for exercise set tracking:
 * - Logging individual sets with weight, reps, RIR
 * - Deduplication via localId for idempotent sync
 * - 1RM calculation using Epley formula with RIR adjustment
 */

import { stmtLogSet, db } from '../database/db.js';
import { calculateOneRepMax, roundToDecimals } from '../utils/calculations.js';
import { validateSetParameters, validateNotes } from '../utils/validation.js';

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
  setNumber: number | undefined,
  weightKg: number,
  reps: number,
  rir: number,
  timestamp: number | string | undefined,
  localId?: number,
  notes?: string
): LogSetResponse {
  // Validate input ranges (per FR-005)
  validateSetParameters(weightKg, reps, rir);
  validateNotes(notes);

  // Default values for optional fields
  // Auto-generate set_number if not provided (count existing sets + 1)
  let finalSetNumber = setNumber;
  if (finalSetNumber === undefined) {
    const existingSets = db
      .prepare('SELECT COUNT(*) as count FROM sets WHERE workout_id = ? AND exercise_id = ?')
      .get(workoutId, exerciseId) as { count: number };
    finalSetNumber = existingSets.count + 1;
  }

  // Default timestamp to current time if not provided, convert ISO string to Unix ms
  let finalTimestamp: number;
  if (timestamp === undefined) {
    finalTimestamp = Date.now();
  } else if (typeof timestamp === 'string') {
    finalTimestamp = new Date(timestamp).getTime();
  } else {
    finalTimestamp = timestamp;
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
    finalSetNumber,
    weightKg,
    reps,
    rir,
    finalTimestamp,
    notes ?? null
  );

  const setId = result.lastInsertRowid as number;

  // Calculate estimated 1RM for analytics (Epley formula with RIR)
  // Formula: 1RM = weight × (1 + (reps - rir) / 30)
  const estimated1RM = calculateOneRepMax(weightKg, reps, rir);

  // Log for performance monitoring (should be < 5ms per CLAUDE.md)
  console.log(
    `Set logged: workout=${workoutId}, exercise=${exerciseId}, ` +
      `${weightKg}kg × ${reps} @ RIR ${rir} (Est. 1RM: ${roundToDecimals(estimated1RM, 1)}kg)`
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
