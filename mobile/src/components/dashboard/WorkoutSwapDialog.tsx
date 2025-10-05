/**
 * WorkoutSwapDialog Component
 *
 * Modal dialog for swapping today's workout with another program day.
 * Displays list of available program days with exercise counts.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Dialog, Button, List, ActivityIndicator, Text } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface ProgramDay {
  id: number;
  day_name: string;
  day_type: 'strength' | 'vo2max';
  exercise_count?: number;
}

interface WorkoutSwapDialogProps {
  visible: boolean;
  onDismiss: () => void;
  programDays?: ProgramDay[];
  currentProgramDayId?: number;
  isLoading?: boolean;
  isSwapping?: boolean;
  onSwapWorkout: (programDayId: number) => void;
}

/**
 * WorkoutSwapDialog Component
 *
 * Allows user to select a different program day for today's workout.
 */
export default function WorkoutSwapDialog({
  visible,
  onDismiss,
  programDays,
  currentProgramDayId,
  isLoading = false,
  isSwapping = false,
  onSwapWorkout,
}: WorkoutSwapDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.swapDialog}>
        <Dialog.Title>Change Workout</Dialog.Title>
        <Dialog.Content>
          {isLoading ? (
            <ActivityIndicator size="large" style={styles.dialogLoader} />
          ) : !programDays || programDays.length === 0 ? (
            <View style={styles.emptyContainer}>
              <List.Icon icon="calendar-blank" color={colors.text.tertiary} />
              <Text variant="bodyMedium" style={styles.emptyText}>
                No program days available. Create a program in the Planner to get started.
              </Text>
            </View>
          ) : (
            <View>
              {programDays.map((day) => {
                const isCurrentDay = currentProgramDayId === day.id;
                const dayIcon = day.day_type === 'vo2max' ? 'heart-pulse' : 'dumbbell';

                return (
                  <List.Item
                    key={day.id}
                    title={day.day_name}
                    description={`${day.day_type === 'vo2max' ? 'VO2max Cardio' : 'Strength Training'}${day.exercise_count ? ` • ${day.exercise_count} exercises` : ''}`}
                    left={(props) => <List.Icon {...props} icon={dayIcon} />}
                    right={(props) =>
                      isCurrentDay ? (
                        <List.Icon {...props} icon="check-circle" color={colors.success.main} />
                      ) : null
                    }
                    onPress={() => {
                      if (!isCurrentDay) {
                        onSwapWorkout(day.id);
                      }
                    }}
                    disabled={isSwapping || isCurrentDay}
                    style={[styles.programDayItem, isCurrentDay && styles.currentProgramDay]}
                  />
                );
              })}
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={isSwapping}>
            Cancel
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  swapDialog: {
    backgroundColor: colors.background.secondary,
  },
  dialogLoader: {
    marginVertical: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  programDayItem: {
    backgroundColor: colors.background.primary,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minHeight: 56, // WCAG 2.5.5 compliance
  },
  currentProgramDay: {
    backgroundColor: colors.primary.main + '20',
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
});
