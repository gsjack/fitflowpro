/**
 * ProgramExerciseList Component
 *
 * Draggable list of exercises with reordering, swapping, and deletion capabilities.
 * Supports both native drag-drop (mobile) and button controls (web).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Card, Text, IconButton, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { colors } from '../../theme/colors';

interface ProgramExercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  target_sets: number;
  target_rep_range: string;
  target_rir: number;
  muscle_groups: string; // JSON string
  order_index: number;
}

interface ProgramExerciseListProps {
  exercises: ProgramExercise[];
  isOffline: boolean;
  onReorder: (data: ProgramExercise[]) => void;
  onAdjustSets: (programExerciseId: number, newSets: number) => void;
  onSwapExercise: (programExerciseId: number, muscleGroup?: string) => void;
  onDeleteExercise: (programExerciseId: number, exerciseName: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export default function ProgramExerciseList({
  exercises,
  isOffline,
  onReorder,
  onAdjustSets,
  onSwapExercise,
  onDeleteExercise,
  onMoveUp,
  onMoveDown,
}: ProgramExerciseListProps) {
  const [menuVisible, setMenuVisible] = React.useState<number | null>(null);

  const renderExerciseItem = ({ item, drag, isActive }: RenderItemParams<ProgramExercise>) => {
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
                    onPress={() => onAdjustSets(item.id, item.target_sets - 1)}
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
                    onPress={() => onAdjustSets(item.id, item.target_sets + 1)}
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
                  onSwapExercise(item.id, primaryMuscleGroup);
                }}
                title="Swap Exercise"
              />
              <Menu.Item
                leadingIcon="delete"
                onPress={() => {
                  setMenuVisible(null);
                  onDeleteExercise(item.id, item.exercise_name);
                }}
                title="Remove Exercise"
              />
            </Menu>
            {/* Reorder Control: Drag handle (native) or up/down buttons (web) */}
            {Platform.OS === 'web' ? (
              <View style={styles.webReorderButtons}>
                <IconButton
                  icon="arrow-up"
                  size={20}
                  iconColor={colors.primary.main}
                  onPress={() => onMoveUp(exercises.indexOf(item))}
                  disabled={isOffline || exercises.indexOf(item) === 0}
                  style={styles.iconButtonContainer}
                  accessibilityLabel="Move exercise up"
                  accessibilityHint="Move this exercise earlier in the workout"
                  accessibilityRole="button"
                />
                <IconButton
                  icon="arrow-down"
                  size={20}
                  iconColor={colors.primary.main}
                  onPress={() => onMoveDown(exercises.indexOf(item))}
                  disabled={isOffline || exercises.indexOf(item) === exercises.length - 1}
                  style={styles.iconButtonContainer}
                  accessibilityLabel="Move exercise down"
                  accessibilityHint="Move this exercise later in the workout"
                  accessibilityRole="button"
                />
              </View>
            ) : (
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
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>
      </ScaleDecorator>
    );
  };

  return (
    <DraggableFlatList
      data={exercises}
      onDragEnd={({ data }) => onReorder(data)}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderExerciseItem}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
  },
  webReorderButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    minWidth: 52,
    minHeight: 52,
    gap: 4,
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
});
