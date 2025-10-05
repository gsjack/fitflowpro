/**
 * TodaysWorkoutCard Component
 *
 * Displays today's workout with exercise list, status, and action button.
 * Supports both active workouts and recommended workouts.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button, Chip, IconButton } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import GradientCard from '../common/GradientCard';
import { colors, gradients } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface Exercise {
  id: number;
  exercise_name: string;
  sets: number;
  reps: number;
  rir: number;
}

interface TodaysWorkoutCardProps {
  dayName: string;
  dayType: 'strength' | 'vo2max';
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  exercises?: Exercise[];
  totalVolumeKg?: number;
  averageRir?: number;
  isRecommended?: boolean;
  onStartWorkout: () => void;
  onSwapWorkout?: () => void;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return '#22c55e'; // Green
    case 'in_progress':
      return '#3b82f6'; // Blue
    case 'cancelled':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * TodaysWorkoutCard Component
 *
 * Displays workout details with gradient styling and status indicators.
 */
export default function TodaysWorkoutCard({
  dayName,
  dayType,
  status,
  exercises = [],
  totalVolumeKg,
  averageRir,
  isRecommended = false,
  onStartWorkout,
  onSwapWorkout,
}: TodaysWorkoutCardProps) {
  const gradient =
    status === 'completed'
      ? ([colors.success.dark, colors.background.secondary] as [string, string, ...string[]])
      : status === 'in_progress'
        ? ([colors.primary.dark, colors.background.secondary] as [string, string, ...string[]])
        : gradients.hero;

  const handleStartWorkout = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onStartWorkout();
  };

  return (
    <GradientCard
      gradient={gradient}
      style={styles.workoutCard}
      accessibilityLabel={`${isRecommended ? 'Recommended' : "Today's"} workout: ${dayName}`}
    >
      <View style={styles.workoutCardContent}>
        {/* Header with Status */}
        <View style={styles.workoutHeader}>
          <Text variant="labelMedium" style={styles.workoutLabel}>
            {isRecommended ? 'RECOMMENDED' : "TODAY'S WORKOUT"}
          </Text>
          <View style={styles.headerActions}>
            {!isRecommended && status !== 'not_started' ? null : (
              <Chip
                mode="flat"
                style={[styles.statusChipNew, { backgroundColor: getStatusColor(status) + '30' }]}
                textStyle={{ color: getStatusColor(status), fontWeight: '600' }}
              >
                {status.replace('_', ' ').toUpperCase()}
              </Chip>
            )}
            {(status === 'not_started' || isRecommended) && onSwapWorkout && (
              <IconButton
                icon="swap-horizontal"
                size={24}
                iconColor={colors.primary.main}
                onPress={onSwapWorkout}
                accessibilityLabel="Change workout"
                style={[styles.swapButton, styles.swapButtonContainer]}
              />
            )}
          </View>
        </View>

        {/* Workout Name */}
        <Text variant="headlineLarge" style={styles.workoutNameNew}>
          {dayName}
        </Text>

        {/* Workout Type */}
        <Text variant="bodyMedium" style={styles.workoutTypeNew}>
          {dayType === 'vo2max' ? 'VO2max Cardio' : 'Strength Training'}
        </Text>

        {/* Exercise Details */}
        {exercises && exercises.length > 0 && (
          <View style={styles.exerciseDetails}>
            <Text variant="labelMedium" style={styles.exerciseHeader}>
              WORKOUT EXERCISES
            </Text>
            {exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseItem}>
                <View style={styles.exerciseInfo}>
                  <Text variant="bodyMedium" style={styles.exerciseName}>
                    {index + 1}. {exercise.exercise_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.exerciseSpecs}>
                    {exercise.sets} sets × {exercise.reps} reps @ {exercise.rir} RIR
                  </Text>
                </View>
              </View>
            ))}
            <Text variant="bodySmall" style={styles.exerciseSummary}>
              {exercises.length} exercises • {exercises.reduce((sum, ex) => sum + ex.sets, 0)} total
              sets
            </Text>
          </View>
        )}

        {/* Action Button or Metrics */}
        {status === 'not_started' && (
          <Button
            mode="contained"
            onPress={handleStartWorkout}
            style={styles.workoutActionButton}
            buttonColor={colors.primary.main}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="play"
            accessibilityLabel="Start workout"
          >
            Start Workout
          </Button>
        )}

        {status === 'in_progress' && (
          <Button
            mode="contained"
            onPress={handleStartWorkout}
            style={styles.workoutActionButton}
            buttonColor={colors.success.main}
            textColor="#000000"
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="play-circle"
            accessibilityLabel="Resume workout"
          >
            Resume Workout
          </Button>
        )}

        {status === 'completed' && (
          <View style={styles.completedMetrics}>
            <View style={styles.metricItem}>
              <Text variant="displaySmall" style={styles.metricValue}>
                {totalVolumeKg?.toFixed(0) || '0'}
              </Text>
              <Text variant="bodySmall" style={styles.metricLabel}>
                kg volume
              </Text>
            </View>
            {averageRir !== undefined && (
              <View style={styles.metricItem}>
                <Text variant="displaySmall" style={styles.metricValue}>
                  {averageRir?.toFixed(1) ?? 'N/A'}
                </Text>
                <Text variant="bodySmall" style={styles.metricLabel}>
                  avg RIR
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  workoutCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  workoutCardContent: {
    padding: spacing.lg,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  workoutLabel: {
    color: colors.text.secondary,
    letterSpacing: 1.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusChipNew: {
    height: 28,
  },
  swapButton: {
    margin: 0,
  },
  swapButtonContainer: {
    minWidth: 48,
    minHeight: 48,
  },
  workoutNameNew: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  workoutTypeNew: {
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  exerciseDetails: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.effects.divider,
    borderBottomWidth: 1,
    borderBottomColor: colors.effects.divider,
    marginBottom: spacing.lg,
  },
  exerciseHeader: {
    color: colors.text.secondary,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  exerciseItem: {
    marginBottom: spacing.md,
  },
  exerciseInfo: {
    gap: spacing.xs,
  },
  exerciseName: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  exerciseSpecs: {
    color: colors.text.tertiary,
  },
  exerciseSummary: {
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  workoutActionButton: {
    minHeight: 56,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 56,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  completedMetrics: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    color: colors.success.main,
    fontWeight: '700',
  },
  metricLabel: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});
