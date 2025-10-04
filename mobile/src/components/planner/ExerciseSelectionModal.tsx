/**
 * Exercise Selection Modal Component (T077)
 *
 * Modal for selecting exercises from the library with filtering capabilities.
 * Features:
 * - Search by exercise name
 * - Filter by muscle group (chips)
 * - Filter by equipment type
 * - Filter by movement pattern (compound/isolation)
 * - Filter by difficulty level
 * - FlatList display with exercise cards
 * - Loading and empty states
 *
 * Uses React Native Paper components (NOT Alert.alert)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Modal,
  Portal,
  Searchbar,
  Chip,
  Card,
  Button,
  Text,
  ActivityIndicator,
  useTheme,
  Divider,
} from 'react-native-paper';
import { Exercise, getExercises, ExerciseFilters } from '../../services/api/exerciseApi';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface ExerciseSelectionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  muscleGroupFilter?: string; // Pre-filter by muscle group
  excludeExercises?: number[]; // IDs to exclude from list
}

/**
 * Exercise Selection Modal
 *
 * @param visible - Modal visibility state
 * @param onDismiss - Callback when modal is dismissed
 * @param onSelectExercise - Callback when exercise is selected
 * @param muscleGroupFilter - Optional pre-filter by muscle group
 * @param excludeExercises - Optional array of exercise IDs to exclude
 */
