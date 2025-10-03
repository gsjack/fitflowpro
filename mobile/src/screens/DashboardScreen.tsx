/**
 * Dashboard Screen (T060)
 *
 * Main dashboard showing:
 * - Today's workout card with "Start Workout" button
 * - Recent workout history (last 7 days)
 * - Recovery assessment prompt (if not submitted today)
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Button, Text, Divider, Chip, ActivityIndicator } from 'react-native-paper';
import { useWorkoutStore } from '../stores/workoutStore';
import { useRecoveryStore, getRecoveryMessage } from '../stores/recoveryStore';
import * as workoutDb from '../services/database/workoutDb';
import type { Workout } from '../database/db';
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
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);

  useWorkoutStore();
  const { todayAssessment, volumeAdjustment, getTodayAssessment } = useRecoveryStore();

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load today's assessment
      await getTodayAssessment(userId);

      // Load today's workout (includes day_name and day_type from API)
      const today = new Date().toISOString().split('T')[0];
      const todayWkt = await workoutDb.getTodayWorkout(userId);
      setTodayWorkout(todayWkt);

      // Load recent workout history (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];
      const recent = await workoutDb.getWorkouts(userId, startDate, today);
      setRecentWorkouts(recent.slice(0, 7));
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

  const handleSubmitRecovery = () => {
    if (onSubmitRecovery) {
      onSubmitRecovery();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
            accessibilityLabel="Recovery assessment needed"
          >
            <View style={styles.promptContent}>
              <Text variant="titleLarge" style={styles.promptTitle}>
                Start Your Day Right
              </Text>
              <Text variant="bodyMedium" style={styles.promptDescription}>
                Quick 30-second recovery check to optimize today's training
              </Text>
              <Button
                mode="contained"
                onPress={handleSubmitRecovery}
                style={styles.promptButton}
                buttonColor={colors.success.main}
                textColor="#000000"
                accessibilityLabel="Submit recovery check"
                accessibilityHint="Opens form to assess sleep, soreness, and motivation"
              >
                Submit Recovery Check
              </Button>
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
              {todayWorkout.day_type === 'vo2max' ? '🏃 VO2max Cardio' : '💪 Strength Training'}
            </Text>

            {/* Exercise Preview */}
            {todayWorkout.exercises && todayWorkout.exercises.length > 0 && (
              <View style={styles.exercisePreview}>
                <Text variant="bodySmall" style={styles.exerciseCount}>
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

      {/* Recent Workout History */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle} accessibilityRole="header">
            Recent History
          </Text>
          <Text
            variant="bodySmall"
            style={styles.cardSubtitle}
            accessibilityLabel="Showing workouts from the last 7 days"
          >
            Last 7 days
          </Text>
          <Divider style={styles.divider} />
          {recentWorkouts.length > 0 ? (
            recentWorkouts.map((workout, index) => (
              <View key={workout.id}>
                <View style={styles.historyItem}>
                  <View style={styles.historyDate}>
                    <Text variant="bodyMedium" style={styles.historyDateText}>
                      {formatDate(workout.date)}
                    </Text>
                  </View>
                  <View style={styles.historyDetails}>
                    <Chip
                      mode="flat"
                      style={[
                        styles.historyChip,
                        { backgroundColor: getStatusColor(workout.status) + '20' },
                      ]}
                      textStyle={{ color: getStatusColor(workout.status), fontSize: 12 }}
                    >
                      {workout.status.replace('_', ' ')}
                    </Chip>
                    {workout.total_volume_kg && (
                      <Text variant="bodySmall" style={styles.historyVolume}>
                        {workout.total_volume_kg.toFixed(0)} kg
                      </Text>
                    )}
                  </View>
                </View>
                {index < recentWorkouts.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))
          ) : (
            <Text variant="bodyMedium" style={styles.noHistory}>
              No recent workouts
            </Text>
          )}
        </Card.Content>
      </Card>
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
    padding: spacing.lg,
  },
  promptTitle: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  promptDescription: {
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  promptButton: {
    minHeight: 48,
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
  exercisePreview: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.effects.divider,
    borderBottomWidth: 1,
    borderBottomColor: colors.effects.divider,
    marginBottom: spacing.lg,
  },
  exerciseCount: {
    color: colors.text.tertiary,
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

  // Recent History
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  cardSubtitle: {
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  divider: {
    marginVertical: spacing.md,
    backgroundColor: colors.effects.divider,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  historyDate: {
    flex: 1,
  },
  historyDateText: {
    fontWeight: '500',
    color: colors.text.primary,
  },
  historyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyChip: {
    height: 28,
  },
  historyVolume: {
    color: colors.text.secondary,
    minWidth: 60,
    textAlign: 'right',
  },
  noHistory: {
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
