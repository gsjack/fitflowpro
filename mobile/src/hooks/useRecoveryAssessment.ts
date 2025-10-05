/**
 * Recovery Assessment Hook
 *
 * Manages recovery assessment form state (sleep, soreness, motivation).
 * Handles submission logic with proper error handling.
 */

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRecoveryStore } from '../stores/recoveryStore';

export interface UseRecoveryAssessmentReturn {
  sleepQuality: string;
  muscleSoreness: string;
  mentalMotivation: string;
  setSleepQuality: (value: string) => void;
  setMuscleSoreness: (value: string) => void;
  setMentalMotivation: (value: string) => void;
  isSubmitting: boolean;
  isComplete: boolean;
  submit: (userId: number) => Promise<void>;
  reset: () => void;
  totalScore: number;
}

/**
 * Hook for managing recovery assessment form state
 *
 * @example
 * const recovery = useRecoveryAssessment();
 * recovery.setSleepQuality('4');
 * await recovery.submit(userId);
 */
export function useRecoveryAssessment(): UseRecoveryAssessmentReturn {
  const [sleepQuality, setSleepQuality] = useState('');
  const [muscleSoreness, setMuscleSoreness] = useState('');
  const [mentalMotivation, setMentalMotivation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { submitAssessment } = useRecoveryStore();

  const isComplete = Boolean(sleepQuality && muscleSoreness && mentalMotivation);

  const totalScore = isComplete
    ? parseInt(sleepQuality) + parseInt(muscleSoreness) + parseInt(mentalMotivation)
    : 0;

  const submit = useCallback(
    async (userId: number) => {
      if (!isComplete) {
        throw new Error('All recovery questions must be answered');
      }

      try {
        setIsSubmitting(true);

        // Haptic feedback on successful submission (mobile only)
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        await submitAssessment(
          userId,
          parseInt(sleepQuality),
          parseInt(muscleSoreness),
          parseInt(mentalMotivation)
        );

        // Reset form after successful submission
        setSleepQuality('');
        setMuscleSoreness('');
        setMentalMotivation('');
      } catch (error) {
        console.error('[useRecoveryAssessment] Error submitting recovery:', error);

        // Haptic feedback on error (mobile only)
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }

        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [sleepQuality, muscleSoreness, mentalMotivation, isComplete, submitAssessment]
  );

  const reset = useCallback(() => {
    setSleepQuality('');
    setMuscleSoreness('');
    setMentalMotivation('');
    setIsSubmitting(false);
  }, []);

  return {
    sleepQuality,
    muscleSoreness,
    mentalMotivation,
    setSleepQuality,
    setMuscleSoreness,
    setMentalMotivation,
    isSubmitting,
    isComplete,
    submit,
    reset,
    totalScore,
  };
}
