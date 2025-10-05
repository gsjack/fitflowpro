/**
 * Workout Swap Hook
 *
 * Manages workout day swapping dialog state and API calls.
 * Handles loading program days and swapping workout assignments.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { getAuthenticatedClient } from '../services/api/authApi';

export interface ProgramDay {
  id: number;
  day_name: string;
  day_type: 'strength' | 'vo2max';
  exercise_count?: number;
}

export interface UseWorkoutSwapReturn {
  showDialog: boolean;
  programDays: ProgramDay[];
  isLoadingDays: boolean;
  isSwapping: boolean;
  openDialog: () => Promise<void>;
  closeDialog: () => void;
  swapWorkout: (workoutId: number, newProgramDayId: number) => Promise<void>;
  onSwapSuccess?: () => Promise<void>;
}

export interface UseWorkoutSwapOptions {
  onSwapSuccess?: () => Promise<void>;
}

/**
 * Hook for managing workout swap dialog state
 *
 * @param options - Configuration options
 * @example
 * const workoutSwap = useWorkoutSwap({ onSwapSuccess: reloadDashboard });
 * await workoutSwap.openDialog();
 * await workoutSwap.swapWorkout(workoutId, newDayId);
 */
export function useWorkoutSwap(options?: UseWorkoutSwapOptions): UseWorkoutSwapReturn {
  const [showDialog, setShowDialog] = useState(false);
  const [programDays, setProgramDays] = useState<ProgramDay[]>([]);
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const openDialog = useCallback(async () => {
    setShowDialog(true);
    setIsLoadingDays(true);

    try {
      const client = await getAuthenticatedClient();
      const response = await client.get<ProgramDay[]>('/api/program-days');
      setProgramDays(response.data);
    } catch (error) {
      console.error('[useWorkoutSwap] Error loading program days:', error);
      Alert.alert('Error', 'Failed to load program days. Please try again.');
      setShowDialog(false);
    } finally {
      setIsLoadingDays(false);
    }
  }, []);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    setProgramDays([]);
  }, []);

  const swapWorkout = useCallback(
    async (workoutId: number, newProgramDayId: number) => {
      try {
        setIsSwapping(true);
        const client = await getAuthenticatedClient();
        await client.patch(`/api/workouts/${workoutId}`, {
          program_day_id: newProgramDayId,
        });

        // Close dialog
        setShowDialog(false);

        // Call success callback if provided
        if (options?.onSwapSuccess) {
          await options.onSwapSuccess();
        }
      } catch (error) {
        console.error('[useWorkoutSwap] Error swapping workout:', error);
        Alert.alert('Error', 'Failed to change workout. Please try again.');
        throw error;
      } finally {
        setIsSwapping(false);
      }
    },
    [options]
  );

  return {
    showDialog,
    programDays,
    isLoadingDays,
    isSwapping,
    openDialog,
    closeDialog,
    swapWorkout,
    onSwapSuccess: options?.onSwapSuccess,
  };
}
