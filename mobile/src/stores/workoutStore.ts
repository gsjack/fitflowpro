/**
 * Workout Store (T038)
 *
 * Zustand store for workout session management with optimistic updates.
 * Updates state immediately and queues background sync.
 *
 * Architecture:
 * - Local-first: All updates succeed immediately
 * - Background sync: Queue operations for server synchronization
 * - Resume capability: Persist active session state
 */

import { create } from 'zustand';
import * as workoutDb from '../services/database/workoutDb';

// Set data structure
export interface SetData {
  id?: number;
  exerciseId: number;
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number;
  notes?: string;
  timestamp: number;
}

// Workout store state
interface WorkoutState {
  // Current session
  currentWorkout: {
    id: number;
    programDayId: number;
    date: string;
    startedAt: number;
  } | null;

  // Progress tracking
  exerciseIndex: number;
  completedSets: SetData[];
  totalVolumeKg: number;

  // Actions
  startWorkout: (userId: number, programDayId: number, date: string) => Promise<void>;
  logSet: (
    exerciseId: number,
    setNumber: number,
    weightKg: number,
    reps: number,
    rir: number,
    notes?: string
  ) => Promise<void>;
  nextExercise: () => void;
  completeWorkout: () => Promise<void>;
  cancelWorkout: () => Promise<void>;
  resumeWorkout: (workoutId: number) => Promise<void>;
  clearWorkout: () => void;
}

/**
 * Workout store with optimistic updates
 */
