/**
 * Workout Service
 *
 * Business logic for workout session management:
 * - Creating new workout sessions
 * - Listing workouts with optional date filtering
 * - Updating workout status and metrics
 */

import {
  stmtCreateWorkout,
  stmtGetWorkoutsByUser,
  stmtGetWorkoutsByUserDateRange,
  stmtUpdateWorkoutStatus,
  db,
} from '../database/db.js';

/**
 * Workout interface matching database schema + program day info
 */
export interface Workout {
  id: number;
  user_id: number;
  program_day_id: number;
  date: string; // ISO format: YYYY-MM-DD
  started_at: number | null;
  completed_at: number | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  total_volume_kg: number | null;
  average_rir: number | null;
  synced: number;
  day_name: string | null; // Program day name (e.g., "Push A (Chest-Focused)")
  day_type: 'strength' | 'vo2max' | null; // Program day type
}

/**
 * Create a new workout session
 *
 * @param userId - ID of the user creating the workout
 * @param programDayId - ID of the program day (e.g., Push A, Pull A)
 * @param date - Date in ISO format (YYYY-MM-DD)
 * @returns The created workout object
 */
export function createWorkout(
  userId: number,
  programDayId: number,
  date: string
): Workout {
  // Validate date format (basic check)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  // Insert workout with default status=not_started
  const result = stmtCreateWorkout.run(userId, programDayId, date);
  const workoutId = result.lastInsertRowid as number;

  // Return the created workout
  const workout = db
    .prepare('SELECT * FROM workouts WHERE id = ?')
    .get(workoutId) as Workout;

  return workout;
}

/**
 * Get exercises for a program day
 *
 * @param programDayId - Program day ID
 * @returns Array of exercises with sets/reps
 */
function getProgramExercises(programDayId: number) {
  return db
    .prepare(
      `SELECT pe.*, e.name as exercise_name
       FROM program_exercises pe
       JOIN exercises e ON pe.exercise_id = e.id
       WHERE pe.program_day_id = ?
       ORDER BY pe.order_index ASC`
    )
    .all(programDayId);
}

/**
 * List workouts for a user with optional date filtering
 * Includes program exercises for each workout
 *
 * @param userId - ID of the user
 * @param startDate - Optional start date filter (YYYY-MM-DD)
 * @param endDate - Optional end date filter (YYYY-MM-DD)
 * @returns Array of workout objects with exercises
 */
export function listWorkouts(
  userId: number,
  startDate?: string,
  endDate?: string
): any[] {
  let workouts: Workout[];

  // If both date filters provided, use date range query
  if (startDate && endDate) {
    workouts = stmtGetWorkoutsByUserDateRange.all(
      userId,
      startDate,
      endDate
    ) as Workout[];
  } else if (startDate) {
    // If only start date, filter in application layer
    const allWorkouts = stmtGetWorkoutsByUser.all(userId) as Workout[];
    workouts = allWorkouts.filter((w) => w.date >= startDate);
  } else if (endDate) {
    // If only end date, filter in application layer
    const allWorkouts = stmtGetWorkoutsByUser.all(userId) as Workout[];
    workouts = allWorkouts.filter((w) => w.date <= endDate);
  } else {
    // No filters, return all workouts
    workouts = stmtGetWorkoutsByUser.all(userId) as Workout[];
  }

  // Attach exercises to each workout
  return workouts.map((workout) => ({
    ...workout,
    exercises: getProgramExercises(workout.program_day_id),
  }));
}

/**
 * Update workout status and metrics
 *
 * @param workoutId - ID of the workout to update
 * @param status - New status (in_progress, completed, cancelled)
 * @param totalVolumeKg - Optional total volume in kg (sets × reps × weight)
 * @param averageRir - Optional average RIR across all sets
 * @returns The updated workout object
 */
export function updateWorkoutStatus(
  workoutId: number,
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled',
  totalVolumeKg?: number,
  averageRir?: number
): Workout {
  // Calculate completed_at timestamp if status is completed
  const completedAt = status === 'completed' ? Date.now() : null;

  // Update workout
  stmtUpdateWorkoutStatus.run(
    status,
    completedAt,
    totalVolumeKg ?? null,
    averageRir ?? null,
    workoutId
  );

  // Return updated workout
  const workout = db
    .prepare('SELECT * FROM workouts WHERE id = ?')
    .get(workoutId) as Workout;

  return workout;
}
