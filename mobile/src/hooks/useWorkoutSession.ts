/**
 * Workout Session Hook
 *
 * Manages workout session state including:
 * - Exercise loading and tracking
 * - Set logging with previous set data
 * - Rest timer integration
 * - Workout completion/cancellation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle } from 'react-native';
import { useWorkoutStore } from '../stores/workoutStore';
import { type ProgramExercise } from '../services/database/programDb';
import { getSetsForExercise, getWorkoutById } from '../services/database/workoutDb';
import * as timerService from '../services/timer/timerService';
import { useSettingsStore } from '../stores/settingsStore';
import { getUnitLabel } from '../utils/unitConversion';

export interface UseWorkoutSessionReturn {
  // Exercise state
  exercises: ProgramExercise[];
  currentExercise: ProgramExercise | null;
  currentSetNumber: number;
  previousSet: { weight: number; reps: number } | null;

  // Timer state
  isTimerActive: boolean;

  // UI state
  videoModalVisible: boolean;
  historyExpanded: boolean;

  // Actions
  handleLogSet: (weightKg: number, reps: number, rir: number) => Promise<void>;
  handleCompleteWorkout: () => Promise<void>;
  handleCancelWorkout: () => void;
  confirmCancelWorkout: () => Promise<void>;
  handleTimerComplete: () => void;
  setVideoModalVisible: (visible: boolean) => void;
  setHistoryExpanded: (expanded: boolean) => void;

  // Refs
  setLogCardRef: React.RefObject<any>;
}

/**
 * Hook for managing workout session state and logic
 *
 * @example
 * const workoutSession = useWorkoutSession();
 * await workoutSession.handleLogSet(100, 8, 2);
 */
