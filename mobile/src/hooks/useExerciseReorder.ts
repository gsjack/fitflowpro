/**
 * useExerciseReorder Hook
 *
 * Manages drag-and-drop reordering logic for program exercises.
 * Provides callbacks for reordering, moving up/down, and handles haptic feedback.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ReorderItem } from '../services/api/programExerciseApi';

interface ProgramExercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  order_index: number;
}

interface UseExerciseReorderParams {
  selectedDayId: number | null;
  reorderExercisesMutation: (dayId: number, items: ReorderItem[]) => Promise<void>;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useExerciseReorder({
  selectedDayId,
  reorderExercisesMutation,
  _onSuccess,
  onError,
}: UseExerciseReorderParams) {
  /**
   * Handle drag-and-drop reorder
   */
  const handleReorder = async (data: ProgramExercise[]) => {
    if (!selectedDayId) return;

    try {
      // Haptic feedback on reorder completion (mobile only)
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Build reorder array
      const reorderItems: ReorderItem[] = data.map((item, index) => ({
        program_exercise_id: item.id,
        new_order_index: index,
      }));

      // Call mutation (optimistic update handles UI)
      await reorderExercisesMutation(selectedDayId, reorderItems);

      console.log('[useExerciseReorder] Reordered exercises:', reorderItems);
    } catch (error) {
      console.error('[useExerciseReorder] Error reordering exercises:', error);
      onError?.('Failed to reorder exercises. Please try again.');
    }
  };

  /**
   * Move exercise up in the list (web platform)
   */
  const moveExerciseUp = async (exercises: ProgramExercise[], index: number) => {
    if (index === 0) return; // Already at top

    const newData = [...exercises];
    // Swap with previous item
    const temp = newData[index - 1];
    newData[index - 1] = newData[index];
    newData[index] = temp;

    await handleReorder(newData);
  };

  /**
   * Move exercise down in the list (web platform)
   */
  const moveExerciseDown = async (exercises: ProgramExercise[], index: number) => {
    if (index === exercises.length - 1) return; // Already at bottom

    const newData = [...exercises];
    // Swap with next item
    const temp = newData[index + 1];
    newData[index + 1] = newData[index];
    newData[index] = temp;

    await handleReorder(newData);
  };

  return {
    handleReorder,
    moveExerciseUp,
    moveExerciseDown,
  };
}