export default function ExerciseSelectionModal({
  visible,
  onDismiss,
  onSelectExercise,
  muscleGroupFilter,
  excludeExercises = [],
}: ExerciseSelectionModalProps) {
  const theme = useTheme();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | undefined>(
    muscleGroupFilter
  );
  const [selectedEquipment, setSelectedEquipment] = useState<ExerciseFilters['equipment']>();
  const [selectedMovementPattern, setSelectedMovementPattern] =
    useState<ExerciseFilters['movement_pattern']>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<ExerciseFilters['difficulty']>();

  // Data state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Muscle groups for filter chips
  const muscleGroups = [
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'quads',
    'hamstrings',
    'glutes',
    'calves',
    'abs',
  ];

  /**
   * Fetch exercises from API with filters
   */
  const fetchExercises = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: ExerciseFilters = {};
      if (selectedMuscleGroup) filters.muscle_group = selectedMuscleGroup;
      if (selectedEquipment) filters.equipment = selectedEquipment;
      if (selectedMovementPattern) filters.movement_pattern = selectedMovementPattern;
      if (selectedDifficulty) filters.difficulty = selectedDifficulty;

      const response = await getExercises(filters);
      setExercises(response.exercises);
    } catch (err) {
      console.error('[ExerciseSelectionModal] Failed to fetch exercises:', err);
      setError('Failed to load exercises. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch exercises when filters change or modal opens
  useEffect(() => {
    if (visible) {
      void fetchExercises();
    }
  }, [
    visible,
    selectedMuscleGroup,
    selectedEquipment,
    selectedMovementPattern,
    selectedDifficulty,
  ]);

  /**
   * Filter exercises by search query and exclude list
   */
  const filteredExercises = useMemo(() => {
    let filtered = exercises;

    // Exclude specified exercises
    if (excludeExercises.length > 0) {
      filtered = filtered.filter((ex) => !excludeExercises.includes(ex.id));
    }

    // Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((ex) => ex.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [exercises, searchQuery, excludeExercises]);

  /**
   * Handle exercise selection
   */
  const handleSelectExercise = (exercise: Exercise) => {
    onSelectExercise(exercise);
    onDismiss();
  };

  /**
   * Handle modal dismissal (reset filters)
   */
  const handleDismiss = () => {
    setSearchQuery('');
    setSelectedMuscleGroup(muscleGroupFilter);
    setSelectedEquipment(undefined);
    setSelectedMovementPattern(undefined);
    setSelectedDifficulty(undefined);
    setError(null);
    onDismiss();
  };

  /**
   * Render exercise card
   */
  const renderExerciseCard = ({ item }: { item: Exercise }) => (
    <Card
      style={styles.exerciseCard}
      elevation={2}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Select ${item.name}`}
      accessibilityHint={`Primary muscle: ${item.primary_muscle_group}, Equipment: ${item.equipment}`}
    >
      <Card.Content style={styles.exerciseCardContent}>
        <View style={styles.exerciseInfo}>
          <Text variant="titleMedium" style={styles.exerciseName}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.exerciseMeta}>
            {item.primary_muscle_group} • {item.equipment} • {item.movement_pattern}
          </Text>
          {item.difficulty && (
            <Text variant="labelSmall" style={styles.difficultyBadge}>
              {item.difficulty.toUpperCase()}
            </Text>
          )}
        </View>
        <Button
          mode="contained"
          onPress={() => handleSelectExercise(item)}
          compact
          style={styles.selectButton}
          accessibilityLabel={`Select ${item.name}`}
        >
          Select
        </Button>
      </Card.Content>
    </Card>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No exercises found
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        Try adjusting your filters or search query
      </Text>
    </View>
  );

  /**
   * Render error state
   */
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Text variant="titleMedium" style={[styles.errorTitle, { color: theme.colors.error }]}>
        {error}
      </Text>
      <Button mode="contained" onPress={() => void fetchExercises()} style={styles.retryButton}>
        Retry
      </Button>
    </View>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
        accessible={true}
        accessibilityLabel="Exercise selection modal"
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Select Exercise
            </Text>
            <Button
              mode="text"
              onPress={handleDismiss}
              accessibilityLabel="Close modal"
              accessibilityRole="button"
            >
              Close
            </Button>
          </View>

          <Divider style={styles.divider} />

          {/* Search Bar */}
          <Searchbar
            placeholder="Search exercises..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            accessibilityLabel="Search exercises"
            accessibilityHint="Type exercise name to filter results"
          />

          {/* Muscle Group Filters */}
          <View style={styles.filterSection}>
            <Text variant="labelSmall" style={styles.filterLabel}>
              MUSCLE GROUP
            </Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={!selectedMuscleGroup}
                onPress={() => setSelectedMuscleGroup(undefined)}
                style={styles.chip}
                textStyle={styles.chipText}
              >
                All
              </Chip>
              {muscleGroups.map((group) => (
                <Chip
                  key={group}
                  selected={selectedMuscleGroup === group}
                  onPress={() => setSelectedMuscleGroup(group)}
                  style={styles.chip}
                  textStyle={styles.chipText}
                >
                  {group.charAt(0).toUpperCase() + group.slice(1)}
                </Chip>
              ))}
            </View>
          </View>

          {/* Equipment Filter */}
          <View style={styles.filterSection}>
            <Text variant="labelSmall" style={styles.filterLabel}>
              EQUIPMENT
            </Text>
            <View style={styles.chipContainer}>
              {(['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'] as const).map(
                (equipment) => (
                  <Chip
                    key={equipment}
                    selected={selectedEquipment === equipment}
                    onPress={() =>
                      setSelectedEquipment(selectedEquipment === equipment ? undefined : equipment)
                    }
                    style={styles.chip}
                    textStyle={styles.chipText}
                  >
                    {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                  </Chip>
                )
              )}
            </View>
          </View>

          {/* Movement Pattern & Difficulty */}
          <View style={styles.filterRow}>
            <View style={styles.filterHalf}>
              <Text variant="labelSmall" style={styles.filterLabel}>
                MOVEMENT
              </Text>
              <View style={styles.chipContainer}>
                {(['compound', 'isolation'] as const).map((pattern) => (
                  <Chip
                    key={pattern}
                    selected={selectedMovementPattern === pattern}
                    onPress={() =>
                      setSelectedMovementPattern(
                        selectedMovementPattern === pattern ? undefined : pattern
                      )
                    }
                    style={styles.chip}
                    textStyle={styles.chipText}
                  >
                    {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                  </Chip>
                ))}
              </View>
            </View>
            <View style={styles.filterHalf}>
              <Text variant="labelSmall" style={styles.filterLabel}>
                DIFFICULTY
              </Text>
              <View style={styles.chipContainer}>
                {(['beginner', 'intermediate', 'advanced'] as const).map((difficulty) => (
                  <Chip
                    key={difficulty}
                    selected={selectedDifficulty === difficulty}
                    onPress={() =>
                      setSelectedDifficulty(
                        selectedDifficulty === difficulty ? undefined : difficulty
                      )
                    }
                    style={styles.chip}
                    textStyle={styles.chipText}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Chip>
                ))}
              </View>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Results Count */}
          {!isLoading && !error && (
            <Text variant="labelMedium" style={styles.resultsCount}>
              {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
            </Text>
          )}

          {/* Exercise List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text variant="bodyMedium" style={styles.loadingText}>
                Loading exercises...
              </Text>
            </View>
          ) : error ? (
            renderErrorState()
          ) : (
            <FlatList
              data={filteredExercises}
              renderItem={renderExerciseCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={renderEmptyState}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          )}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: spacing.md,
    maxHeight: '90%',
    borderRadius: borderRadius.lg,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: spacing.md,
  },
  searchbar: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.tertiary,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  filterHalf: {
    flex: 1,
  },
  filterLabel: {
    color: colors.text.tertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipText: {
    fontSize: 12,
  },
  resultsCount: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  exerciseCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  exerciseName: {
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  exerciseMeta: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  difficultyBadge: {
    color: colors.warning.main,
    letterSpacing: 0.5,
  },
  selectButton: {
    minWidth: 80,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  errorTitle: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
});
