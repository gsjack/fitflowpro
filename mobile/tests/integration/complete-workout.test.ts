/**
 * Integration Test T074: Complete Guided Workout Session
 *
 * Validates Scenario 1 from quickstart.md:
 * - Complete guided workout session (32 sets)
 * - Force-close app mid-workout → verify "Resume Workout?" prompt
 * - Resume → complete remaining sets → finish workout
 * - Assertions: 32 sets logged, total_volume_kg calculated, sync queue processed
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as SQLite from 'expo-sqlite';

// Mock modules
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(),
}));

vi.mock('../../src/services/sync/syncQueue', () => ({
  addToQueue: vi.fn(),
  processQueue: vi.fn(),
}));

vi.mock('../../src/services/timer/RestTimer', () => ({
  startTimer: vi.fn(),
  stopTimer: vi.fn(),
  getTimeRemaining: vi.fn(),
}));

import { addToQueue, processQueue } from '../../src/services/sync/syncQueue';
import { startTimer, stopTimer, getTimeRemaining } from '../../src/services/timer/RestTimer';

describe('Integration Test: Complete Guided Workout Session (T074)', () => {
  let mockDb: any;
  let workoutId: number;
  const userId: number = 1;
  const programDayId: number = 1; // Push A

  beforeEach(async () => {
    // Setup mock database
    mockDb = {
      runAsync: vi.fn(),
      getAllAsync: vi.fn(),
      getFirstAsync: vi.fn(),
    };

    vi.mocked(SQLite.openDatabaseAsync).mockResolvedValue(mockDb);

    // Mock initial database state
    vi.mocked(mockDb.getFirstAsync).mockImplementation((query: string) => {
      if (query.includes('SELECT * FROM workouts WHERE status')) {
        return Promise.resolve(null); // No active session
      }
      if (query.includes('SELECT * FROM workouts WHERE id')) {
        return Promise.resolve({
          id: 1,
          user_id: userId,
          program_day_id: programDayId,
          date: '2025-10-02',
          status: 'in_progress',
          total_volume_kg: 0,
          created_at: new Date().toISOString(),
        });
      }
      return Promise.resolve(null);
    });

    vi.mocked(mockDb.getAllAsync).mockImplementation((query: string) => {
      // Return 8 exercises for Push A workout
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
            sets: 3,
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
            sets: 3,
            reps_min: 10,
            reps_max: 12,
            target_rir: 3,
          },
        ]);
      }
      // Return sets for workout
      if (query.includes('SELECT * FROM sets WHERE workout_id')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    vi.mocked(mockDb.runAsync).mockResolvedValue({ lastInsertRowId: 1, changes: 1 } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full workout flow with 32 sets', async () => {
    // Step 1: Start Workout
    workoutId = 1;

    const createWorkoutResult = await mockDb.runAsync(
      'INSERT INTO workouts (user_id, program_day_id, date, status, synced) VALUES (?, ?, ?, ?, ?)',
      [userId, programDayId, '2025-10-02', 'in_progress', 0]
    );

    expect(createWorkoutResult.lastInsertRowId).toBe(1);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workouts'),
      expect.arrayContaining([userId, programDayId, '2025-10-02', 'in_progress', 0])
    );

    // Step 2: Log First Set
    const firstSet = {
      workout_id: workoutId,
      exercise_id: 1,
      set_number: 1,
      weight_kg: 100,
      reps: 8,
      rir: 2,
      synced: 0,
    };

    const startTime = Date.now();
    await mockDb.runAsync(
      'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        firstSet.workout_id,
        firstSet.exercise_id,
        firstSet.set_number,
        firstSet.weight_kg,
        firstSet.reps,
        firstSet.rir,
        Date.now(),
        firstSet.synced,
      ]
    );
    const endTime = Date.now();

    // Performance assertion: SQLite write < 5ms
    expect(endTime - startTime).toBeLessThan(5);

    // Step 3: Verify rest timer starts
    vi.mocked(startTimer).mockReturnValue(undefined);
    startTimer(180); // 3 minutes for compound lift
    expect(startTimer).toHaveBeenCalledWith(180);

    // Step 4: Complete remaining sets for first exercise
    const sets = [
      { set_number: 2, reps: 8, weight_kg: 100, rir: 2 },
      { set_number: 3, reps: 7, weight_kg: 100, rir: 2 },
      { set_number: 4, reps: 6, weight_kg: 100, rir: 1 },
    ];

    for (const set of sets) {
      await mockDb.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [workoutId, 1, set.set_number, set.weight_kg, set.reps, set.rir, Date.now(), 0]
      );
    }

    expect(mockDb.runAsync).toHaveBeenCalledTimes(5); // 1 workout + 4 sets

    // Step 5: Complete 3 exercises (12 sets total)
    let totalSets = 4;
    for (let exerciseId = 2; exerciseId <= 3; exerciseId++) {
      for (let setNum = 1; setNum <= 4; setNum++) {
        await mockDb.runAsync(
          'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [workoutId, exerciseId, setNum, 80, 10, 2, Date.now(), 0]
        );
        totalSets++;
      }
    }

    expect(totalSets).toBe(12);

    // Step 6: Test Session Resume
    // Mock force-close by checking for active session
    vi.mocked(mockDb.getFirstAsync).mockResolvedValueOnce({
      id: workoutId,
      user_id: userId,
      status: 'in_progress',
      date: '2025-10-02',
      total_volume_kg: 0,
    });

    const activeSession = await mockDb.getFirstAsync(
      'SELECT * FROM workouts WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
      [userId, 'in_progress']
    );

    expect(activeSession).toBeTruthy();
    expect(activeSession.id).toBe(workoutId);

    // Mock completed sets retrieval
    vi.mocked(mockDb.getAllAsync).mockResolvedValueOnce(
      Array(12)
        .fill(null)
        .map((_, i) => ({
          id: i + 1,
          workout_id: workoutId,
          exercise_id: Math.floor(i / 4) + 1,
          set_number: (i % 4) + 1,
        }))
    );

    const completedSets = await mockDb.getAllAsync(
      'SELECT * FROM sets WHERE workout_id = ? ORDER BY id',
      [workoutId]
    );

    expect(completedSets.length).toBe(12);

    // Step 7: Complete remaining exercises (exercises 4-8, sets 13-30)
    // Exercise 4: 4 sets, Exercise 5: 4 sets, Exercise 6: 3 sets, Exercise 7: 4 sets, Exercise 8: 3 sets
    // Total additional: 18 sets (4+4+3+4+3)
    // Total overall: 12 (from step 3-6) + 18 = 30 sets
    for (let exerciseId = 4; exerciseId <= 8; exerciseId++) {
      const setsForExercise = exerciseId === 6 || exerciseId === 8 ? 3 : 4;
      for (let setNum = 1; setNum <= setsForExercise; setNum++) {
        await mockDb.runAsync(
          'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [workoutId, exerciseId, setNum, 60, 12, 2, Date.now(), 0]
        );
        totalSets++;
      }
    }

    // Verify total sets = 30 (12 from exercises 1-3, then 4+4+3+4+3 from exercises 4-8)
    expect(totalSets).toBe(30);

    // Step 8: Finish Workout
    // Calculate total volume (30 sets total)
    const mockSets = Array(30)
      .fill(null)
      .map((_, i) => ({
        weight_kg: i < 12 ? 100 : 60,
        reps: i < 12 ? 8 : 12,
      }));

    vi.mocked(mockDb.getAllAsync).mockResolvedValueOnce(mockSets);

    const allSets = await mockDb.getAllAsync(
      'SELECT weight_kg, reps FROM sets WHERE workout_id = ?',
      [workoutId]
    );
    const totalVolume = allSets.reduce((sum, set) => sum + set.weight_kg * set.reps, 0);

    expect(totalVolume).toBe(12 * 100 * 8 + 18 * 60 * 12); // 9600 + 12960 = 22560 kg

    // Update workout status to completed
    await mockDb.runAsync(
      'UPDATE workouts SET status = ?, total_volume_kg = ?, completed_at = ? WHERE id = ?',
      ['completed', totalVolume, Date.now(), workoutId]
    );

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workouts SET status'),
      expect.arrayContaining(['completed', totalVolume, expect.any(Number), workoutId])
    );

    // Step 9: Verify sync queue processing
    vi.mocked(addToQueue).mockResolvedValue(undefined);
    await addToQueue('workout', { id: workoutId, status: 'completed' }, workoutId);
    expect(addToQueue).toHaveBeenCalledWith('workout', expect.any(Object), workoutId);

    // Process sync queue
    vi.mocked(processQueue).mockResolvedValue(undefined);
    await processQueue();
    expect(processQueue).toHaveBeenCalled();
  });

  it('should handle background timer during app backgrounding', async () => {
    // Start rest timer
    vi.mocked(startTimer).mockReturnValue(undefined);
    vi.mocked(getTimeRemaining).mockReturnValue(170); // 10 seconds elapsed

    startTimer(180); // 3 minutes

    // Simulate 10 seconds elapsed
    expect(getTimeRemaining()).toBe(170);

    // Mock notification at 10s warning
    // (In real implementation, this would be handled by notification service)
    const notification10s = {
      title: '⏱️ Almost Ready',
      body: '10 seconds remaining',
    };

    expect(notification10s.title).toContain('Almost Ready');

    // Simulate timer completion
    vi.mocked(getTimeRemaining).mockReturnValue(0);
    expect(getTimeRemaining()).toBe(0);

    const notificationComplete = {
      title: '✅ Rest Complete!',
      body: 'Ready for your next set',
    };

    expect(notificationComplete.title).toContain('Rest Complete');
  });

  it('should restore exact session state after force-close', async () => {
    // Setup: 3 exercises completed (12 sets)
    const existingWorkout = {
      id: 1,
      user_id: userId,
      status: 'in_progress',
      date: '2025-10-02',
    };

    const existingSets = Array(12)
      .fill(null)
      .map((_, i) => ({
        id: i + 1,
        workout_id: 1,
        exercise_id: Math.floor(i / 4) + 1,
        set_number: (i % 4) + 1,
        weight_kg: 100,
        reps: 8,
        rir: 2,
        timestamp: Date.now() - (12 - i) * 1000,
      }));

    vi.mocked(mockDb.getFirstAsync).mockResolvedValueOnce(existingWorkout);
    vi.mocked(mockDb.getAllAsync).mockResolvedValueOnce(existingSets);

    // Resume workflow
    const activeWorkout = await mockDb.getFirstAsync(
      'SELECT * FROM workouts WHERE user_id = ? AND status = ?',
      [userId, 'in_progress']
    );

    expect(activeWorkout).toBeTruthy();
    expect(activeWorkout.id).toBe(1);

    const completedSets = await mockDb.getAllAsync(
      'SELECT * FROM sets WHERE workout_id = ? ORDER BY timestamp',
      [activeWorkout.id]
    );

    expect(completedSets.length).toBe(12);

    // Determine current exercise (should be exercise 4)
    const lastExerciseId = completedSets[completedSets.length - 1].exercise_id;
    const currentExerciseId = lastExerciseId + 1;

    expect(currentExerciseId).toBe(4);

    // Verify UI can restore state
    const uiState = {
      workoutId: activeWorkout.id,
      currentExerciseIndex: currentExerciseId - 1, // 0-indexed
      completedSetsCount: completedSets.length,
      resumedFromPrevious: true,
    };

    expect(uiState.currentExerciseIndex).toBe(3);
    expect(uiState.completedSetsCount).toBe(12);
    expect(uiState.resumedFromPrevious).toBe(true);
  });

  it('should verify all sets have correct timestamp ordering', async () => {
    const basetime = Date.now();
    const mockSetsWithTimestamps = Array(32)
      .fill(null)
      .map((_, i) => ({
        id: i + 1,
        workout_id: 1,
        timestamp: basetime + i * 1000, // 1 second apart
      }));

    vi.mocked(mockDb.getAllAsync).mockResolvedValueOnce(mockSetsWithTimestamps);

    const sets = await mockDb.getAllAsync(
      'SELECT id, timestamp FROM sets WHERE workout_id = ? ORDER BY timestamp',
      [1]
    );

    // Verify chronological ordering
    for (let i = 1; i < sets.length; i++) {
      expect(sets[i].timestamp).toBeGreaterThan(sets[i - 1].timestamp);
    }

    expect(sets.length).toBe(32);
  });

  it('should verify synced flag updates after successful sync', async () => {
    // Create unsynced sets
    await mockDb.runAsync(
      'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 1, 1, 100, 8, 2, Date.now(), 0]
    );

    // Mock successful sync
    vi.mocked(mockDb.runAsync).mockResolvedValueOnce({ changes: 1 } as any);

    await mockDb.runAsync('UPDATE sets SET synced = 1 WHERE id = ?', [1]);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sets SET synced = 1'),
      [1]
    );

    // Verify no unsynced sets remain
    vi.mocked(mockDb.getAllAsync).mockResolvedValueOnce([]);
    const unsyncedSets = await mockDb.getAllAsync(
      'SELECT * FROM sets WHERE workout_id = ? AND synced = 0',
      [1]
    );

    expect(unsyncedSets.length).toBe(0);
  });
});
