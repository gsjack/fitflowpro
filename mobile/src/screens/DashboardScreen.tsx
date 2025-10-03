/**
 * Dashboard Screen (T060)
 *
 * Main dashboard showing:
 * - Today's workout card with "Start Workout" button
 * - Inline recovery assessment (if not submitted today)
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Button, Text, Chip, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { useWorkoutStore } from '../stores/workoutStore';
import { useRecoveryStore, getRecoveryMessage } from '../stores/recoveryStore';
import * as workoutDb from '../services/database/workoutDb';
import type { Workout } from '../services/database/workoutDb';
import { colors, gradients } from '../theme/colors';
import { spacing, borderRadius } from '../theme/typography';
import GradientCard from '../components/common/GradientCard';
import StatCard from '../components/common/StatCard';

interface DashboardScreenProps {
  userId: number;
  onStartWorkout?: (programDayId: number, date: string) => Promise<void>;
  onSubmitRecovery?: () => void;
}

export default function DashboardScreen({
  userId,
  onStartWorkout,
  onSubmitRecovery,
}: DashboardScreenProps) {
  const [loading, setLoading] = useState(true);
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null);

  // Recovery assessment state
  const [sleepQuality, setSleepQuality] = useState<string>('');
  const [muscleSoreness, setMuscleSoreness] = useState<string>('');
  const [mentalMotivation, setMentalMotivation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useWorkoutStore();
  const { todayAssessment, volumeAdjustment, getTodayAssessment, submitAssessment } = useRecoveryStore();

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load today's assessment
      await getTodayAssessment(userId);

      // Load today's workout (includes day_name and day_type from API)
      const todayWkt = await workoutDb.getTodayWorkout(userId);
      setTodayWorkout(todayWkt);
    } catch (error) {
      console.error('[DashboardScreen] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = async () => {
    if (onStartWorkout && todayWorkout) {
      await onStartWorkout(todayWorkout.program_day_id, todayWorkout.date);
    }
  };

  const handleSubmitRecoveryAssessment = async () => {
    if (!sleepQuality || !muscleSoreness || !mentalMotivation) {
      return;
    }

    try {
      setIsSubmitting(true);
      await submitAssessment(
        userId,
        parseInt(sleepQuality),
        parseInt(muscleSoreness),
        parseInt(mentalMotivation)
      );

      // Reset form
      setSleepQuality('');
      setMuscleSoreness('');
      setMentalMotivation('');
    } catch (error) {
      console.error('[DashboardScreen] Error submitting recovery:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
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
  };

  const allQuestionsAnswered = sleepQuality && muscleSoreness && mentalMotivation;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} accessibilityRole="scrollbar">
      {/* Hero Section with Date & Recovery */}
      <View style={styles.heroSection}>
        <Text variant="headlineLarge" style={styles.dateText}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </Text>

        {todayAssessment ? (
          <View style={styles.recoveryHero}>
            <StatCard
              label="Recovery Score"
              value={todayAssessment.total_score}
              unit="/15"
              description={getRecoveryMessage(volumeAdjustment)}
              color={
                volumeAdjustment === 'none'
                  ? colors.success.main
                  : volumeAdjustment === 'rest_day'
                    ? colors.error.main
                    : colors.warning.main
              }
            />
          </View>
        ) : (
          <GradientCard
            gradient={gradients.primary as [string, string, ...string[]]}
            style={styles.recoveryPrompt}
            accessible={true}
            accessibilityRole="none"
            accessibilityLabel="Recovery assessment"
          >
            <View style={styles.promptContent}>
              <Text variant="titleMedium" style={styles.promptTitle}>
                Recovery Check
              </Text>

              {/* Question 1: Sleep */}
              <View style={styles.questionContainer}>
                <Text variant="bodyMedium" style={styles.questionLabel}>
                  Sleep
                </Text>
                <SegmentedButtons
                  value={sleepQuality}
                  onValueChange={setSleepQuality}
                  buttons={[
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                    { value: '5', label: '5' },
                  ]}
                  style={styles.segmentedButtons}
                  density="small"
                />
              </View>

              {/* Question 2: Soreness */}
              <View style={styles.questionContainer}>
                <Text variant="bodyMedium" style={styles.questionLabel}>
                  Soreness
                </Text>
                <SegmentedButtons
                  value={muscleSoreness}
                  onValueChange={setMuscleSoreness}
                  buttons={[
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                    { value: '5', label: '5' },
                  ]}
                  style={styles.segmentedButtons}
                  density="small"
                />
              </View>

              {/* Question 3: Motivation */}
              <View style={styles.questionContainer}>
                <Text variant="bodyMedium" style={styles.questionLabel}>
                  Motivation
                </Text>
                <SegmentedButtons
                  value={mentalMotivation}
                  onValueChange={setMentalMotivation}
                  buttons={[
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                    { value: '5', label: '5' },
                  ]}
                  style={styles.segmentedButtons}
                  density="small"
                />
              </View>

              {/* Submit Button */}
              <Button
                mode="contained"
                onPress={handleSubmitRecoveryAssessment}
                style={styles.submitButton}
                buttonColor={colors.success.main}
                textColor="#000000"
                disabled={!allQuestionsAnswered || isSubmitting}
                loading={isSubmitting}
                accessibilityLabel="Submit recovery assessment"
                compact
              >
                Submit
              </Button>

              {/* Preview of total score */}
              {allQuestionsAnswered && (
                <Text variant="bodySmall" style={styles.scorePreviewText}>
                  Score: {parseInt(sleepQuality) + parseInt(muscleSoreness) + parseInt(mentalMotivation)}/15
                </Text>
              )}
            </View>
          </GradientCard>
        )}
      </View>

      {/* Today's Workout Card */}
      {todayWorkout ? (
        <GradientCard
          gradient={
            todayWorkout.status === 'completed'
              ? [colors.success.dark, colors.background.secondary]
              : todayWorkout.status === 'in_progress'
                ? [colors.primary.dark, colors.background.secondary]
                : gradients.hero
          }
          style={styles.workoutCard}
          onPress={
            todayWorkout.status === 'not_started' || todayWorkout.status === 'in_progress'
              ? handleStartWorkout
              : undefined
          }
          accessibilityLabel={`Today's workout: ${todayWorkout.day_name || 'Workout'}`}
          accessibilityRole={
            todayWorkout.status === 'not_started' || todayWorkout.status === 'in_progress'
              ? 'button'
              : 'none'
          }
        >
          <View style={styles.workoutCardContent}>
            {/* Header with Status */}
            <View style={styles.workoutHeader}>
              <Text variant="labelMedium" style={styles.workoutLabel}>
                TODAY'S WORKOUT
              </Text>
              <Chip
                mode="flat"
                style={[
                  styles.statusChipNew,
                  { backgroundColor: getStatusColor(todayWorkout.status) + '30' },
                ]}
                textStyle={{ color: getStatusColor(todayWorkout.status), fontWeight: '600' }}
              >
                {todayWorkout.status.replace('_', ' ').toUpperCase()}
              </Chip>
            </View>

            {/* Workout Name */}
            <Text variant="headlineLarge" style={styles.workoutNameNew}>
              {todayWorkout.day_name || 'Workout'}
            </Text>

            {/* Workout Type */}
            <Text variant="bodyMedium" style={styles.workoutTypeNew}>
              {todayWorkout.day_type === 'vo2max' ? 'VO2max Cardio' : 'Strength Training'}
            </Text>

            {/* Exercise Details */}
            {todayWorkout.exercises && todayWorkout.exercises.length > 0 && (
              <View style={styles.exerciseDetails}>
                <Text variant="labelMedium" style={styles.exerciseHeader}>
                  WORKOUT EXERCISES
                </Text>
                {todayWorkout.exercises.map((exercise, index) => (
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
                  {todayWorkout.exercises.length} exercises • {todayWorkout.exercises.reduce((sum, ex) => sum + ex.sets, 0)} total sets
                </Text>
              </View>
            )}

            {/* Action Button or Metrics */}
            {todayWorkout.status === 'not_started' && (
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

            {todayWorkout.status === 'in_progress' && (
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

            {todayWorkout.status === 'completed' && (
              <View style={styles.completedMetrics}>
                <View style={styles.metricItem}>
                  <Text variant="displaySmall" style={styles.metricValue}>
                    {todayWorkout.total_volume_kg?.toFixed(0) || '0'}
                  </Text>
                  <Text variant="bodySmall" style={styles.metricLabel}>
                    kg volume
                  </Text>
                </View>
                {todayWorkout.average_rir !== undefined && (
                  <View style={styles.metricItem}>
                    <Text variant="displaySmall" style={styles.metricValue}>
                      {todayWorkout.average_rir.toFixed(1)}
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
      ) : (
        <Card style={styles.emptyWorkoutCard}>
          <Card.Content style={styles.emptyContent}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No Workout Today
            </Text>
            <Text variant="bodyMedium" style={styles.emptyDescription}>
              Head to the Planner to schedule your training
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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

  // Hero Section
  heroSection: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  dateText: {
    color: colors.text.primary,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  recoveryHero: {
    marginTop: spacing.sm,
  },
  recoveryPrompt: {
    marginTop: spacing.sm,
  },
  promptContent: {
    padding: spacing.md,
  },
  promptTitle: {
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
    fontSize: 16,
  },

  // Recovery Assessment Questions
  questionContainer: {
    marginBottom: spacing.md,
  },
  questionLabel: {
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
    fontSize: 13,
  },
  segmentedButtons: {
    marginTop: 4,
  },
  submitButton: {
    minHeight: 42,
    marginTop: spacing.sm,
  },
  scorePreviewText: {
    color: colors.text.secondary,
    fontWeight: '500',
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Workout Card
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
  statusChipNew: {
    height: 28,
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

  // Empty State
  emptyWorkoutCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  emptyContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
