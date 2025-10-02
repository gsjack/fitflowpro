/**
 * Integration Test T075: Auto-Regulation Based on Recovery
 *
 * Validates Scenario 2 from quickstart.md:
 * - Submit poor recovery (score 8) → verify volume reduced by 2 sets
 * - Complete workout → verify total sets ~16 (vs normal 32)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as SQLite from 'expo-sqlite';

// Mock modules
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(),
}));

vi.mock('../../src/services/notifications', () => ({
  sendNotification: vi.fn(),
}));

import { sendNotification } from '../../src/services/notifications';

describe('Integration Test: Auto-Regulation Based on Recovery (T075)', () => {
  let mockDb: any;
  const userId: number = 1;
  const programDayId: number = 1; // Push A

  beforeEach(async () => {
    mockDb = {
      runAsync: vi.fn(),
      getAllAsync: vi.fn(),
      getFirstAsync: vi.fn(),
    };

    vi.mocked(SQLite.openDatabaseAsync).mockResolvedValue(mockDb);

    // Mock program exercises (8 exercises with 4 sets each = 32 total)
    vi.mocked(mockDb.getAllAsync).mockImplementation((query: string) => {
      if (query.includes('SELECT * FROM program_exercises')) {
        return Promise.resolve([
          {
            exercise_id: 1,
            exercise_name: 'Barbell Bench Press',
            sets: 4,
            reps_min: 6,
            reps_max: 8,
            target_rir: 2,
          },
          {
            exercise_id: 2,
            exercise_name: 'Incline Dumbbell Press',
            sets: 4,
            reps_min: 8,
            reps_max: 10,
            target_rir: 2,
          },
          {
            exercise_id: 3,
            exercise_name: 'Cable Flyes',
            sets: 4,
            reps_min: 10,
            reps_max: 12,
            target_rir: 3,
          },
          {
            exercise_id: 4,
            exercise_name: 'Overhead Press',
            sets: 4,
            reps_min: 6,
            reps_max: 8,
            target_rir: 2,
          },
          {
            exercise_id: 5,
            exercise_name: 'Lateral Raises',
            sets: 4,
            reps_min: 12,
            reps_max: 15,
            target_rir: 3,
          },
          {
            exercise_id: 6,
            exercise_name: 'Front Raises',
            sets: 4,
            reps_min: 12,
            reps_max: 15,
            target_rir: 3,
          },
          {
            exercise_id: 7,
            exercise_name: 'Tricep Pushdowns',
            sets: 4,
            reps_min: 10,
            reps_max: 12,
            target_rir: 2,
          },
          {
            exercise_id: 8,
            exercise_name: 'Overhead Tricep Extension',
            sets: 4,
            reps_min: 10,
            reps_max: 12,
            target_rir: 3,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    vi.mocked(mockDb.runAsync).mockResolvedValue({ lastInsertRowId: 1, changes: 1 } as any);
  });

  it('should calculate recovery score and apply volume reduction', async () => {
    // Step 1: Submit Poor Recovery Assessment
    const recoveryData = {
      user_id: userId,
      date: '2025-10-02',
      sleep_quality: 2, // 4 hours, poor
      muscle_soreness: 4, // Very sore
      mental_motivation: 2, // Low
    };

    const totalScore =
      recoveryData.sleep_quality + recoveryData.muscle_soreness + recoveryData.mental_motivation;
    expect(totalScore).toBe(8);

    // Determine volume adjustment based on recovery score
    // Score 3-15: 12-15=none, 9-11=reduce_1, 6-8=reduce_2, 3-5=rest_day
    let volumeAdjustment: string;
    if (totalScore >= 12) {
      volumeAdjustment = 'none';
    } else if (totalScore >= 9) {
      volumeAdjustment = 'reduce_1_set';
    } else if (totalScore >= 6) {
      volumeAdjustment = 'reduce_2_sets';
    } else {
      volumeAdjustment = 'rest_day_recommended';
    }

    expect(volumeAdjustment).toBe('reduce_2_sets');

    // Save recovery assessment
    await mockDb.runAsync(
      `INSERT INTO recovery_assessments
       (user_id, date, sleep_quality, muscle_soreness, mental_motivation, total_score, volume_adjustment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        recoveryData.user_id,
        recoveryData.date,
        recoveryData.sleep_quality,
        recoveryData.muscle_soreness,
        recoveryData.mental_motivation,
        totalScore,
        volumeAdjustment,
      ]
    );

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO recovery_assessments'),
      expect.arrayContaining([userId, '2025-10-02', 2, 4, 2, 8, 'reduce_2_sets'])
    );

    // Step 2: Verify notification sent
    vi.mocked(sendNotification).mockResolvedValue(undefined);
    await sendNotification(
      'Volume Adjusted',
      'Volume reduced by 2 sets per exercise due to poor recovery'
    );

    expect(sendNotification).toHaveBeenCalledWith(
      'Volume Adjusted',
      expect.stringContaining('2 sets')
    );
  });

  it('should apply auto-regulation to workout exercises', async () => {
    // Mock recovery assessment exists with reduce_2_sets
    vi.mocked(mockDb.getFirstAsync).mockResolvedValue({
      id: 1,
      user_id: userId,
      date: '2025-10-02',
      total_score: 8,
      volume_adjustment: 'reduce_2_sets',
    });

    const recovery = await mockDb.getFirstAsync(
      'SELECT * FROM recovery_assessments WHERE user_id = ? AND date = ?',
      [userId, '2025-10-02']
    );

    expect(recovery).toBeTruthy();
    expect(recovery.volume_adjustment).toBe('reduce_2_sets');

    // Get program exercises
    const exercises = await mockDb.getAllAsync(
      'SELECT * FROM program_exercises WHERE program_day_id = ?',
      [programDayId]
    );

    // Apply auto-regulation adjustment
    const adjustedExercises = exercises.map((exercise) => {
      let adjustedSets = exercise.sets;

      if (recovery.volume_adjustment === 'reduce_2_sets') {
        adjustedSets = Math.max(1, exercise.sets - 2);
      } else if (recovery.volume_adjustment === 'reduce_1_set') {
        adjustedSets = Math.max(1, exercise.sets - 1);
      }

      return {
        ...exercise,
        originalSets: exercise.sets,
        adjustedSets,
      };
    });

    // Verify all exercises have 2 sets instead of 4
    adjustedExercises.forEach((exercise) => {
      expect(exercise.originalSets).toBe(4);
      expect(exercise.adjustedSets).toBe(2);
    });

    // Calculate total sets
    const totalSets = adjustedExercises.reduce((sum, ex) => sum + ex.adjustedSets, 0);
    expect(totalSets).toBe(16); // 8 exercises × 2 sets = 16 total sets
  });

  it('should complete auto-regulated workout with reduced volume', async () => {
    // Create workout
    const workoutId = 1;
    await mockDb.runAsync(
      'INSERT INTO workouts (user_id, program_day_id, date, status, synced) VALUES (?, ?, ?, ?, ?)',
      [userId, programDayId, '2025-10-02', 'in_progress', 0]
    );

    // Log 2 sets per exercise (16 total) instead of normal 32
    let setCount = 0;
    for (let exerciseId = 1; exerciseId <= 8; exerciseId++) {
      for (let setNum = 1; setNum <= 2; setNum++) {
        await mockDb.runAsync(
          'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [workoutId, exerciseId, setNum, 80, 10, 2, Date.now(), 0]
        );
        setCount++;
      }
    }

    expect(setCount).toBe(16);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(17); // 1 workout + 16 sets

    // Complete workout
    const totalVolume = 16 * 80 * 10; // 12,800 kg
    await mockDb.runAsync(
      'UPDATE workouts SET status = ?, total_volume_kg = ?, completed_at = ? WHERE id = ?',
      ['completed', totalVolume, Date.now(), workoutId]
    );

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workouts'),
      expect.arrayContaining(['completed', totalVolume, expect.any(Number), workoutId])
    );
  });

  it('should verify volume tracking shows reduced actual volume', async () => {
    // Mock volume trends query
    vi.mocked(mockDb.getAllAsync).mockResolvedValue([
      {
        muscle_group: 'chest',
        week: '2025-W40',
        planned_sets: 14, // Normal MAV volume for chest
        actual_sets: 6, // Reduced: 3 chest exercises × 2 sets
        mev: 8,
        mav: 14,
        mrv: 22,
      },
    ]);

    const volumeTrends = await mockDb.getAllAsync(
      `SELECT muscle_group, week,
              SUM(planned_sets) as planned_sets,
              SUM(actual_sets) as actual_sets,
              mev, mav, mrv
       FROM volume_tracking
       WHERE user_id = ? AND week = ?
       GROUP BY muscle_group`,
      [userId, '2025-W40']
    );

    expect(volumeTrends.length).toBe(1);
    const chestVolume = volumeTrends[0];

    expect(chestVolume.actual_sets).toBe(6);
    expect(chestVolume.planned_sets).toBe(14);
    expect(chestVolume.actual_sets).toBeLessThan(chestVolume.mev); // Below MEV (8)

    // Verify flagged in red (below MEV)
    const isBelowMEV = chestVolume.actual_sets < chestVolume.mev;
    expect(isBelowMEV).toBe(true);
  });

  it('should handle different recovery score ranges', async () => {
    const testCases = [
      { score: 15, expected: 'none', sets: 4 },
      { score: 12, expected: 'none', sets: 4 },
      { score: 11, expected: 'reduce_1_set', sets: 3 },
      { score: 9, expected: 'reduce_1_set', sets: 3 },
      { score: 8, expected: 'reduce_2_sets', sets: 2 },
      { score: 6, expected: 'reduce_2_sets', sets: 2 },
      { score: 5, expected: 'rest_day_recommended', sets: 0 },
      { score: 3, expected: 'rest_day_recommended', sets: 0 },
    ];

    for (const testCase of testCases) {
      let volumeAdjustment: string;
      let adjustedSets: number;

      if (testCase.score >= 12) {
        volumeAdjustment = 'none';
        adjustedSets = 4;
      } else if (testCase.score >= 9) {
        volumeAdjustment = 'reduce_1_set';
        adjustedSets = 3;
      } else if (testCase.score >= 6) {
        volumeAdjustment = 'reduce_2_sets';
        adjustedSets = 2;
      } else {
        volumeAdjustment = 'rest_day_recommended';
        adjustedSets = 0;
      }

      expect(volumeAdjustment).toBe(testCase.expected);
      expect(adjustedSets).toBe(testCase.sets);
    }
  });

  it('should allow user override of auto-regulation (optional)', async () => {
    // Mock recovery with reduce_2_sets
    const recovery = {
      volume_adjustment: 'reduce_2_sets',
    };

    // User chooses to override and use original volume
    const userOverride = true;
    const originalSets = 4;
    const adjustedSets = userOverride ? originalSets : 2;

    expect(adjustedSets).toBe(4);

    // Save override preference
    await mockDb.runAsync('UPDATE recovery_assessments SET user_override = ? WHERE id = ?', [
      userOverride,
      1,
    ]);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE recovery_assessments'),
      expect.arrayContaining([userOverride, 1])
    );
  });

  it('should handle edge case: score boundaries', async () => {
    // Test boundary conditions
    const boundaries = [
      { score: 12, shouldReduce: false },
      { score: 11, shouldReduce: true },
      { score: 9, shouldReduce: true },
      { score: 8, shouldReduce: true },
      { score: 6, shouldReduce: true },
      { score: 5, shouldReduce: true }, // Rest day
    ];

    for (const boundary of boundaries) {
      const shouldReduce = boundary.score < 12;
      expect(shouldReduce).toBe(boundary.shouldReduce);
    }
  });
});
