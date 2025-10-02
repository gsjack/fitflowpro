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
      const workout = await workoutDb.getTodayWorkout(userId);

      if (!workout) {
        throw new Error('No workout scheduled for today');
      }

      console.log('[WorkoutStore] Found existing workout:', workout.id, 'Status:', workout.status);

      // Update workout status to in_progress via API
      await workoutDb.updateWorkoutStatus(workout.id, 'in_progress');

      // Update state: Set current workout immediately
      set({
        currentWorkout: {
          id: workout.id,
          programDayId: workout.program_day_id,
          date: workout.date,
          startedAt: Date.now(),
        },
        exerciseIndex: 0,
        completedSets: [],
        totalVolumeKg: 0,
      });

      console.log('[WorkoutStore] Workout started:', workout.id);
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
    const { currentWorkout } = get();

    if (!currentWorkout) {
      throw new Error('No active workout session');
    }

    try {
      // Update workout status to completed via API
      await workoutDb.updateWorkoutStatus(
        currentWorkout.id,
        'completed'
      );

      // Clear current workout state
      set({
        currentWorkout: null,
        exerciseIndex: 0,
        completedSets: [],
        totalVolumeKg: 0,
      });

      console.log('[WorkoutStore] Workout completed:', currentWorkout.id);
    } catch (error) {
      console.error('[WorkoutStore] Failed to complete workout:', error);
      throw error;
    }
  },

  /**
   * Cancel the current workout
   */
  cancelWorkout: async () => {
    const { currentWorkout } = get();

    if (!currentWorkout) {
      throw new Error('No active workout session');
    }

    try {
      // Update workout status to cancelled via API
      await workoutDb.updateWorkoutStatus(currentWorkout.id, 'cancelled');

      // Clear current workout state
      set({
        currentWorkout: null,
        exerciseIndex: 0,
        completedSets: [],
        totalVolumeKg: 0,
      });

      console.log('[WorkoutStore] Workout cancelled:', currentWorkout.id);
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

      // Restore workout state
      set({
        currentWorkout: {
          id: workout.id,
          programDayId: workout.program_day_id,
          date: workout.date,
          startedAt: workout.started_at ?? Date.now(),
        },
        exerciseIndex: 0, // TODO: Calculate from completed sets
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

      console.log('[WorkoutStore] Workout resumed:', workoutId);
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