export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  // Initial state
  currentWorkout: null,
  exerciseIndex: 0,
  completedSets: [],
  totalVolumeKg: 0,

  /**
   * Start a new workout session
   */
  startWorkout: async (userId: number, programDayId: number, date: string) => {
    try {
      // Fetch today's existing workout (should be pre-scheduled)
      let workout = await workoutDb.getTodayWorkout(userId);

      if (!workout) {
        // Create workout first
        console.log('[WorkoutStore] No workout found, creating new workout:', {
          programDayId,
          date,
        });
        await workoutDb.createWorkout(userId, programDayId, date);
        workout = await workoutDb.getTodayWorkout(userId);

        if (!workout) {
          throw new Error('Failed to create workout');
        }

        console.log('[WorkoutStore] Created new workout:', workout.id);
      } else {
        console.log(
          '[WorkoutStore] Found existing workout:',
          workout.id,
          'Status:',
          workout.status
        );
      }

      // Update workout status to in_progress via API
      await workoutDb.updateWorkoutStatus(workout.id, 'in_progress');

      // Load completed sets to check if resuming
      const sets = await workoutDb.getSetsForWorkout(workout.id);
      const totalVolumeKg = await workoutDb.calculateWorkoutVolume(workout.id);

      // Calculate exercise index (same logic as resumeWorkout)
      let startExerciseIndex = 0;
      const workoutWithExercises = await workoutDb.getWorkoutById(workout.id);

      if (
        workoutWithExercises?.exercises &&
        workoutWithExercises.exercises.length > 0 &&
        sets.length > 0
      ) {
        const setsPerExercise = new Map<number, number>();
        sets.forEach((set) => {
          const count = setsPerExercise.get(set.exercise_id) || 0;
          setsPerExercise.set(set.exercise_id, count + 1);
        });

        for (let i = 0; i < workoutWithExercises.exercises.length; i++) {
          const exercise = workoutWithExercises.exercises[i];
          const completedSetsCount = setsPerExercise.get(exercise.exercise_id) || 0;

          if (completedSetsCount < exercise.sets) {
            startExerciseIndex = i;
            console.log(`[WorkoutStore] Resuming at exercise ${i}: ${exercise.exercise_name}`);
            break;
          }

          if (i === workoutWithExercises.exercises.length - 1) {
            startExerciseIndex = i;
          }
        }
      }

      // Update state: Set current workout immediately
      set({
        currentWorkout: {
          id: workout.id,
          programDayId: workout.program_day_id,
          date: workout.date,
          startedAt: workout.started_at ?? Date.now(),
        },
        exerciseIndex: startExerciseIndex,
        completedSets: sets.map((s) => ({
          id: s.id,
          exerciseId: s.exercise_id,
          setNumber: s.set_number,
          weightKg: s.weight_kg,
          reps: s.reps,
          rir: s.rir,
          notes: s.notes ?? undefined,
          timestamp: s.timestamp,
        })),
        totalVolumeKg,
      });

      console.log(
        '[WorkoutStore] Workout started:',
        workout.id,
        'at exercise index:',
        startExerciseIndex
      );
    } catch (error) {
      console.error('[WorkoutStore] Failed to start workout:', error);
      throw error;
    }
  },

  /**
   * Log a set for the current workout
   * Target: < 200ms total response time (API call)
   */
  logSet: async (
    exerciseId: number,
    setNumber: number,
    weightKg: number,
    reps: number,
    rir: number,
    notes?: string
  ) => {
    const { currentWorkout, completedSets, totalVolumeKg } = get();

    if (!currentWorkout) {
      throw new Error('No active workout session');
    }

    try {
      // Log set via API
      const setId = await workoutDb.logSet(
        currentWorkout.id,
        exerciseId,
        setNumber,
        weightKg,
        reps,
        rir,
        notes
      );

      // Calculate volume for this set
      const setVolume = weightKg * reps;

      // Update state: Add set to completed sets
      const newSet: SetData = {
        id: setId,
        exerciseId,
        setNumber,
        weightKg,
        reps,
        rir,
        notes,
        timestamp: Date.now(),
      };

      set({
        completedSets: [...completedSets, newSet],
        totalVolumeKg: totalVolumeKg + setVolume,
      });

      console.log('[WorkoutStore] Set logged:', { exerciseId, setNumber, weightKg, reps, rir });
    } catch (error) {
      console.error('[WorkoutStore] Failed to log set:', error);
      throw error;
    }
  },

  /**
   * Move to the next exercise in the workout
   */
  nextExercise: () => {
    const { exerciseIndex } = get();
    set({ exerciseIndex: exerciseIndex + 1 });
    console.log('[WorkoutStore] Advanced to exercise index:', exerciseIndex + 1);
  },

  /**
   * Complete the current workout
   */
  completeWorkout: async () => {
    const { currentWorkout, completedSets, totalVolumeKg } = get();

    if (!currentWorkout) {
      throw new Error('No active workout session');
    }

    try {
      // Calculate average RIR
      const averageRir =
        completedSets.length > 0
          ? completedSets.reduce((sum, set) => sum + set.rir, 0) / completedSets.length
          : 0;

      // Update workout status to completed via API with metrics
      await workoutDb.updateWorkoutStatus(
        currentWorkout.id,
        'completed',
        totalVolumeKg,
        averageRir
      );

      console.log(
        '[WorkoutStore] Workout completed:',
        currentWorkout.id,
        'Volume:',
        totalVolumeKg,
        'kg, Avg RIR:',
        averageRir.toFixed(2)
      );

      // Clear current workout state
      set({
        currentWorkout: null,
        exerciseIndex: 0,
        completedSets: [],
        totalVolumeKg: 0,
      });
    } catch (error) {
      console.error('[WorkoutStore] Failed to complete workout:', error);
      throw error;
    }
  },

  /**
   * Cancel the current workout - resets to not_started and deletes logged sets
   */
  cancelWorkout: async () => {
    const { currentWorkout } = get();

    if (!currentWorkout) {
      throw new Error('No active workout session');
    }

    try {
      // Get all sets for this workout
      const sets = await workoutDb.getSetsForWorkout(currentWorkout.id);

      // Delete all logged sets
      for (const set of sets) {
        await workoutDb.deleteSet(set.id);
      }

      // Reset workout status to not_started (so user can do it another day)
      await workoutDb.updateWorkoutStatus(currentWorkout.id, 'not_started');

      // Clear current workout state
      set({
        currentWorkout: null,
        exerciseIndex: 0,
        completedSets: [],
        totalVolumeKg: 0,
      });

      console.log('[WorkoutStore] Workout reset to not_started:', currentWorkout.id);
    } catch (error) {
      console.error('[WorkoutStore] Failed to cancel workout:', error);
      throw error;
    }
  },

  /**
   * Resume a previously started workout
   */
  resumeWorkout: async (workoutId: number) => {
    try {
      // Fetch workout from database
      const workout = await workoutDb.getWorkoutById(workoutId);

      if (!workout) {
        throw new Error('Workout not found');
      }

      if (workout.status !== 'in_progress') {
        throw new Error('Workout is not in progress');
      }

      // Fetch completed sets
      const sets = await workoutDb.getSetsForWorkout(workoutId);

      // Calculate total volume
      const totalVolumeKg = await workoutDb.calculateWorkoutVolume(workoutId);

      // Calculate current exercise index from completed sets
      let resumeExerciseIndex = 0;
      if (workout.exercises && workout.exercises.length > 0) {
        console.log(
          '[WorkoutStore] Exercises:',
          workout.exercises.map((e) => ({
            id: e.exercise_id,
            name: e.exercise_name,
            sets: e.sets,
            order: e.order_index,
          }))
        );

        // Count completed sets per exercise
        const setsPerExercise = new Map<number, number>();
        sets.forEach((set) => {
          const count = setsPerExercise.get(set.exercise_id) || 0;
          setsPerExercise.set(set.exercise_id, count + 1);
        });

        console.log('[WorkoutStore] Sets per exercise:', Array.from(setsPerExercise.entries()));

        // Find first exercise that isn't fully completed
        for (let i = 0; i < workout.exercises.length; i++) {
          const exercise = workout.exercises[i];
          const completedSetsCount = setsPerExercise.get(exercise.exercise_id) || 0;

          console.log(
            `[WorkoutStore] Exercise ${i}: ${exercise.exercise_name} - ${completedSetsCount}/${exercise.sets} sets`
          );

          if (completedSetsCount < exercise.sets) {
            resumeExerciseIndex = i;
            console.log(
              `[WorkoutStore] Found incomplete exercise at index ${i}: ${exercise.exercise_name}`
            );
            break;
          }

          // If we've completed all exercises, stay at the last one
          if (i === workout.exercises.length - 1) {
            resumeExerciseIndex = i;
          }
        }

        console.log('[WorkoutStore] Calculated resume exercise index:', resumeExerciseIndex);
      } else {
        console.log('[WorkoutStore] No exercises found in workout object');
      }

      // Restore workout state
      set({
        currentWorkout: {
          id: workout.id,
          programDayId: workout.program_day_id,
          date: workout.date,
          startedAt: workout.started_at ?? Date.now(),
        },
        exerciseIndex: resumeExerciseIndex,
        completedSets: sets.map((s) => ({
          id: s.id,
          exerciseId: s.exercise_id,
          setNumber: s.set_number,
          weightKg: s.weight_kg,
          reps: s.reps,
          rir: s.rir,
          notes: s.notes ?? undefined,
          timestamp: s.timestamp,
        })),
        totalVolumeKg,
      });

      console.log(
        '[WorkoutStore] Workout resumed:',
        workoutId,
        'at exercise index:',
        resumeExerciseIndex
      );
    } catch (error) {
      console.error('[WorkoutStore] Failed to resume workout:', error);
      throw error;
    }
  },

  /**
   * Clear workout state (for logout, etc.)
   */
  clearWorkout: () => {
    set({
      currentWorkout: null,
      exerciseIndex: 0,
      completedSets: [],
      totalVolumeKg: 0,
    });
  },
}));
