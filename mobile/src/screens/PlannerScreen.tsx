/**
 * Planner Screen (T061)
 *
 * Program planner showing:
 * - Display program days (Push A, Pull A, etc.)
 * - Exercise list with reordering capability
 * - MEV/MAV/MRV volume validation overlay
 * - Exercise swap search (filter by muscle group, equipment)
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import {
  Card,
  Button,
  Text,
  Divider,
  Chip,
  ActivityIndicator,
  Portal,
  Modal,
  Searchbar,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as programDb from '../services/database/programDb';
import {
  VOLUME_LANDMARKS,
  getVolumeZone,
  getVolumeZoneColor,
  type MuscleGroup,
} from '../constants/volumeLandmarks';
import { colors } from '../theme/colors';

interface PlannerScreenProps {
  userId: number;
}

interface VolumeValidation {
  muscleGroup: MuscleGroup;
  totalSets: number;
  zone: 'under' | 'optimal' | 'approaching_limit' | 'overreaching';
  message: string;
}

export default function PlannerScreen({ userId }: PlannerScreenProps) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<programDb.Program | null>(null);
  const [programDays, setProgramDays] = useState<programDb.ProgramDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<programDb.ProgramDay | null>(null);
  const [dayExercises, setDayExercises] = useState<programDb.ProgramExercise[]>([]);
  const [volumeValidation, setVolumeValidation] = useState<VolumeValidation[]>([]);

  // Exercise swap modal
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<programDb.ProgramExercise | null>(null);
  const [availableExercises, setAvailableExercises] = useState<programDb.Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMuscleGroup, setFilterMuscleGroup] = useState<string>('');
  const [filterEquipment, setFilterEquipment] = useState<string>('');

  useEffect(() => {
    loadProgramData();
  }, [userId]);

  useEffect(() => {
    if (selectedDay) {
      loadDayExercises(selectedDay.id);
    }
  }, [selectedDay]);

  useEffect(() => {
    if (dayExercises.length > 0) {
      calculateVolumeValidation();
    }
  }, [dayExercises]);

  const loadProgramData = async () => {
    try {
      setLoading(true);

      // Load user's active program
      const userProgram = await programDb.getUserProgram(userId);
      setProgram(userProgram);

      if (userProgram) {
        // Load program days
        const days = await programDb.getProgramDays(userProgram.id);
        setProgramDays(days);

        // Select first day by default
        if (days.length > 0) {
          setSelectedDay(days[0]);
        }
      }
    } catch (error) {
      console.error('[PlannerScreen] Error loading program:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDayExercises = async (programDayId: number) => {
    try {
      const exercises = await programDb.getProgramExercises(programDayId);
      setDayExercises(exercises);
    } catch (error) {
      console.error('[PlannerScreen] Error loading exercises:', error);
    }
  };

  const calculateVolumeValidation = () => {
    // Group exercises by muscle group and sum sets
    const muscleGroupVolumes: Record<string, number> = {};

    dayExercises.forEach((exercise) => {
      if (exercise.muscle_groups) {
        try {
          const groups = JSON.parse(exercise.muscle_groups) as string[];
          groups.forEach((group) => {
            muscleGroupVolumes[group] = (muscleGroupVolumes[group] || 0) + exercise.sets;
          });
        } catch (e) {
          console.warn('[PlannerScreen] Failed to parse muscle groups:', e);
        }
      }
    });

    // Calculate validation for each muscle group
    const validations: VolumeValidation[] = Object.entries(muscleGroupVolumes).map(
      ([muscleGroup, totalSets]) => {
        const zone = getVolumeZone(muscleGroup as MuscleGroup, totalSets);
        const landmark = VOLUME_LANDMARKS[muscleGroup as MuscleGroup];

        let message = '';
        if (zone === 'under') {
          message = `Below MEV (${landmark.mev} sets) - increase volume`;
        } else if (zone === 'optimal') {
          message = `Optimal range (${landmark.mev}-${landmark.mav} sets)`;
        } else if (zone === 'approaching_limit') {
          message = `Approaching MRV (${landmark.mrv} sets) - monitor recovery`;
        } else {
          message = `Over MRV (${landmark.mrv} sets) - reduce volume`;
        }

        return {
          muscleGroup: muscleGroup as MuscleGroup,
          totalSets,
          zone,
          message,
        };
      }
    );

    setVolumeValidation(validations);
  };

  const handleExerciseSwap = async (programExercise: programDb.ProgramExercise) => {
    setSelectedExercise(programExercise);

    // Load available exercises for swapping
    const exercises = await programDb.getAllExercises();
    setAvailableExercises(exercises);
    setSwapModalVisible(true);
  };

  const handleConfirmSwap = async (newExercise: programDb.Exercise) => {
    if (!selectedExercise) return;

    try {
      // Swap the exercise
      await programDb.swapExercise(selectedExercise.id, newExercise.id);

      // Reload exercises
      if (selectedDay) {
        await loadDayExercises(selectedDay.id);
      }

      // Close modal
      setSwapModalVisible(false);
      setSelectedExercise(null);
      setSearchQuery('');
      setFilterMuscleGroup('');
      setFilterEquipment('');
    } catch (error) {
      console.error('[PlannerScreen] Error swapping exercise:', error);
    }
  };

  const handleMoveExercise = async (exerciseId: number, direction: 'up' | 'down') => {
    const exerciseIndex = dayExercises.findIndex((ex) => ex.id === exerciseId);
    if (exerciseIndex === -1) return;

    const newIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    if (newIndex < 0 || newIndex >= dayExercises.length) return;

    try {
      // Update order indices
      await programDb.updateExerciseOrder(dayExercises[exerciseIndex].id, newIndex);
      await programDb.updateExerciseOrder(dayExercises[newIndex].id, exerciseIndex);

      // Reload exercises
      if (selectedDay) {
        await loadDayExercises(selectedDay.id);
      }
    } catch (error) {
      console.error('[PlannerScreen] Error reordering exercise:', error);
    }
  };

  const filteredExercises = availableExercises.filter((exercise) => {
    const matchesSearch =
      searchQuery === '' || exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscleGroup =
      filterMuscleGroup === '' || exercise.muscle_groups.includes(filterMuscleGroup);
    const matchesEquipment = filterEquipment === '' || exercise.equipment === filterEquipment;

    return matchesSearch && matchesMuscleGroup && matchesEquipment;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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

  return (
    <ScrollView style={styles.container}>
      {/* Program Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.programTitle}>
            {program.name}
          </Text>
          <View style={styles.programInfo}>
            <Chip mode="flat" style={styles.phaseChip}>
              Week {program.mesocycle_week} - {program.mesocycle_phase.toUpperCase()}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Program Days */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Training Days
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
            {programDays.map((day) => (
              <TouchableOpacity
                key={day.id}
                onPress={() => setSelectedDay(day)}
                style={[styles.dayChip, selectedDay?.id === day.id && styles.dayChipSelected]}
              >
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.dayChipText,
                    selectedDay?.id === day.id && styles.dayChipTextSelected,
                  ]}
                >
                  {day.day_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card.Content>
      </Card>

      {/* Volume Validation */}
      {volumeValidation.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Volume Validation
            </Text>
            <Divider style={styles.divider} />
            {volumeValidation.map((validation) => (
              <View key={validation.muscleGroup} style={styles.validationRow}>
                <View style={styles.validationInfo}>
                  <Text variant="bodyMedium" style={styles.validationMuscle}>
                    {validation.muscleGroup.replace('_', ' ')}
                  </Text>
                  <Text variant="bodySmall" style={styles.validationMessage}>
                    {validation.message}
                  </Text>
                </View>
                <Chip
                  mode="flat"
                  style={[
                    styles.validationChip,
                    { backgroundColor: getVolumeZoneColor(validation.zone) + '20' },
                  ]}
                  textStyle={{ color: getVolumeZoneColor(validation.zone) }}
                >
                  {validation.totalSets} sets
                </Chip>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Exercise List */}
      {selectedDay && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Exercises - {selectedDay.day_name}
            </Text>
            <Divider style={styles.divider} />
            {dayExercises.length > 0 ? (
              dayExercises.map((exercise, index) => (
                <View key={exercise.id}>
                  <View style={styles.exerciseRow}>
                    <View style={styles.exerciseInfo}>
                      <Text variant="bodyMedium" style={styles.exerciseName}>
                        {index + 1}. {exercise.exercise_name}
                      </Text>
                      <Text variant="bodySmall" style={styles.exerciseDetails}>
                        {exercise.sets} sets × {exercise.reps} reps @ RIR {exercise.rir}
                      </Text>
                    </View>
                    <View style={styles.exerciseActions}>
                      <IconButton
                        icon="arrow-up"
                        size={20}
                        disabled={index === 0}
                        onPress={() => handleMoveExercise(exercise.id, 'up')}
                        accessibilityLabel={`Move ${exercise.exercise_name} up`}
                        accessibilityHint="Reorders this exercise to appear earlier in the workout"
                        accessibilityRole="button"
                      />
                      <IconButton
                        icon="arrow-down"
                        size={20}
                        disabled={index === dayExercises.length - 1}
                        onPress={() => handleMoveExercise(exercise.id, 'down')}
                        accessibilityLabel={`Move ${exercise.exercise_name} down`}
                        accessibilityHint="Reorders this exercise to appear later in the workout"
                        accessibilityRole="button"
                      />
                      <IconButton
                        icon="swap-horizontal"
                        size={20}
                        onPress={() => handleExerciseSwap(exercise)}
                        accessibilityLabel={`Swap ${exercise.exercise_name}`}
                        accessibilityHint="Replace this exercise with a different one"
                        accessibilityRole="button"
                      />
                    </View>
                  </View>
                  {index < dayExercises.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))
            ) : (
              <Text variant="bodyMedium" style={styles.emptyText}>
                No exercises for this day
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Exercise Swap Modal */}
      <Portal>
        <Modal
          visible={swapModalVisible}
          onDismiss={() => setSwapModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={styles.modalTitle} accessibilityRole="header">
            Swap Exercise
          </Text>
          <Text
            variant="bodySmall"
            style={styles.modalSubtitle}
            accessibilityLabel={`Current exercise: ${selectedExercise?.exercise_name}`}
          >
            Current: {selectedExercise?.exercise_name}
          </Text>

          <Searchbar
            placeholder="Search exercises..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            accessibilityLabel="Search exercises"
            accessibilityHint="Filter exercises by name"
            accessibilityRole="search"
          />

          <View style={styles.filterRow}>
            <Button
              mode={filterMuscleGroup === 'chest' ? 'contained' : 'outlined'}
              onPress={() => setFilterMuscleGroup(filterMuscleGroup === 'chest' ? '' : 'chest')}
              style={styles.filterButton}
              compact
            >
              Chest
            </Button>
            <Button
              mode={filterMuscleGroup === 'back' ? 'contained' : 'outlined'}
              onPress={() => setFilterMuscleGroup(filterMuscleGroup === 'back' ? '' : 'back')}
              style={styles.filterButton}
              compact
            >
              Back
            </Button>
            <Button
              mode={filterEquipment === 'barbell' ? 'contained' : 'outlined'}
              onPress={() => setFilterEquipment(filterEquipment === 'barbell' ? '' : 'barbell')}
              style={styles.filterButton}
              compact
            >
              Barbell
            </Button>
          </View>

          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id.toString()}
            style={styles.exerciseList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exerciseOption}
                onPress={() => handleConfirmSwap(item)}
              >
                <Text variant="bodyMedium">{item.name}</Text>
                <Text variant="bodySmall" style={styles.exerciseOptionDetails}>
                  {item.equipment} • {item.difficulty}
                </Text>
              </TouchableOpacity>
            )}
          />

          <Button mode="outlined" onPress={() => setSwapModalVisible(false)}>
            Cancel
          </Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27', // Dark theme background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 16,
    marginBottom: 0,
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
  programTitle: {
    fontWeight: 'bold',
  },
  programInfo: {
    marginTop: 8,
  },
  phaseChip: {
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  daysScroll: {
    marginTop: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  dayChipSelected: {
    backgroundColor: '#3b82f6',
  },
  dayChipText: {
    color: '#1f2937',
  },
  dayChipTextSelected: {
    color: '#ffffff',
  },
  divider: {
    marginVertical: 12,
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  validationInfo: {
    flex: 1,
  },
  validationMuscle: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  validationMessage: {
    color: '#6b7280',
    marginTop: 2,
  },
  validationChip: {
    marginLeft: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontWeight: '500',
  },
  exerciseDetails: {
    color: '#6b7280',
    marginTop: 4,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#6b7280',
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
  },
  exerciseList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  exerciseOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  exerciseOptionDetails: {
    color: '#6b7280',
    marginTop: 4,
  },
});
