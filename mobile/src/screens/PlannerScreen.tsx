/**
 * Planner Screen (T061, T092-T096)
 *
 * Program planner showing:
 * - Display program days (Push A, Pull A, etc.)
 * - Exercise list with drag-and-drop reordering capability (T094)
 * - MEV/MAV/MRV volume validation overlay (T092)
 * - Exercise swap search with ExerciseSelectionModal (T093)
 * - Phase progression with PhaseProgressIndicator (T096)
 * - Offline detection and blocking overlay (T095)
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import {
  Card,
  Button,
  Text,
  Divider,
  ActivityIndicator,
  IconButton,
  Snackbar,
  Menu,
  Dialog,
  Paragraph,
  Portal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../theme/colors';

// API imports
import { ReorderItem } from '../services/api/programExerciseApi';
import { Exercise } from '../services/api/exerciseApi';

// Hook imports
import { useProgramData } from '../hooks/useProgramData';

// Component imports
import PhaseProgressIndicator from '../components/planner/PhaseProgressIndicator';
import ProgramVolumeOverview, {
  MuscleGroupVolume,
} from '../components/planner/ProgramVolumeOverview';
import ExerciseSelectionModal from '../components/planner/ExerciseSelectionModal';
import OfflineOverlay from '../components/common/OfflineOverlay';
import { ExerciseListSkeleton } from '../components/skeletons';
import ProgramCreationWizard from '../components/planner/ProgramCreationWizard';

interface PlannerScreenProps {
  userId?: number; // Optional for demo purposes
}

export default function PlannerScreen({ userId }: PlannerScreenProps) {
  // Program data hook (replaces manual state management)
  const {
    program,
    volumeAnalysis,
    isLoading,
    swapExercise: swapExerciseMutation,
    reorderExercises: reorderExercisesMutation,
    updateExercise: updateExerciseMutation,
    deleteExercise: deleteExerciseMutation,
    addExercise: addExerciseMutation,
  } = useProgramData();

  // UI state
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);

  // Offline state (T095)
  const [isOffline, setIsOffline] = useState(false);

  // Exercise swap modal state (T093)
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [swapMuscleGroupFilter, setSwapMuscleGroupFilter] = useState<string | undefined>(undefined);

  // Exercise menu state
  const [menuVisible, setMenuVisible] = useState<number | null>(null);

  // Delete exercise dialog state
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ id: number; name: string } | null>(
    null
  );

  // Add exercise modal state
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);

  // Program creation wizard state
  const [wizardVisible, setWizardVisible] = useState(false);

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  /**
   * Select first day when program loads
   */
  useEffect(() => {
    if (program && program.program_days.length > 0 && !selectedDayId) {
      setSelectedDayId(program.program_days[0].id);
    }
  }, [program, selectedDayId]);

  /**
   * Listen for network status changes (T095)
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

  /**
   * Handle exercise swap (T093)
   */
  const handleExerciseSwap = (programExerciseId: number, muscleGroup?: string) => {
    setSelectedExerciseId(programExerciseId);
    setSwapMuscleGroupFilter(muscleGroup);
    setSwapModalVisible(true);
  };

  /**
   * Confirm exercise swap (T093)
   */
  const handleConfirmSwap = async (newExercise: Exercise) => {
    if (!selectedExerciseId) return;

    try {
      // Haptic feedback on swap (mobile only)
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await swapExerciseMutation(selectedExerciseId, newExercise.id);

      // Type guard: result is SwapExerciseResponse
      if ('old_exercise_name' in result && 'new_exercise_name' in result) {
        console.log(
          `[PlannerScreen] Swapped ${result.old_exercise_name} → ${result.new_exercise_name}`
        );

        // Show success message
        showSnackbar(`Swapped to ${result.new_exercise_name}`);
      }

      // Show volume warning if present
      if (result.volume_warning) {
        showSnackbar(result.volume_warning);
      }

      // Close modal
      setSwapModalVisible(false);
      setSelectedExerciseId(null);
      setSwapMuscleGroupFilter(undefined);
    } catch (error) {
      console.error('[PlannerScreen] Error swapping exercise:', error);
      showSnackbar('Failed to swap exercise. Please try again.');
    }
  };

  /**
   * Handle drag-and-drop reorder (T094)
   */
  const handleReorder = async (data: any[]) => {
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

      console.log('[PlannerScreen] Reordered exercises:', reorderItems);
    } catch (error) {
      console.error('[PlannerScreen] Error reordering exercises:', error);
      showSnackbar('Failed to reorder exercises. Please try again.');
    }
  };

  /**
   * Handle phase advancement (T096)
   * Note: Actual API call happens in PhaseProgressIndicator component
   */
  const handleAdvancePhase = async (newPhase: string, volumeMultiplier: number) => {
    try {
      console.log(`[PlannerScreen] Advanced to ${newPhase} (${volumeMultiplier}x volume)`);

      // Show success message
      showSnackbar(`Advanced to ${newPhase.toUpperCase()} phase`);

      // Query invalidation happens automatically via TanStack Query
    } catch (error) {
      console.error('[PlannerScreen] Error handling phase advance:', error);
    }
  };

  /**
   * Handle set count adjustment
   */
  const handleAdjustSets = async (programExerciseId: number, newSets: number) => {
    if (newSets < 1 || newSets > 10) return;

    try {
      const result = await updateExerciseMutation(programExerciseId, {
        target_sets: newSets,
      });

      console.log(`[PlannerScreen] Updated sets to ${newSets}`);

      // Show volume warning if present
      if (result.volume_warning) {
        showSnackbar(result.volume_warning);
      } else {
        showSnackbar(`Sets updated to ${newSets}`);
      }
    } catch (error) {
      console.error('[PlannerScreen] Error updating sets:', error);
      showSnackbar('Failed to update sets. Please try again.');
    }
  };

  /**
   * Handle exercise deletion with confirmation
   */
  const handleDeleteExercise = (programExerciseId: number, exerciseName: string) => {
    setExerciseToDelete({ id: programExerciseId, name: exerciseName });
    setDeleteDialogVisible(true);
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;

    try {
      // Haptic feedback on deletion (mobile only)
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      await deleteExerciseMutation(exerciseToDelete.id);

      console.log(`[PlannerScreen] Deleted ${exerciseToDelete.name}`);

      // Show success message
      showSnackbar(`Removed ${exerciseToDelete.name}`);

      // Close dialog
      setDeleteDialogVisible(false);
      setExerciseToDelete(null);
    } catch (error) {
      console.error('[PlannerScreen] Error deleting exercise:', error);
      showSnackbar('Failed to remove exercise. Please try again.');
    }
  };

  /**
   * Handle adding new exercise to program day
   */
  const handleAddExercise = async (exercise: Exercise) => {
    if (!selectedDayId) return;

    try {
      // Haptic feedback on exercise addition (mobile only)
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Calculate next order_index
      const nextOrderIndex = selectedDayExercises.length;

      const result = await addExerciseMutation({
        program_day_id: selectedDayId,
        exercise_id: exercise.id,
        target_sets: exercise.default_sets,
        target_rep_range: exercise.default_reps,
        target_rir: exercise.default_rir,
        order_index: nextOrderIndex,
      });

      console.log(`[PlannerScreen] Added ${exercise.name}`);

      // Show volume warning if present
      if (result.volume_warning) {
        showSnackbar(result.volume_warning);
      } else {
        showSnackbar(`Added ${exercise.name}`);
      }

      // Close modal
      setAddExerciseModalVisible(false);
    } catch (error) {
      console.error('[PlannerScreen] Error adding exercise:', error);
      showSnackbar('Failed to add exercise. Please try again.');
    }
  };

  /**
   * Show snackbar message
   */
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  /**
   * Handle program creation via wizard
   */
  const handleCreateProgram = async () => {
    try {
      // Import createProgram function dynamically to avoid circular dependencies
      const { createProgram } = await import('../services/api/programApi');

      await createProgram();

      console.log('[PlannerScreen] Program created successfully');
    } catch (error) {
      console.error('[PlannerScreen] Error creating program:', error);
      throw error; // Let wizard handle error display
    }
  };

  /**
   * Handle program creation success
   */
  const handleProgramCreated = () => {
    showSnackbar('Program created! Welcome to FitFlow Pro!');
    // Program data will refresh automatically via TanStack Query
  };

  /**
   * Get selected day's exercises
   */
  const selectedDayExercises =
    program?.program_days.find((day) => day.id === selectedDayId)?.exercises || [];

  /**
   * Render draggable exercise item (T094)
   */
  const renderExerciseItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
    const muscleGroups = item.muscle_groups ? JSON.parse(item.muscle_groups) : [];
    const primaryMuscleGroup = muscleGroups[0] || '';

    return (
      <ScaleDecorator>
        <Card
          style={[styles.exerciseCard, isActive && styles.exerciseCardDragging]}
          elevation={isActive ? 5 : 2}
        >
          <Card.Content style={styles.exerciseCardContent}>
            <View style={styles.exerciseInfo}>
              <Text variant="bodyLarge" style={styles.exerciseName}>
                {item.exercise_name}
              </Text>
              <View style={styles.exerciseDetailsRow}>
                <View style={styles.setAdjuster}>
                  <IconButton
                    icon="minus"
                    size={20}
                    onPress={() => handleAdjustSets(item.id, item.target_sets - 1)}
                    disabled={isOffline || item.target_sets <= 1}
                    style={[styles.setButton, styles.iconButtonContainer]}
                    accessibilityLabel="Decrease sets"
                  />
                  <Text variant="bodySmall" style={styles.exerciseDetails}>
                    {item.target_sets} sets
                  </Text>
                  <IconButton
                    icon="plus"
                    size={20}
                    onPress={() => handleAdjustSets(item.id, item.target_sets + 1)}
                    disabled={isOffline || item.target_sets >= 10}
                    style={[styles.setButton, styles.iconButtonContainer]}
                    accessibilityLabel="Increase sets"
                  />
                </View>
                <Text variant="bodySmall" style={styles.exerciseDetails}>
                  × {item.target_rep_range} @ RIR {item.target_rir}
                </Text>
              </View>
            </View>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={24}
                  onPress={() => setMenuVisible(item.id)}
                  disabled={isOffline}
                  style={styles.iconButtonContainer}
                  accessibilityLabel={`Options for ${item.exercise_name}`}
                  accessibilityHint="Show exercise options menu"
                  accessibilityRole="button"
                />
              }
            >
              <Menu.Item
                leadingIcon="swap-horizontal"
                onPress={() => {
                  setMenuVisible(null);
                  handleExerciseSwap(item.id, primaryMuscleGroup);
                }}
                title="Swap Exercise"
              />
              <Menu.Item
                leadingIcon="delete"
                onPress={() => {
                  setMenuVisible(null);
                  handleDeleteExercise(item.id, item.exercise_name);
                }}
                title="Remove Exercise"
              />
            </Menu>
            <TouchableOpacity
              onLongPress={drag}
              disabled={isActive}
              style={styles.dragHandle}
              activeOpacity={0.6}
              accessibilityLabel="Drag to reorder exercise"
              accessibilityHint="Long press and drag to change exercise order"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="drag-horizontal-variant"
                size={28}
                color={colors.text.primary} // FIX P0-7: Changed from secondary to primary for better contrast (≥3:1)
              />
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </ScaleDecorator>
    );
  };

  // Offline overlay (T095)
  if (isOffline) {
    return (
      <View style={styles.container}>
        <OfflineOverlay message="Program editing requires internet connection" />
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.listContent}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Training Days
              </Text>
            </Card.Content>
          </Card>
          <ExerciseListSkeleton count={5} />
        </ScrollView>
      </View>
    );
  }

  // No program state
  if (!program) {
    return (
      <View style={styles.container}>
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyCardContent}>
            <MaterialCommunityIcons
              name="calendar-check-outline"
              size={80}
              color={colors.text.disabled}
            />
            <Text variant="headlineMedium" style={styles.emptyTitle}>
              No Active Program
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Create your personalized training program based on Renaissance Periodization
              principles
            </Text>
            <Text variant="bodySmall" style={styles.emptyHelperText}>
              Your program will automatically progress through MEV → MAV → MRV phases
            </Text>
            <Button
              mode="contained"
              icon="plus-circle"
              onPress={() => setWizardVisible(true)}
              disabled={isOffline}
              style={styles.createProgramButton}
              contentStyle={styles.createProgramButtonContent}
              accessibilityLabel="Create training program"
            >
              Create Your First Program
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  const selectedDay = program.program_days.find((day) => day.id === selectedDayId);

  /**
   * Render header with training days selector
   */
  const renderListHeader = () => (
    <>
      {/* 1. Training Days */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Training Days
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
            {program.program_days.map((day) => (
              <Button
                key={day.id}
                mode={selectedDayId === day.id ? 'contained' : 'outlined'}
                onPress={() => setSelectedDayId(day.id)}
                style={styles.dayButton}
                compact
              >
                {day.day_name}
              </Button>
            ))}
          </ScrollView>
        </Card.Content>
      </Card>

      {/* 2. Exercise List Header */}
      {selectedDay && (
        <Card style={styles.cardHeader}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Exercises - {selectedDay.day_name}
            </Text>
          </Card.Content>
        </Card>
      )}
    </>
  );

  /**
   * Render footer with volume and phase info
   */
  const renderListFooter = () => (
    <>
      {/* Add Exercise Button */}
      {selectedDay && selectedDayExercises.length > 0 && (
        <View style={styles.exerciseListContainer}>
          <Button
            mode="outlined"
            icon="plus"
            onPress={() => setAddExerciseModalVisible(true)}
            disabled={isOffline}
            style={styles.addExerciseButton}
          >
            Add Exercise
          </Button>
        </View>
      )}

      {/* 3. Program Volume Overview (T092) */}
      {volumeAnalysis && (
        <ProgramVolumeOverview
          muscleGroups={volumeAnalysis.muscle_groups.map(
            (mg): MuscleGroupVolume => ({
              muscle_group: mg.muscle_group,
              planned_weekly_sets: mg.planned_weekly_sets,
              mev: mg.mev,
              mav: mg.mav,
              mrv: mg.mrv,
              zone: mg.zone as 'below_mev' | 'adequate' | 'optimal' | 'above_mrv',
              warning: mg.warning,
            })
          )}
        />
      )}

      {/* 4. Phase Progress Indicator (T096) */}
      <PhaseProgressIndicator
        currentPhase={program.mesocycle_phase}
        currentWeek={program.mesocycle_week}
        programId={program.id}
        onAdvancePhase={handleAdvancePhase}
      />
    </>
  );

  /**
   * Render empty state when no exercises
   */
  const renderEmptyComponent = () => (
    <View style={styles.exerciseListContainer}>
      <Card style={styles.emptyCard}>
        <Card.Content>
          <Text variant="bodyMedium" style={styles.emptyText}>
            No exercises for this day
          </Text>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setAddExerciseModalVisible(true)}
            disabled={isOffline}
            style={styles.addFirstExerciseButton}
          >
            Add First Exercise
          </Button>
        </Card.Content>
      </Card>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.flex}>
      <View style={styles.container}>
        <DraggableFlatList
          data={selectedDayExercises}
          onDragEnd={({ data }) => void handleReorder(data)}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderExerciseItem}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={styles.listContent}
        />

        {/* Exercise Swap Modal (T093) */}
        <ExerciseSelectionModal
          visible={swapModalVisible}
          onDismiss={() => {
            setSwapModalVisible(false);
            setSelectedExerciseId(null);
            setSwapMuscleGroupFilter(undefined);
          }}
          onSelectExercise={handleConfirmSwap}
          muscleGroupFilter={swapMuscleGroupFilter}
          excludeExercises={
            selectedExerciseId
              ? [
                  selectedDayExercises.find((ex) => ex.id === selectedExerciseId)?.exercise_id,
                ].filter((id): id is number => id !== undefined)
              : []
          }
        />

        {/* Add Exercise Modal */}
        <ExerciseSelectionModal
          visible={addExerciseModalVisible}
          onDismiss={() => setAddExerciseModalVisible(false)}
          onSelectExercise={handleAddExercise}
          muscleGroupFilter={undefined}
          excludeExercises={[]}
        />

        {/* Program Creation Wizard */}
        <ProgramCreationWizard
          visible={wizardVisible}
          onDismiss={() => setWizardVisible(false)}
          onProgramCreated={handleProgramCreated}
          onCreateProgram={handleCreateProgram}
        />

        {/* Snackbar */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          action={{
            label: 'Close',
            onPress: () => setSnackbarVisible(false),
          }}
        >
          {snackbarMessage}
        </Snackbar>
      </View>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Remove Exercise</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Remove "{exerciseToDelete?.name}" from this day?</Paragraph>
            <Paragraph style={{ marginTop: 8, color: colors.text.secondary }}>
              This may affect your weekly volume targets.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDeleteExercise} textColor={colors.error.main}>
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.background.secondary,
  },
  cardHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: colors.background.secondary,
  },
  exerciseListContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyCard: {
    margin: 16,
    backgroundColor: colors.background.secondary,
  },
  emptyCardContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyHelperText: {
    marginTop: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  createProgramButton: {
    marginTop: 24,
    borderRadius: 8,
  },
  createProgramButtonContent: {
    height: 48,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text.primary,
  },
  daysScroll: {
    marginTop: 8,
  },
  dayButton: {
    marginRight: 8,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: colors.effects.divider,
  },
  exerciseCard: {
    marginBottom: 12,
    backgroundColor: colors.background.tertiary,
  },
  exerciseCardDragging: {
    opacity: 0.8,
    backgroundColor: colors.primary.main + '20',
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  dragHandle: {
    marginLeft: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    minWidth: 52,
    minHeight: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // FIX P0-7: Subtle background for better discoverability
    borderRadius: 8,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 8,
  },
  exerciseName: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  exerciseDetails: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  exerciseDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  setButton: {
    margin: 0,
  },
  iconButtonContainer: {
    minWidth: 48,
    minHeight: 48,
  },
  emptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  addExerciseButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  addFirstExerciseButton: {
    marginTop: 16,
  },
});