export function useWorkoutSession(): UseWorkoutSessionReturn {
  const { weightUnit } = useSettingsStore();
  const {
    currentWorkout,
    exerciseIndex,
    completedSets,
    logSet,
    nextExercise,
    completeWorkout,
    cancelWorkout,
  } = useWorkoutStore();

  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<ProgramExercise | null>(null);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [previousSet, setPreviousSet] = useState<{ weight: number; reps: number } | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Accessibility: Ref for auto-focus after set completion
  const setLogCardRef = useRef<any>(null);

  // Load exercises from the workout
  useEffect(() => {
    if (!currentWorkout) {
      return;
    }

    const loadExercises = async () => {
      try {
        console.log(
          '[useWorkoutSession] Loading exercises for workout:',
          currentWorkout.id,
          'exerciseIndex:',
          exerciseIndex
        );

        // Fetch workout from API - exercises are included in the response
        const workout = await getWorkoutById(currentWorkout.id);

        if (workout && workout.exercises && workout.exercises.length > 0) {
          console.log(
            '[useWorkoutSession] Loaded exercises:',
            workout.exercises.map((e) => e.exercise_name)
          );
          setExercises(workout.exercises);

          if (workout.exercises.length > exerciseIndex) {
            console.log(
              '[useWorkoutSession] Setting currentExercise to index',
              exerciseIndex,
              ':',
              workout.exercises[exerciseIndex].exercise_name
            );
            setCurrentExercise(workout.exercises[exerciseIndex]);
          }
        } else {
          console.error('[useWorkoutSession] No exercises found in workout');
        }
      } catch (error) {
        console.error('[useWorkoutSession] Failed to load exercises:', error);
      }
    };

    void loadExercises();
  }, [currentWorkout, exerciseIndex]);

  // Calculate current set number based on completed sets
  useEffect(() => {
    if (!currentWorkout || !currentExercise) {
      return;
    }

    const exerciseSets = completedSets.filter(
      (set) => set.exerciseId === currentExercise.exercise_id
    );

    const nextSetNumber = exerciseSets.length + 1;
    setCurrentSetNumber(nextSetNumber);

    // Get previous set data for auto-fill
    if (exerciseSets.length > 0) {
      const lastSet = exerciseSets[exerciseSets.length - 1];
      setPreviousSet({ weight: lastSet.weightKg, reps: lastSet.reps });
    } else {
      // Check for previous workout data
      void loadPreviousSetData();
    }
  }, [currentWorkout, currentExercise, completedSets]);

  // Load previous set data from last workout
  const loadPreviousSetData = async () => {
    if (!currentWorkout || !currentExercise) {
      return;
    }

    try {
      // Get last completed set for this exercise from database
      const sets = await getSetsForExercise(currentWorkout.id, currentExercise.exercise_id);
      if (sets.length > 0) {
        const lastSet = sets[sets.length - 1];
        setPreviousSet({ weight: lastSet.weight_kg, reps: lastSet.reps });
      }
    } catch (error) {
      console.error('[useWorkoutSession] Failed to load previous set:', error);
    }
  };

  // Handle set completion
  const handleLogSet = useCallback(
    async (weightKg: number, reps: number, rir: number) => {
      if (!currentWorkout || !currentExercise) {
        return;
      }

      try {
        // Log the set
        await logSet(currentExercise.exercise_id, currentSetNumber, weightKg, reps, rir, undefined);

        // Check if all sets complete for this exercise
        const exerciseSets = completedSets.filter(
          (set) => set.exerciseId === currentExercise.exercise_id
        );

        if (exerciseSets.length + 1 >= currentExercise.sets) {
          // Move to next exercise
          if (exerciseIndex + 1 < exercises.length) {
            console.log('[useWorkoutSession] Moving to next exercise');
            nextExercise();
          } else {
            // All exercises complete, end workout
            await handleCompleteWorkout();
            return;
          }
        }

        // Accessibility: Announce set completion to screen reader
        const unitLabel = getUnitLabel(weightUnit);
        AccessibilityInfo.announceForAccessibility(
          `Set ${currentSetNumber} completed. ${weightKg} ${unitLabel} for ${reps} reps. Rest timer started.`
        );

        // Start rest timer (3 minutes = 180 seconds)
        await startRestTimer(180);

        // Accessibility: Focus back to weight input after brief delay
        setTimeout(() => {
          const reactTag = findNodeHandle(setLogCardRef.current);
          if (reactTag) {
            AccessibilityInfo.setAccessibilityFocus(reactTag);
          }
        }, 500);
      } catch (error) {
        console.error('[useWorkoutSession] Failed to log set:', error);
        throw error;
      }
    },
    [
      currentWorkout,
      currentExercise,
      currentSetNumber,
      completedSets,
      exerciseIndex,
      exercises.length,
      logSet,
      nextExercise,
      weightUnit,
    ]
  );

  // Start rest timer
  const startRestTimer = async (durationSeconds: number) => {
    setIsTimerActive(true);

    await timerService.startRestTimer(
      durationSeconds,
      (_remaining) => {
        // Timer tick callback - handled by RestTimer component
      },
      () => {
        // Timer complete
        setIsTimerActive(false);
      }
    );
  };

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    setIsTimerActive(false);
  }, []);

  // Handle workout completion
  const handleCompleteWorkout = useCallback(async () => {
    try {
      await completeWorkout();
      console.log('[useWorkoutSession] Workout completed');
    } catch (error) {
      console.error('[useWorkoutSession] Failed to complete workout:', error);
      throw error;
    }
  }, [completeWorkout]);

  // Show cancel confirmation dialog
  const handleCancelWorkout = useCallback(() => {
    // This is handled by the UI layer (dialog state)
    console.log('[useWorkoutSession] Cancel workout requested');
  }, []);

  // Confirm and cancel workout
  const confirmCancelWorkout = useCallback(async () => {
    try {
      await cancelWorkout();
      console.log('[useWorkoutSession] Workout cancelled');
    } catch (error) {
      console.error('[useWorkoutSession] Failed to cancel workout:', error);
      throw error;
    }
  }, [cancelWorkout]);

  return {
    // Exercise state
    exercises,
    currentExercise,
    currentSetNumber,
    previousSet,

    // Timer state
    isTimerActive,

    // UI state
    videoModalVisible,
    historyExpanded,

    // Actions
    handleLogSet,
    handleCompleteWorkout,
    handleCancelWorkout,
    confirmCancelWorkout,
    handleTimerComplete,
    setVideoModalVisible,
    setHistoryExpanded,

    // Refs
    setLogCardRef,
  };
}
