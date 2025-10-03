/**
 * WorkoutScreen (T057)
 *
 * Main workout interface for logging sets during an active workout session.
 * Uses workoutStore for state management and timerService for rest periods.
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, AccessibilityInfo, findNodeHandle } from 'react-native';
import { Text, Button, ProgressBar, IconButton, Dialog, Portal, Paragraph } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useWorkoutStore } from '../stores/workoutStore';
import { type ProgramExercise } from '../services/database/programDb';
import { getSetsForExercise, getWorkoutById } from '../services/database/workoutDb';
import SetLogCard from '../components/workout/SetLogCard';
import RestTimer from '../components/workout/RestTimer';
import * as timerService from '../services/timer/timerService';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/typography';

interface WorkoutScreenProps {
  navigation?: any; // For future navigation implementation
}

export default function WorkoutScreen({}: WorkoutScreenProps) {
  const navigation = useNavigation();
  const {
    currentWorkout,
    exerciseIndex,
    completedSets,
    logSet,
    nextExercise,
    completeWorkout,
    cancelWorkout,
    resumeWorkout,
  } = useWorkoutStore();

  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<ProgramExercise | null>(null);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [previousSet, setPreviousSet] = useState<{ weight: number; reps: number } | null>(null);
  const [checkedForActiveWorkout, setCheckedForActiveWorkout] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);

  // Accessibility: Ref for auto-focus after set completion
  const setLogCardRef = useRef<View>(null);

  // Check for active workout on mount (resume if found)
  useEffect(() => {
    if (checkedForActiveWorkout || currentWorkout) {
      return;
    }

    const checkActiveWorkout = async () => {
      try {
        // Import getUserId to get current user
        const { getUserId } = await import('../services/api/authApi');
        const userId = await getUserId();

        if (!userId) {
          setCheckedForActiveWorkout(true);
          return;
        }

        // Import workoutDb to check for in-progress workout
        const workoutDb = await import('../services/database/workoutDb');
        const todayWorkout = await workoutDb.getTodayWorkout(userId);

        if (todayWorkout && todayWorkout.status === 'in_progress') {
          console.log('[WorkoutScreen] Found active workout, resuming:', todayWorkout.id);
          await resumeWorkout(todayWorkout.id);
        }
      } catch (error) {
        console.error('[WorkoutScreen] Error checking for active workout:', error);
      } finally {
        setCheckedForActiveWorkout(true);
      }
    };

    void checkActiveWorkout();
  }, [checkedForActiveWorkout, currentWorkout, resumeWorkout]);

  // Load exercises from the workout (API includes exercises in workout response)
  useEffect(() => {
    if (!currentWorkout) {
      return;
    }

    const loadExercises = async () => {
      try {
        // Fetch workout from API - exercises are included in the response
        const workout = await getWorkoutById(currentWorkout.id);

        if (workout && workout.exercises && workout.exercises.length > 0) {
          setExercises(workout.exercises);

          if (workout.exercises.length > exerciseIndex) {
            setCurrentExercise(workout.exercises[exerciseIndex]);
          }
        } else {
          console.error('[WorkoutScreen] No exercises found in workout');
        }
      } catch (error) {
        console.error('[WorkoutScreen] Failed to load exercises:', error);
      }
    };

    loadExercises();
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
      loadPreviousSetData();
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
      console.error('[WorkoutScreen] Failed to load previous set:', error);
    }
  };

  // Handle set completion
  const handleLogSet = async (weightKg: number, reps: number, rir: number) => {
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
          console.log('[WorkoutScreen] Moving to next exercise');
          nextExercise();
        } else {
          // All exercises complete, end workout
          await handleCompleteWorkout();
          return;
        }
      }

      // Accessibility: Announce set completion to screen reader
      AccessibilityInfo.announceForAccessibility(
        `Set ${currentSetNumber} completed. ${weightKg} kilograms for ${reps} reps. Rest timer started.`
      );

      // Start rest timer (3 minutes = 180 seconds)
      startRestTimer(180);

      // Accessibility: Focus back to weight input after brief delay
      setTimeout(() => {
        const reactTag = findNodeHandle(setLogCardRef.current);
        if (reactTag) {
          AccessibilityInfo.setAccessibilityFocus(reactTag);
        }
      }, 500);
    } catch (error) {
      console.error('[WorkoutScreen] Failed to log set:', error);
    }
  };

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
  const handleTimerComplete = () => {
    setIsTimerActive(false);
  };

  // Handle workout completion
  const handleCompleteWorkout = async () => {
    try {
      await completeWorkout();
      // TODO: Navigate to workout summary
      console.log('[WorkoutScreen] Workout completed');
    } catch (error) {
      console.error('[WorkoutScreen] Failed to complete workout:', error);
    }
  };

  // Show cancel confirmation dialog
  const handleCancelWorkout = () => {
    setCancelDialogVisible(true);
  };

  // Confirm and cancel workout
  const confirmCancelWorkout = async () => {
    try {
      setCancelDialogVisible(false);
      await cancelWorkout();
      console.log('[WorkoutScreen] Workout cancelled, navigating back');
      navigation.goBack();
    } catch (error) {
      console.error('[WorkoutScreen] Failed to cancel workout:', error);
    }
  };

  if (!currentWorkout || !currentExercise) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.background.primary, colors.background.secondary]}
          style={styles.gradient}
        >
          <View style={styles.emptyState}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>No Active Workout</Text>
            <Text variant="bodyMedium" style={styles.emptyDescription}>
              Start a workout from the Dashboard
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSetCount = completedSets.length;
  const progress = totalSets > 0 ? completedSetCount / totalSets : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.gradient}
      >
        {/* Workout Info with Progress */}
        <View style={styles.stickyHeader}>
          <View style={styles.workoutInfo}>
            <View style={styles.headerContent} accessible={true} accessibilityRole="header">
              <Text variant="labelMedium" style={styles.headerLabel}>ACTIVE WORKOUT</Text>
              <Text variant="headlineSmall" style={styles.headerTitle}>
                {currentExercise.exercise_name}
              </Text>
            </View>
            <IconButton
              icon="close"
              iconColor={colors.text.secondary}
              size={24}
              onPress={handleCancelWorkout}
              accessibilityLabel="Cancel workout"
            />
          </View>

          {/* Progress Bar */}
          <View
            style={styles.progressContainer}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel={`Workout progress: ${completedSetCount} of ${totalSets} sets complete`}
            accessibilityValue={{ min: 0, max: totalSets, now: completedSetCount }}
          >
            <View style={styles.progressHeader}>
              <Text variant="titleSmall" style={styles.progressText}>
                Set {currentSetNumber} of {currentExercise.sets}
              </Text>
              <Text variant="bodySmall" style={styles.progressTotal}>
                {completedSetCount}/{totalSets} total
              </Text>
            </View>
            <ProgressBar
              progress={progress}
              color={colors.primary.main}
              style={styles.progressBar}
            />
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Rest Timer */}
          <RestTimer isActive={isTimerActive} onComplete={handleTimerComplete} />

          {/* Set Logging Card */}
          <View ref={setLogCardRef}>
            <SetLogCard
              exerciseName={currentExercise.exercise_name}
              setNumber={currentSetNumber}
              targetReps={currentExercise.reps}
              targetRir={currentExercise.rir}
              previousWeight={previousSet?.weight}
              previousReps={previousSet?.reps}
              onLogSet={handleLogSet}
            />
          </View>

          {/* Complete Workout Button */}
          {completedSetCount >= totalSets && (
            <Button
              mode="contained"
              onPress={handleCompleteWorkout}
              style={styles.completeWorkoutButton}
              buttonColor={colors.success.main}
              textColor="#000000"
              contentStyle={styles.completeButtonContent}
              labelStyle={styles.completeButtonLabel}
              icon="check-circle"
              accessibilityLabel="Complete workout"
            >
              Finish Workout
            </Button>
          )}
        </ScrollView>
      </LinearGradient>

      {/* Cancel Workout Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={cancelDialogVisible}
          onDismiss={() => setCancelDialogVisible(false)}
          style={styles.cancelDialog}
        >
          <Dialog.Title>Exit Workout?</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              All logged sets will be deleted and the workout will be reset. You can start it again later.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelDialogVisible(false)}>Keep Training</Button>
            <Button
              onPress={confirmCancelWorkout}
              textColor={colors.error.main}
            >
              Exit
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  gradient: {
    flex: 1,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Header
  stickyHeader: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.effects.divider,
  },
  workoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingRight: spacing.xs,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  headerLabel: {
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    color: colors.text.primary,
    fontWeight: '700',
  },

  // Progress
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  progressTotal: {
    color: colors.text.tertiary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background.tertiary,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },

  // Complete Button
  completeWorkoutButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
  },
  completeButtonContent: {
    height: 56,
  },
  completeButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Cancel Dialog
  cancelDialog: {
    backgroundColor: colors.background.secondary,
  },
});
