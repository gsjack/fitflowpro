/**
 * Alternative Exercise Suggestions Component (T078)
 *
 * Displays alternative exercises with the same primary muscle group.
 * Features:
 * - Fetches exercises with same primary muscle group
 * - Shows equipment and difficulty differences
 * - Swap functionality with confirmation dialog
 * - Volume warning display after swap
 * - Loading and error states
 *
 * Uses React Native Paper Dialog (NOT Alert.alert per CLAUDE.md)
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  Dialog,
  Portal,
  Paragraph,
  useTheme,
  Chip,
} from 'react-native-paper';
import { Exercise, getExercises } from '../../services/api/exerciseApi';
import { swapExercise } from '../../services/api/programExerciseApi';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface AlternativeExerciseSuggestionsProps {
  currentExerciseId: number;
  currentExerciseName: string;
  currentMuscleGroup: string;
  currentEquipment: string;
  programExerciseId: number; // ID of program_exercise to swap
  onSwapExercise: (newExerciseId: number, newExerciseName: string) => void;
  onCancel: () => void;
}

/**
 * Alternative Exercise Suggestions Component
 *
 * @param currentExerciseId - ID of current exercise
 * @param currentExerciseName - Name of current exercise
 * @param currentMuscleGroup - Primary muscle group to filter by
 * @param currentEquipment - Equipment type of current exercise
 * @param programExerciseId - Program exercise ID to swap
 * @param onSwapExercise - Callback after successful swap
 * @param onCancel - Callback to dismiss component
 */
