/**
 * Program Service
 *
 * Manages training program creation and configuration.
 * Provides default 6-day Renaissance Periodization split for new users.
 */

import { db } from '../database/db.js';
import type { Statement } from 'better-sqlite3';

/**
 * Program day configuration
 */
interface ProgramDay {
  day_of_week: number;
  day_name: string;
  day_type: 'strength' | 'vo2max';
}

/**
 * Exercise configuration for program
 */
interface ProgramExercise {
  program_day_id: number;
  exercise_id: number;
  order_index: number;
  sets: number;
  reps: string;
  rir: number;
}

/**
 * Default 6-day program structure
 */
const DEFAULT_PROGRAM_DAYS: ProgramDay[] = [
  { day_of_week: 1, day_name: 'Push A (Chest-Focused)', day_type: 'strength' },
  { day_of_week: 2, day_name: 'Pull A (Lat-Focused)', day_type: 'strength' },
  { day_of_week: 3, day_name: 'VO2max A (Norwegian 4x4)', day_type: 'vo2max' },
  { day_of_week: 4, day_name: 'Push B (Shoulder-Focused)', day_type: 'strength' },
  { day_of_week: 5, day_name: 'Pull B (Rhomboid/Trap-Focused)', day_type: 'strength' },
  { day_of_week: 6, day_name: 'VO2max B (30/30 or Zone 2)', day_type: 'vo2max' },
];

/**
 * Default exercise template for 6-day split
 * Exercise IDs are from the pre-seeded exercises table
 */
const getProgramExerciseTemplate = (programDayIds: number[]): ProgramExercise[] => {
  // Ensure we have all 6 program day IDs
  if (programDayIds.length !== 6) {
    throw new Error('Expected 6 program day IDs');
  }

  const day1 = programDayIds[0]!;
  const day2 = programDayIds[1]!;
  // day3 and day6 are VO2max days with no exercises, so we don't need them here
  const day4 = programDayIds[3]!;
  const day5 = programDayIds[4]!;

  return [
    // Day 1: Push A (Chest-Focused)
    { program_day_id: day1, exercise_id: 25, order_index: 1, sets: 3, reps: '6-8', rir: 3 }, // Barbell Back Squat
    { program_day_id: day1, exercise_id: 1, order_index: 2, sets: 4, reps: '6-8', rir: 3 },  // Barbell Bench Press
    { program_day_id: day1, exercise_id: 5, order_index: 3, sets: 3, reps: '8-10', rir: 2 }, // Incline Dumbbell Press
    { program_day_id: day1, exercise_id: 7, order_index: 4, sets: 3, reps: '12-15', rir: 1 }, // Cable Flyes
    { program_day_id: day1, exercise_id: 20, order_index: 5, sets: 4, reps: '12-15', rir: 1 }, // Lateral Raises
    { program_day_id: day1, exercise_id: 49, order_index: 6, sets: 3, reps: '15-20', rir: 0 }, // Tricep Pushdown

    // Day 2: Pull A (Lat-Focused)
    { program_day_id: day2, exercise_id: 68, order_index: 1, sets: 3, reps: '5-8', rir: 3 }, // Conventional Deadlift
    { program_day_id: day2, exercise_id: 14, order_index: 2, sets: 4, reps: '5-8', rir: 3 }, // Pull-Ups
    { program_day_id: day2, exercise_id: 10, order_index: 3, sets: 4, reps: '8-10', rir: 2 }, // Barbell Row
    { program_day_id: day2, exercise_id: 13, order_index: 4, sets: 3, reps: '12-15', rir: 1 }, // Seated Cable Row
    { program_day_id: day2, exercise_id: 16, order_index: 5, sets: 3, reps: '15-20', rir: 0 }, // Face Pulls
    { program_day_id: day2, exercise_id: 39, order_index: 6, sets: 3, reps: '8-12', rir: 1 }, // Barbell Curl

    // Day 3: VO2max A (Norwegian 4x4) - no exercises

    // Day 4: Push B (Shoulder-Focused)
    { program_day_id: day4, exercise_id: 27, order_index: 1, sets: 3, reps: '8-12', rir: 3 }, // Leg Press
    { program_day_id: day4, exercise_id: 18, order_index: 2, sets: 4, reps: '5-8', rir: 3 }, // Overhead Press
    { program_day_id: day4, exercise_id: 4, order_index: 3, sets: 3, reps: '8-12', rir: 2 }, // Dumbbell Bench Press
    { program_day_id: day4, exercise_id: 21, order_index: 4, sets: 4, reps: '15-20', rir: 0 }, // Cable Lateral Raises
    { program_day_id: day4, exercise_id: 22, order_index: 5, sets: 3, reps: '15-20', rir: 0 }, // Rear Delt Flyes
    { program_day_id: day4, exercise_id: 46, order_index: 6, sets: 3, reps: '8-10', rir: 2 }, // Close-Grip Bench Press

    // Day 5: Pull B (Rhomboid/Trap-Focused)
    { program_day_id: day5, exercise_id: 26, order_index: 1, sets: 3, reps: '6-8', rir: 3 }, // Front Squat
    { program_day_id: day5, exercise_id: 10, order_index: 2, sets: 4, reps: '6-8', rir: 3 }, // Barbell Row
    { program_day_id: day5, exercise_id: 12, order_index: 3, sets: 3, reps: '10-12', rir: 2 }, // Lat Pulldown (wide grip)
    { program_day_id: day5, exercise_id: 62, order_index: 4, sets: 4, reps: '12-15', rir: 1 }, // Barbell Shrugs
    { program_day_id: day5, exercise_id: 22, order_index: 5, sets: 3, reps: '15-20', rir: 0 }, // Rear Delt Flyes
    { program_day_id: day5, exercise_id: 41, order_index: 6, sets: 3, reps: '10-15', rir: 1 }, // Hammer Curl

    // Day 6: VO2max B (30/30 or Zone 2) - no exercises
  ];
};

