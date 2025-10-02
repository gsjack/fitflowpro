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
      {/* Recovery Assessment Prompt */}
      {!todayAssessment && (
        <Card
          style={styles.card}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel="Recovery assessment needed"
        >
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle} accessibilityRole="header">
              Recovery Assessment
            </Text>
            <Text variant="bodyMedium" style={styles.cardDescription}>
              How are you feeling today? Submit your daily recovery check-in to optimize your
              workout volume.
            </Text>
            <Button
              mode="contained"
              onPress={handleSubmitRecovery}
              style={styles.button}
              accessibilityLabel="Submit recovery check"
              accessibilityHint="Opens form to assess sleep, soreness, and motivation"
              accessibilityRole="button"
            >
              Submit Recovery Check
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Recovery Status (if assessment exists) */}
      {todayAssessment && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle} accessibilityRole="header">
              Recovery Status
            </Text>
            <View style={styles.recoveryInfo}>
              <Chip
                mode="flat"
                style={[
                  styles.recoveryChip,
                  {
                    backgroundColor:
                      volumeAdjustment === 'none'
                        ? '#22c55e20'
                        : volumeAdjustment === 'rest_day'
                          ? '#ef444420'
                          : '#eab30820',
                  },
                ]}
              >
                Score: {todayAssessment.total_score}/15
              </Chip>
            </View>
            <Text variant="bodyMedium" style={styles.recoveryMessage}>
              {getRecoveryMessage(volumeAdjustment)}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Today's Workout Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle} accessibilityRole="header">
            Today's Workout
          </Text>
          {todayWorkout ? (
            <>
              <Text variant="bodyLarge" style={styles.workoutName} accessibilityRole="text">
                {todayWorkout.day_name || 'Workout'}
              </Text>
              <Text
                variant="bodyMedium"
                style={styles.workoutType}
                accessibilityLabel={`Workout type: ${todayWorkout.day_type === 'vo2max' ? 'VO2max Cardio' : 'Strength Training'}`}
              >
                {todayWorkout.day_type === 'vo2max' ? 'VO2max Cardio' : 'Strength Training'}
              </Text>

              {/* Exercise List */}
              {todayWorkout.exercises && todayWorkout.exercises.length > 0 && (
                <View style={styles.exerciseList}>
                  {todayWorkout.exercises.map((exercise, index) => (
                    <View key={exercise.id} style={styles.exerciseItem}>
                      <Text variant="bodyMedium" style={styles.exerciseName}>
                        {index + 1}. {exercise.exercise_name}
                      </Text>
                      <Text variant="bodySmall" style={styles.exerciseDetails}>
                        {exercise.sets} sets × {exercise.reps} reps @ RIR {exercise.rir}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View
                style={styles.workoutStatus}
                accessible={true}
                accessibilityLabel={`Status: ${todayWorkout.status.replace('_', ' ')}`}
              >
                <Chip
                  mode="flat"
                  style={[
                    styles.statusChip,
                    { backgroundColor: getStatusColor(todayWorkout.status) + '20' },
                  ]}
                  textStyle={{ color: getStatusColor(todayWorkout.status) }}
                  accessibilityElementsHidden={true}
                  importantForAccessibility="no"
                >
                  {todayWorkout.status.replace('_', ' ').toUpperCase()}
                </Chip>
              </View>
              {todayWorkout.status === 'not_started' && (
                <Button
                  mode="contained"
                  onPress={handleStartWorkout}
                  style={styles.button}
                  accessibilityLabel="Start workout"
                  accessibilityHint={`Begin ${todayWorkout.day_name || "today's workout"}`}
                  accessibilityRole="button"
                >
                  Start Workout
                </Button>
              )}
              {todayWorkout.status === 'in_progress' && (
                <Button
                  mode="contained"
                  onPress={handleStartWorkout}
                  style={styles.button}
                  accessibilityLabel="Resume workout"
                  accessibilityHint="Continue the workout in progress"
                  accessibilityRole="button"
                >
                  Resume Workout
                </Button>
              )}
              {todayWorkout.status === 'completed' && todayWorkout.total_volume_kg && (
                <View style={styles.workoutMetrics}>
                  <Text variant="bodyMedium">
                    Total Volume: {todayWorkout.total_volume_kg.toFixed(0)} kg
                  </Text>
                  {todayWorkout.average_rir !== undefined && (
                    <Text variant="bodyMedium">
                      Average RIR: {todayWorkout.average_rir.toFixed(1)}
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              <Text variant="bodyMedium" style={styles.noWorkout}>
                No workout scheduled for today
              </Text>
              <Text variant="bodySmall" style={styles.noWorkoutHint}>
                Check your program planner to schedule workouts
              </Text>
            </>
          )}
        </Card.Content>
      </Card>

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
    backgroundColor: '#f5f5f5',
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
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardSubtitle: {
    color: '#6b7280',
    marginBottom: 8,
  },
  cardDescription: {
    marginBottom: 16,
    color: '#4b5563',
  },
  button: {
    marginTop: 16,
    minHeight: 44, // WCAG 2.1 AA: Minimum 44pt touch target
  },
  recoveryInfo: {
    marginVertical: 8,
  },
  recoveryChip: {
    alignSelf: 'flex-start',
  },
  recoveryMessage: {
    marginTop: 8,
    color: '#4b5563',
  },
  workoutName: {
    fontWeight: '600',
    marginTop: 4,
  },
  workoutType: {
    color: '#6b7280',
    marginTop: 4,
  },
  exerciseList: {
    marginTop: 12,
    marginBottom: 8,
  },
  exerciseItem: {
    marginBottom: 8,
  },
  exerciseName: {
    fontWeight: '500',
  },
  exerciseDetails: {
    color: '#6b7280',
    marginTop: 2,
  },
  workoutStatus: {
    marginTop: 12,
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  workoutMetrics: {
    marginTop: 16,
    gap: 4,
  },
  noWorkout: {
    color: '#6b7280',
    marginTop: 8,
  },
  noWorkoutHint: {
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  historyDate: {
    flex: 1,
  },
  historyDateText: {
    fontWeight: '500',
  },
  historyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyChip: {
    height: 28,
  },
  historyVolume: {
    color: '#6b7280',
    minWidth: 60,
    textAlign: 'right',
  },
  noHistory: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
