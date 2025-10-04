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
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Card,
  Button,
  Text,
  Divider,
  ActivityIndicator,
  IconButton,
  Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../theme/colors';

// API imports
import { getUserProgram, Program } from '../services/api/programApi';
import { getProgramVolumeAnalysis, ProgramVolumeAnalysis } from '../services/api/analyticsApi';
import { swapExercise, reorderExercises, ReorderItem } from '../services/api/programExerciseApi';
import { Exercise } from '../services/api/exerciseApi';

// Component imports
import PhaseProgressIndicator from '../components/planner/PhaseProgressIndicator';
import ProgramVolumeOverview, {
  MuscleGroupVolume,
} from '../components/planner/ProgramVolumeOverview';
import ExerciseSelectionModal from '../components/planner/ExerciseSelectionModal';
import OfflineOverlay from '../components/common/OfflineOverlay';

interface PlannerScreenProps {
  userId?: number; // Optional for demo purposes
}

export default function PlannerScreen({ userId }: PlannerScreenProps) {
  // Program state
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [volumeAnalysis, setVolumeAnalysis] = useState<ProgramVolumeAnalysis | null>(null);

  // Offline state (T095)
  const [isOffline, setIsOffline] = useState(false);

  // Exercise swap modal state (T093)
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [swapMuscleGroupFilter, setSwapMuscleGroupFilter] = useState<string | undefined>(undefined);

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  /**
   * Load program data on mount
   */
  useEffect(() => {
    void loadProgramData();
  }, []);

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
   * Load program and volume analysis from API
   */
  const loadProgramData = async () => {
    try {
      setLoading(true);

      // Load user's active program
      const userProgram = await getUserProgram();
      setProgram(userProgram);

      // Select first day by default
      if (userProgram.program_days.length > 0) {
        setSelectedDayId(userProgram.program_days[0].id);
      }

      // Load volume analysis (T092)
      const analysis = await getProgramVolumeAnalysis();
      setVolumeAnalysis(analysis);
    } catch (error) {
      console.error('[PlannerScreen] Error loading program:', error);
      showSnackbar('Failed to load program. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      const result = await swapExercise(selectedExerciseId, newExercise.id);

      console.log(
        `[PlannerScreen] Swapped ${result.old_exercise_name} → ${result.new_exercise_name}`
      );

      // Show success message
      showSnackbar(`Swapped to ${result.new_exercise_name}`);

      // Show volume warning if present
      if (result.volume_warning) {
        showSnackbar(result.volume_warning);
      }

      // Reload program data
      await loadProgramData();

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
      // Build reorder array
      const reorderItems: ReorderItem[] = data.map((item, index) => ({
        program_exercise_id: item.id,
        new_order_index: index,
      }));

      // Call API
      await reorderExercises(selectedDayId, reorderItems);

      console.log('[PlannerScreen] Reordered exercises:', reorderItems);

      // Reload program data
      await loadProgramData();
    } catch (error) {
      console.error('[PlannerScreen] Error reordering exercises:', error);
      showSnackbar('Failed to reorder exercises. Please try again.');
    }
  };

  /**
   * Handle phase advancement (T096)
   */
  const handleAdvancePhase = async (newPhase: string, volumeMultiplier: number) => {
    try {
      console.log(`[PlannerScreen] Advanced to ${newPhase} (${volumeMultiplier}x volume)`);

      // Show success message
      showSnackbar(`Advanced to ${newPhase.toUpperCase()} phase`);

      // Reload program data
      await loadProgramData();
    } catch (error) {
      console.error('[PlannerScreen] Error handling phase advance:', error);
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
          style={[
            styles.exerciseCard,
            isActive && styles.exerciseCardDragging,
          ]}
          elevation={isActive ? 5 : 2}
          onLongPress={drag}
          disabled={isActive || isOffline}
        >
          <Card.Content style={styles.exerciseCardContent}>
            <View style={styles.dragHandle}>
              <MaterialCommunityIcons
                name="drag-horizontal-variant"
                size={24}
                color={colors.text.secondary}
              />
            </View>
            <View style={styles.exerciseInfo}>
              <Text variant="bodyLarge" style={styles.exerciseName}>
                {item.exercise_name}
              </Text>
              <Text variant="bodySmall" style={styles.exerciseDetails}>
                {item.target_sets} sets × {item.target_rep_range} @ RIR {item.target_rir}
              </Text>
            </View>
            <IconButton
              icon="swap-horizontal"
              size={20}
              onPress={() => handleExerciseSwap(item.id, primaryMuscleGroup)}
              disabled={isOffline}
              accessibilityLabel={`Swap ${item.exercise_name}`}
              accessibilityHint="Replace this exercise with a different one"
              accessibilityRole="button"
            />
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
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
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
              name="calendar-blank-outline"
              size={64}
              color={colors.text.disabled}
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No Active Program
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Create a training program to start planning your workouts
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  const selectedDay = program.program_days.find((day) => day.id === selectedDayId);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ScrollView style={styles.container}>
        {/* Phase Progress Indicator (T096) */}
        <PhaseProgressIndicator
          currentPhase={program.mesocycle_phase}
          currentWeek={program.mesocycle_week}
          programId={program.id}
          onAdvancePhase={handleAdvancePhase}
        />

        {/* Program Volume Overview (T092) */}
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

        {/* Program Days */}
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

        {/* Draggable Exercise List (T094) */}
        {selectedDay && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Exercises - {selectedDay.day_name}
              </Text>
              <Divider style={styles.divider} />
              {selectedDayExercises.length > 0 ? (
                <DraggableFlatList
                  data={selectedDayExercises}
                  onDragEnd={({ data }) => void handleReorder(data)}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderExerciseItem}
                  containerStyle={styles.exerciseList}
                />
              ) : (
                <Text variant="bodyMedium" style={styles.emptyText}>
                  No exercises for this day
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

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
          excludeExercises={selectedDayExercises.map((ex) => ex.exercise_id)}
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
      </ScrollView>
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
  exerciseList: {
    marginTop: 8,
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
  },
  dragHandle: {
    marginRight: 12,
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
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
  emptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
});
