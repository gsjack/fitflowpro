/**
 * Dashboard Screen (T060)
 *
 * Main dashboard showing:
 * - Today's workout card with "Start Workout" button
 * - Inline recovery assessment (if not submitted today)
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import {
  Card,
  Button,
  Text,
  Chip,
  ActivityIndicator,
  SegmentedButtons,
  Dialog,
  Portal,
  List,
  IconButton,
} from 'react-native-paper';
import { useWorkoutStore } from '../stores/workoutStore';
import { useRecoveryStore, getRecoveryMessage } from '../stores/recoveryStore';
import * as workoutDb from '../services/database/workoutDb';
import type { Workout } from '../services/database/workoutDb';
import { colors, gradients } from '../theme/colors';
import { spacing, borderRadius } from '../theme/typography';
import GradientCard from '../components/common/GradientCard';
import StatCard from '../components/common/StatCard';
import { getAuthenticatedClient } from '../services/api/authApi';
import { getQuoteOfTheDay } from '../constants/quotes';
import { MuscleGroupVolumeBar } from '../components/analytics/MuscleGroupVolumeBar';
import { useCurrentWeekVolume } from '../services/api/analyticsApi';

interface DashboardScreenProps {
  userId: number;
  onStartWorkout?: (programDayId: number, date: string) => Promise<void>;
  onSubmitRecovery?: () => void;
}

interface ProgramDay {
  id: number;
  day_name: string;
  day_type: 'strength' | 'vo2max';
  exercise_count?: number;
}

interface RecommendedProgramDay {
  id: number;
  program_id: number;
  day_name: string;
  day_type: 'strength' | 'vo2max';
  weekday: number;
  exercises: {
    id: number;
    exercise_name: string;
    sets: number;
    reps: number;
    rir: number;
  }[];
}

export default function DashboardScreen({
  userId,
  onStartWorkout,
  onSubmitRecovery,
}: DashboardScreenProps) {
  const [loading, setLoading] = useState(true);
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null);
  const [recommendedProgramDay, setRecommendedProgramDay] = useState<RecommendedProgramDay | null>(
    null
  );

  // Recovery assessment state
  const [sleepQuality, setSleepQuality] = useState<string>('');
  const [muscleSoreness, setMuscleSoreness] = useState<string>('');
  const [mentalMotivation, setMentalMotivation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Workout swap dialog state
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [programDays, setProgramDays] = useState<ProgramDay[]>([]);
  const [loadingProgramDays, setLoadingProgramDays] = useState(false);
  const [swapping, setSwapping] = useState(false);

  useWorkoutStore();
  const { todayAssessment, volumeAdjustment, getTodayAssessment, submitAssessment } =
    useRecoveryStore();

  // T090: Add volume tracking data fetching with TanStack Query
  const {
    data: volumeData,
    isLoading: isLoadingVolume,
    error: volumeError,
    refetch: refetchVolume,
    isRefetching: isRefetchingVolume,
  } = useCurrentWeekVolume();

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const getRecommendedWorkout = async () => {
    try {
      const client = await getAuthenticatedClient();
      const response = await client.get<RecommendedProgramDay>('/api/program-days/recommended');
      return response.data;
    } catch (error) {
      console.error('[DashboardScreen] Error fetching recommended workout:', error);
      return null;
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load today's assessment
      await getTodayAssessment(userId);

      // Load today's workout (includes day_name and day_type from API)
      const todayWkt = await workoutDb.getTodayWorkout(userId);
      setTodayWorkout(todayWkt);

      // If no workout for today, fetch recommended workout
      if (!todayWkt) {
        const recommended = await getRecommendedWorkout();
        setRecommendedProgramDay(recommended);
      } else {
        setRecommendedProgramDay(null);
      }
    } catch (error) {
      console.error('[DashboardScreen] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // T091: Pull-to-refresh handler
  const handleRefresh = async () => {
    // Refresh both dashboard data and volume data
    await Promise.all([loadDashboardData(), refetchVolume()]);
  };

  const handleStartWorkout = async () => {
    if (onStartWorkout) {
      if (todayWorkout) {
        await onStartWorkout(todayWorkout.program_day_id, todayWorkout.date);
      } else if (recommendedProgramDay) {
        const today = new Date().toISOString().split('T')[0];
        await onStartWorkout(recommendedProgramDay.id, today);
      }
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

  const handleOpenSwapDialog = async () => {
    setShowSwapDialog(true);
    setLoadingProgramDays(true);

    try {
      const client = await getAuthenticatedClient();
      const response = await client.get<ProgramDay[]>('/api/program-days');
      setProgramDays(response.data);
    } catch (error) {
      console.error('[DashboardScreen] Error loading program days:', error);
      Alert.alert('Error', 'Failed to load program days. Please try again.');
      setShowSwapDialog(false);
    } finally {
      setLoadingProgramDays(false);
    }
  };

  const handleSwapWorkout = async (newProgramDayId: number) => {
    if (!todayWorkout) return;

    try {
      setSwapping(true);
      const client = await getAuthenticatedClient();
      await client.patch(`/api/workouts/${todayWorkout.id}`, {
        program_day_id: newProgramDayId,
      });

      // Close dialog and reload dashboard
      setShowSwapDialog(false);
      await loadDashboardData();
    } catch (error) {
      console.error('[DashboardScreen] Error swapping workout:', error);
      Alert.alert('Error', 'Failed to change workout. Please try again.');
    } finally {
      setSwapping(false);
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

  const quoteOfTheDay = getQuoteOfTheDay();

  // T091: Determine if refreshing (either from pull-to-refresh or manual refetch)
  const isRefreshing = isRefetchingVolume;

  return (
    <ScrollView
      style={styles.container}
      accessibilityRole="scrollbar"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary.main]}
          tintColor={colors.primary.main}
        />
      }
    >
      {/* Hero Section with Date & Recovery */}
      <View style={styles.heroSection}>
        <Text variant="headlineLarge" style={styles.dateText}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        {/* Quote of the Day */}
        <View style={styles.quoteContainer}>
          <Text variant="bodyMedium" style={styles.quoteText}>
            "{quoteOfTheDay}"
          </Text>
        </View>

        {todayAssessment ? (
          <View style={styles.recoveryPrompt}>
            <Text variant="bodySmall" style={styles.promptTitle}>
              Recovery Check ✓
            </Text>
            <View style={styles.recoveryLoggedState}>
              <Text variant="bodyMedium" style={styles.recoveryScoreText}>
                {todayAssessment.total_score}/15
              </Text>
              <Text variant="bodySmall" style={styles.recoveryMessageText}>
                {getRecoveryMessage(volumeAdjustment)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.recoveryPrompt}>
            <Text variant="bodySmall" style={styles.promptTitle}>
              Sleep • Soreness • Motivation
            </Text>

            <View style={styles.compactQuestions}>
              {/* Question 1: Sleep */}
              <View style={styles.compactQuestion}>
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
                  density="small"
                />
              </View>

              {/* Question 2: Soreness */}
              <View style={styles.compactQuestion}>
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
                  density="small"
                />
              </View>

              {/* Question 3: Motivation */}
              <View style={styles.compactQuestion}>
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
                  density="small"
                />
              </View>

              {/* Submit Button */}
              <Button
                mode="text"
                onPress={handleSubmitRecoveryAssessment}
                style={styles.submitButtonMinimal}
                disabled={!allQuestionsAnswered || isSubmitting}
                loading={isSubmitting}
                accessibilityLabel="Submit recovery assessment"
                compact
              >
                {allQuestionsAnswered
                  ? `Submit (${parseInt(sleepQuality) + parseInt(muscleSoreness) + parseInt(mentalMotivation)}/15)`
                  : 'Submit'}
              </Button>
            </View>
          </View>
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
          accessibilityLabel={`Today's workout: ${todayWorkout.day_name || 'Workout'}`}
        >
          <View style={styles.workoutCardContent}>
            {/* Header with Status */}
            <View style={styles.workoutHeader}>
              <Text variant="labelMedium" style={styles.workoutLabel}>
                TODAY'S WORKOUT
              </Text>
              <View style={styles.headerActions}>
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
                {todayWorkout.status === 'not_started' && (
                  <IconButton
                    icon="swap-horizontal"
                    size={20}
                    iconColor={colors.primary.main}
                    onPress={handleOpenSwapDialog}
                    accessibilityLabel="Change workout"
                    style={styles.swapButton}
                  />
                )}
              </View>
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
                  {todayWorkout.exercises.length} exercises •{' '}
                  {todayWorkout.exercises.reduce((sum, ex) => sum + ex.sets, 0)} total sets
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
      ) : recommendedProgramDay ? (
        <GradientCard
          gradient={gradients.hero}
          style={styles.workoutCard}
          accessibilityLabel={`Recommended workout: ${recommendedProgramDay.day_name}`}
        >
          <View style={styles.workoutCardContent}>
            {/* Header with Recommended Label */}
            <View style={styles.workoutHeader}>
              <Text variant="labelMedium" style={styles.workoutLabel}>
                RECOMMENDED
              </Text>
            </View>

            {/* Workout Name */}
            <Text variant="headlineLarge" style={styles.workoutNameNew}>
              {recommendedProgramDay.day_name}
            </Text>

            {/* Workout Type */}
            <Text variant="bodyMedium" style={styles.workoutTypeNew}>
              {recommendedProgramDay.day_type === 'vo2max' ? 'VO2max Cardio' : 'Strength Training'}
            </Text>

            {/* Exercise Details */}
            {recommendedProgramDay.exercises && recommendedProgramDay.exercises.length > 0 && (
              <View style={styles.exerciseDetails}>
                <Text variant="labelMedium" style={styles.exerciseHeader}>
                  WORKOUT EXERCISES
                </Text>
                {recommendedProgramDay.exercises.map((exercise, index) => (
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
                  {recommendedProgramDay.exercises.length} exercises •{' '}
                  {recommendedProgramDay.exercises.reduce((sum, ex) => sum + ex.sets, 0)} total sets
                </Text>
              </View>
            )}

            {/* Action Button */}
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

      {/* T089: Weekly Volume Section */}
      <Card style={styles.volumeCard}>
        <Card.Title
          title="This Week's Volume"
          titleVariant="titleLarge"
          titleStyle={styles.sectionTitle}
        />
        <Card.Content>
          {isLoadingVolume && (
            <View style={styles.volumeLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text variant="bodyMedium" style={styles.loadingText}>
                Loading volume data...
              </Text>
            </View>
          )}

          {volumeError && (
            <View style={styles.errorContainer}>
              <Text variant="bodyMedium" style={styles.errorText}>
                Failed to load volume data
              </Text>
              <Button
                mode="outlined"
                onPress={() => refetchVolume()}
                style={styles.retryButton}
                compact
              >
                Retry
              </Button>
            </View>
          )}

          {volumeData && volumeData.muscle_groups && volumeData.muscle_groups.length > 0 && (
            <>
              {/* Filter to show only muscle groups with planned sets > 0 */}
              {volumeData.muscle_groups
                .filter((mg) => mg.planned_sets > 0)
                .sort((a, b) => a.muscle_group.localeCompare(b.muscle_group))
                .map((muscleGroup) => (
                  <MuscleGroupVolumeBar
                    key={muscleGroup.muscle_group}
                    muscleGroup={muscleGroup.muscle_group}
                    completedSets={muscleGroup.completed_sets}
                    plannedSets={muscleGroup.planned_sets}
                    mev={muscleGroup.mev}
                    mav={muscleGroup.mav}
                    mrv={muscleGroup.mrv}
                    zone={muscleGroup.zone}
                  />
                ))}

              {/* Week info */}
              <Text variant="bodySmall" style={styles.weekInfoText}>
                Week: {new Date(volumeData.week_start).toLocaleDateString()} -{' '}
                {new Date(volumeData.week_end).toLocaleDateString()}
              </Text>
            </>
          )}

          {volumeData && volumeData.muscle_groups && volumeData.muscle_groups.length === 0 && (
            <View style={styles.emptyVolumeContainer}>
              <Text variant="bodyMedium" style={styles.emptyVolumeText}>
                No training volume recorded this week
              </Text>
              <Text variant="bodySmall" style={styles.emptyVolumeHint}>
                Complete workouts to track your weekly volume
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Workout Swap Dialog */}
      <Portal>
        <Dialog
          visible={showSwapDialog}
          onDismiss={() => setShowSwapDialog(false)}
          style={styles.swapDialog}
        >
          <Dialog.Title>Change Workout</Dialog.Title>
          <Dialog.Content>
            {loadingProgramDays ? (
              <ActivityIndicator size="large" style={styles.dialogLoader} />
            ) : (
              <View>
                {programDays.map((day) => {
                  const isCurrentDay = todayWorkout?.program_day_id === day.id;
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
                      onPress={() => !isCurrentDay && handleSwapWorkout(day.id)}
                      disabled={swapping || isCurrentDay}
                      style={[styles.programDayItem, isCurrentDay && styles.currentProgramDay]}
                    />
                  );
                })}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSwapDialog(false)} disabled={swapping}>
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  quoteContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.main,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
  },
  quoteText: {
    color: colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  recoveryPrompt: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  promptTitle: {
    color: colors.text.tertiary,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },

  // Logged Recovery State
  recoveryLoggedState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  recoveryScoreText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  recoveryMessageText: {
    color: colors.text.secondary,
    fontSize: 12,
  },

  // Compact Recovery Assessment
  compactQuestions: {
    gap: spacing.xs,
  },
  compactQuestion: {
    marginBottom: spacing.xs,
  },
  submitButtonMinimal: {
    marginTop: spacing.xs,
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

  // Swap Dialog
  swapDialog: {
    backgroundColor: colors.background.secondary,
  },
  dialogLoader: {
    marginVertical: spacing.xl,
  },
  programDayItem: {
    backgroundColor: colors.background.primary,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  currentProgramDay: {
    backgroundColor: colors.primary.main + '20',
    borderWidth: 1,
    borderColor: colors.primary.main,
  },

  // T089: Weekly Volume Section
  volumeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  volumeLoadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.text.secondary,
  },
  errorContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    color: colors.error.main,
    textAlign: 'center',
  },
  retryButton: {
    borderColor: colors.primary.main,
    borderWidth: 1,
  },
  weekInfoText: {
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  emptyVolumeContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyVolumeText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyVolumeHint: {
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