export default function AlternativeExerciseSuggestions({
  currentExerciseId,
  currentExerciseName,
  currentMuscleGroup,
  currentEquipment,
  programExerciseId,
  onSwapExercise,
  onCancel,
}: AlternativeExerciseSuggestionsProps) {
  const theme = useTheme();

  // Data state
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Swap state
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [volumeWarning, setVolumeWarning] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

  /**
   * Fetch alternative exercises with same primary muscle group
   */
  const fetchAlternatives = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getExercises({
        muscle_group: currentMuscleGroup,
      });

      // Filter out current exercise and sort by equipment match
      const filtered = response.exercises
        .filter((ex) => ex.id !== currentExerciseId)
        .sort((a, b) => {
          // Same equipment first
          const aMatch = a.equipment === currentEquipment ? 0 : 1;
          const bMatch = b.equipment === currentEquipment ? 0 : 1;
          if (aMatch !== bMatch) return aMatch - bMatch;

          // Then alphabetically
          return a.name.localeCompare(b.name);
        });

      setAlternatives(filtered);
    } catch (err) {
      console.error('[AlternativeExerciseSuggestions] Failed to fetch alternatives:', err);
      setError('Failed to load alternative exercises. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch alternatives on mount
  useEffect(() => {
    void fetchAlternatives();
  }, [currentMuscleGroup, currentExerciseId]);

  /**
   * Show confirmation dialog for swap
   */
  const handleSwapPress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setConfirmDialogVisible(true);
  };

  /**
   * Execute exercise swap
   */
  const handleConfirmSwap = async () => {
    if (!selectedExercise) return;

    setIsSwapping(true);
    setSwapError(null);
    setVolumeWarning(null);

    try {
      const result = await swapExercise(programExerciseId, selectedExercise.id);

      console.log(
        `[AlternativeExerciseSuggestions] Swapped ${result.old_exercise_name} → ${result.new_exercise_name}`
      );

      // Display volume warning if present
      if (result.volume_warning) {
        setVolumeWarning(result.volume_warning);
      }

      // Close confirmation dialog
      setConfirmDialogVisible(false);

      // Notify parent of successful swap
      onSwapExercise(selectedExercise.id, selectedExercise.name);
    } catch (err) {
      console.error('[AlternativeExerciseSuggestions] Swap failed:', err);

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to swap exercise. Please try again.';

      setSwapError(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

  /**
   * Cancel confirmation dialog
   */
  const handleCancelSwap = () => {
    setConfirmDialogVisible(false);
    setSelectedExercise(null);
    setSwapError(null);
  };

  /**
   * Render exercise card
   */
  const renderExerciseCard = (exercise: Exercise) => {
    const isSameEquipment = exercise.equipment === currentEquipment;

    return (
      <Card
        key={exercise.id}
        style={styles.exerciseCard}
        elevation={2}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Swap to ${exercise.name}`}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" style={styles.exerciseName}>
              {exercise.name}
            </Text>
            {isSameEquipment && (
              <Chip
                compact
                mode="flat"
                style={[styles.sameEquipmentChip, { backgroundColor: colors.success.bg }]}
                textStyle={{ color: colors.success.main }}
              >
                Same Equipment
              </Chip>
            )}
          </View>

          <View style={styles.exerciseMeta}>
            <Text variant="bodySmall" style={styles.metaText}>
              Equipment: <Text style={styles.metaValue}>{exercise.equipment}</Text>
            </Text>
            {exercise.difficulty && (
              <Text variant="bodySmall" style={styles.metaText}>
                Difficulty: <Text style={styles.metaValue}>{exercise.difficulty}</Text>
              </Text>
            )}
            <Text variant="bodySmall" style={styles.metaText}>
              Type: <Text style={styles.metaValue}>{exercise.movement_pattern}</Text>
            </Text>
          </View>

          {/* Show equipment difference if different */}
          {!isSameEquipment && (
            <Text variant="labelSmall" style={styles.equipmentWarning}>
              ⚠️ Different equipment: {currentEquipment} → {exercise.equipment}
            </Text>
          )}

          <Button
            mode="contained"
            onPress={() => handleSwapPress(exercise)}
            style={styles.swapButton}
            disabled={isSwapping}
            accessibilityLabel={`Swap to ${exercise.name}`}
            accessibilityHint="Opens confirmation dialog before swapping"
          >
            Swap
          </Button>
        </Card.Content>
      </Card>
    );
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Finding alternative exercises...
          </Text>
        </View>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant="titleMedium" style={[styles.errorTitle, { color: theme.colors.error }]}>
            {error}
          </Text>
          <Button
            mode="contained"
            onPress={() => void fetchAlternatives()}
            style={styles.retryButton}
          >
            Retry
          </Button>
          <Button mode="text" onPress={onCancel} style={styles.cancelButton}>
            Cancel
          </Button>
        </View>
      </View>
    );
  }

  /**
   * Render empty state
   */
  if (alternatives.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No alternatives found
          </Text>
          <Text variant="bodyMedium" style={styles.emptyMessage}>
            No other exercises target {currentMuscleGroup}
          </Text>
          <Button mode="text" onPress={onCancel} style={styles.cancelButton}>
            Cancel
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          Alternative Exercises
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Replacing: <Text style={styles.currentExercise}>{currentExerciseName}</Text>
        </Text>
      </View>

      {/* Volume Warning (after swap) */}
      {volumeWarning && (
        <Card style={[styles.warningCard, { backgroundColor: colors.warning.bg }]}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: colors.warning.main }}>
              ⚠️ {volumeWarning}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Swap Error */}
      {swapError && (
        <Card style={[styles.errorCard, { backgroundColor: colors.error.bg }]}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: colors.error.main }}>
              {swapError}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Exercise List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {alternatives.map((exercise) => renderExerciseCard(exercise))}
      </ScrollView>

      {/* Cancel Button */}
      <Button mode="outlined" onPress={onCancel} style={styles.bottomCancelButton}>
        Cancel
      </Button>

      {/* Confirmation Dialog (React Native Paper, NOT Alert.alert) */}
      <Portal>
        <Dialog
          visible={confirmDialogVisible}
          onDismiss={handleCancelSwap}
        >
          <Dialog.Title>Confirm Exercise Swap</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to swap{' '}
              <Text style={styles.boldText}>{currentExerciseName}</Text> with{' '}
              <Text style={styles.boldText}>{selectedExercise?.name}</Text>?
            </Paragraph>
            <Paragraph style={styles.dialogSubtext}>
              This will preserve your sets, reps, and RIR settings.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelSwap} disabled={isSwapping}>
              Cancel
            </Button>
            <Button
              onPress={() => void handleConfirmSwap()}
              disabled={isSwapping}
              mode="contained"
              loading={isSwapping}
            >
              {isSwapping ? 'Swapping...' : 'Swap'}
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
  header: {
    padding: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.effects.divider,
  },
  title: {
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary,
  },
  currentExercise: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  warningCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  errorCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  exerciseCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  exerciseName: {
    flex: 1,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  sameEquipmentChip: {
    height: 24,
  },
  exerciseMeta: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  metaText: {
    color: colors.text.secondary,
  },
  metaValue: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  equipmentWarning: {
    color: colors.warning.main,
    marginBottom: spacing.md,
  },
  swapButton: {
    marginTop: spacing.sm,
  },
  bottomCancelButton: {
    margin: spacing.lg,
    marginTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  boldText: {
    fontWeight: 'bold',
  },
  dialogSubtext: {
    marginTop: spacing.md,
    color: colors.text.secondary,
  },
});