/**
 * Create default 6-day Renaissance Periodization program for a new user
 *
 * @param userId - The user ID to create the program for
 * @returns The created program ID
 * @throws Error if program creation fails
 */
export function createDefaultProgram(userId: number): number {
  // Execute as a single transaction for atomicity
  const createProgram = db.transaction(() => {
    const now = Date.now();

    // 1. Create the program
    const stmtCreateProgram: Statement = db.prepare(`
      INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const programResult = stmtCreateProgram.run(
      userId,
      'Renaissance Periodization 6-Day Split',
      1,
      'mev',
      now
    );

    const programId = programResult.lastInsertRowid as number;

    // 2. Create the 6 program days
    const stmtCreateProgramDay: Statement = db.prepare(`
      INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
      VALUES (?, ?, ?, ?)
    `);

    const programDayIds: number[] = [];

    for (const day of DEFAULT_PROGRAM_DAYS) {
      const dayResult = stmtCreateProgramDay.run(
        programId,
        day.day_of_week,
        day.day_name,
        day.day_type
      );
      programDayIds.push(dayResult.lastInsertRowid as number);
    }

    // 3. Create program exercises for all strength days
    const stmtCreateProgramExercise: Statement = db.prepare(`
      INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const exercises = getProgramExerciseTemplate(programDayIds);

    for (const exercise of exercises) {
      stmtCreateProgramExercise.run(
        exercise.program_day_id,
        exercise.exercise_id,
        exercise.order_index,
        exercise.sets,
        exercise.reps,
        exercise.rir
      );
    }

    // 4. Create today's workout for the user
    // Determine which day of week it is (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayOfWeek = new Date().getDay();

    // Map day of week to program_day_id
    // Sunday (0) -> Saturday's workout (index 5, VO2max B)
    // Monday (1) -> Push A (index 0)
    // etc.
    const dayMapping = [5, 0, 1, 2, 3, 4, 5]; // Sunday maps to Saturday's workout
    const todayProgramDayId = programDayIds[dayMapping[dayOfWeek]!]!;

    const stmtCreateWorkout: Statement = db.prepare(`
      INSERT INTO workouts (user_id, program_day_id, date, status, synced)
      VALUES (?, ?, date('now'), 'not_started', 0)
    `);

    stmtCreateWorkout.run(userId, todayProgramDayId);

    return programId;
  });

  return createProgram();
}

/**
 * Get program details for a user
 *
 * @param userId - The user ID
 * @returns Program details or null if no program exists
 */
export function getUserProgram(userId: number): any | null {
  const stmt = db.prepare(`
    SELECT * FROM programs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
  `);

  return stmt.get(userId) || null;
}

/**
 * Get program days for a program
 *
 * @param programId - The program ID
 * @returns Array of program days
 */
export function getProgramDays(programId: number): any[] {
  const stmt = db.prepare(`
    SELECT * FROM program_days WHERE program_id = ? ORDER BY day_of_week
  `);

  return stmt.all(programId);
}

/**
 * Get exercises for a program day
 *
 * @param programDayId - The program day ID
 * @returns Array of program exercises with exercise details
 */
export function getProgramDayExercises(programDayId: number): any[] {
  const stmt = db.prepare(`
    SELECT
      pe.*,
      e.name as exercise_name,
      e.muscle_groups,
      e.equipment
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.program_day_id = ?
    ORDER BY pe.order_index
  `);

  return stmt.all(programDayId);
}
