/**
 * Seed 6-Day Renaissance Periodization Program
 *
 * Seeds the mobile database with Mike Israetel's evidence-based 6-day split.
 * Called once on first app launch after exercise seeding.
 */

import { getDatabase } from './db';

/**
 * Seed the 6-day RP program for a given user
 * @param userId User ID to assign the program to
 * @returns Promise resolving to number of exercises seeded
 */
export async function seedProgram(userId: number): Promise<number> {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Check if program already exists for this user
    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM programs WHERE user_id = ?',
      [userId]
    );

    if (existing && existing.count > 0) {
      console.log('[seedProgram] Program already exists for user', userId);
      return 0;
    }

    const now = Date.now();

    // 1. Create the program
    const programResult = await db.runAsync(
      `INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, 'Renaissance Periodization 6-Day Split', 1, 'mev', now]
    );

    const programId = programResult.lastInsertRowId;

    // 2. Create the 6 program days
    const programDays = [
      { dayOfWeek: 1, name: 'Push A (Chest-Focused)', type: 'strength' },
      { dayOfWeek: 2, name: 'Pull A (Lat-Focused)', type: 'strength' },
      { dayOfWeek: 3, name: 'VO2max A (Norwegian 4x4)', type: 'vo2max' },
      { dayOfWeek: 4, name: 'Push B (Shoulder-Focused)', type: 'strength' },
      { dayOfWeek: 5, name: 'Pull B (Rhomboid/Trap-Focused)', type: 'strength' },
      { dayOfWeek: 6, name: 'VO2max B (30/30 or Zone 2)', type: 'vo2max' },
    ];

    const programDayIds: number[] = [];

    for (const day of programDays) {
      const result = await db.runAsync(
        `INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
         VALUES (?, ?, ?, ?)`,
        [programId, day.dayOfWeek, day.name, day.type]
      );
      programDayIds.push(result.lastInsertRowId);
    }

    // 3. Seed exercises for each day
    // Note: Exercise IDs match the seedExercises.ts file

    // Day 1: Push A (Chest-Focused)
    const pushAExercises = [
      { exerciseId: 25, order: 1, sets: 3, reps: '6-8', rir: 3 }, // Barbell Back Squat
      { exerciseId: 1, order: 2, sets: 4, reps: '6-8', rir: 3 }, // Barbell Bench Press
      { exerciseId: 5, order: 3, sets: 3, reps: '8-10', rir: 2 }, // Incline Dumbbell Press
      { exerciseId: 7, order: 4, sets: 3, reps: '12-15', rir: 1 }, // Cable Flyes
      { exerciseId: 20, order: 5, sets: 4, reps: '12-15', rir: 1 }, // Lateral Raises
      { exerciseId: 49, order: 6, sets: 3, reps: '15-20', rir: 0 }, // Tricep Pushdown
    ];

    // Day 2: Pull A (Lat-Focused)
    const pullAExercises = [
      { exerciseId: 68, order: 1, sets: 3, reps: '5-8', rir: 3 }, // Conventional Deadlift
      { exerciseId: 14, order: 2, sets: 4, reps: '5-8', rir: 3 }, // Pull-Ups
      { exerciseId: 10, order: 3, sets: 4, reps: '8-10', rir: 2 }, // Barbell Row
      { exerciseId: 13, order: 4, sets: 3, reps: '12-15', rir: 1 }, // Seated Cable Row
      { exerciseId: 16, order: 5, sets: 3, reps: '15-20', rir: 0 }, // Face Pulls
      { exerciseId: 39, order: 6, sets: 3, reps: '8-12', rir: 1 }, // Barbell Curl
    ];

    // Day 3: VO2max A (no exercises - interval protocol handled separately)
    const vo2maxAExercises: any[] = [];

    // Day 4: Push B (Shoulder-Focused)
    const pushBExercises = [
      { exerciseId: 27, order: 1, sets: 3, reps: '8-12', rir: 3 }, // Leg Press
      { exerciseId: 18, order: 2, sets: 4, reps: '5-8', rir: 3 }, // Overhead Press
      { exerciseId: 4, order: 3, sets: 3, reps: '8-12', rir: 2 }, // Dumbbell Bench Press
      { exerciseId: 21, order: 4, sets: 4, reps: '15-20', rir: 0 }, // Cable Lateral Raises
      { exerciseId: 22, order: 5, sets: 3, reps: '15-20', rir: 0 }, // Rear Delt Flyes
      { exerciseId: 46, order: 6, sets: 3, reps: '8-10', rir: 2 }, // Close-Grip Bench Press
    ];

    // Day 5: Pull B (Rhomboid/Trap-Focused)
    const pullBExercises = [
      { exerciseId: 26, order: 1, sets: 3, reps: '6-8', rir: 3 }, // Front Squat
      { exerciseId: 10, order: 2, sets: 4, reps: '6-8', rir: 3 }, // Barbell Row (Pendlay style)
      { exerciseId: 12, order: 3, sets: 3, reps: '10-12', rir: 2 }, // Lat Pulldown (wide grip)
      { exerciseId: 62, order: 4, sets: 4, reps: '12-15', rir: 1 }, // Barbell Shrugs
      { exerciseId: 22, order: 5, sets: 3, reps: '15-20', rir: 0 }, // Rear Delt Flyes
      { exerciseId: 41, order: 6, sets: 3, reps: '10-15', rir: 1 }, // Hammer Curl
    ];

    // Day 6: VO2max B (no exercises)
    const vo2maxBExercises: any[] = [];

    const allDayExercises = [
      pushAExercises,
      pullAExercises,
      vo2maxAExercises,
      pushBExercises,
      pullBExercises,
      vo2maxBExercises,
    ];

    let totalExercises = 0;

    for (let i = 0; i < allDayExercises.length; i++) {
      const exercises = allDayExercises[i];
      const programDayId = programDayIds[i];

      for (const ex of exercises) {
        await db.runAsync(
          `INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [programDayId, ex.exerciseId, ex.order, ex.sets, ex.reps, ex.rir]
        );
        totalExercises++;
      }
    }

    // 4. Create today's workout
    const today = new Date().toISOString().split('T')[0];
    const todayDayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Map day of week to program day (1-6 = Mon-Sat, 0 = Sunday uses Saturday's workout)
    const programDayIndex = todayDayOfWeek === 0 ? 5 : todayDayOfWeek - 1;
    const todayProgramDayId = programDayIds[programDayIndex];

    await db.runAsync(
      `INSERT INTO workouts (user_id, program_day_id, date, status, synced)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, todayProgramDayId, today, 'not_started', 0]
    );

    console.log(
      `[seedProgram] Seeded program ${programId} with ${programDays.length} days and ${totalExercises} exercises`
    );
    console.log(`[seedProgram] Created today's workout for program day ${todayProgramDayId}`);

    return totalExercises;
  } catch (error) {
    console.error('[seedProgram] Failed to seed program:', error);
    throw error;
  }
}
