/**
 * Dashboard Screen (T060) - Migrated to Expo Router
 *
 * Main dashboard showing:
 * - Today's workout card with "Start Workout" button
 * - Inline recovery assessment (if not submitted today)
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { Card, Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useRecoveryStore } from '../../src/stores/recoveryStore';
import * as workoutDb from '../../src/services/database/workoutDb';
import type { Workout } from '../../src/services/database/workoutDb';
import { colors } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/typography';
import { getAuthenticatedClient, getUserId } from '../../src/services/api/authApi';
import { getQuoteOfTheDay } from '../../src/constants/quotes';
import { useCurrentWeekVolume } from '../../src/services/api/analyticsApi';
import { WorkoutCardSkeleton, VolumeBarSkeleton } from '../../src/components/skeletons';
import BodyWeightWidget from '../../src/components/dashboard/BodyWeightWidget';
import TodaysWorkoutCard from '../../src/components/dashboard/TodaysWorkoutCard';
import WeeklyVolumeSection from '../../src/components/dashboard/WeeklyVolumeSection';
import WorkoutSwapDialog from '../../src/components/dashboard/WorkoutSwapDialog';
import DashboardHeader from '../../src/components/dashboard/DashboardHeader';
import { useWorkoutSwap } from '../../src/hooks/useWorkoutSwap';

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

export default function DashboardScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null);
  const [recommendedProgramDay, setRecommendedProgramDay] = useState<RecommendedProgramDay | null>(
    null
  );

  useWorkoutStore();
  const { todayAssessment, volumeAdjustment, getTodayAssessment, submitAssessment } =
    useRecoveryStore();

  // Workout swap hook for changing today's workout
  const workoutSwap = useWorkoutSwap({
    onSwapSuccess: async () => {
      await loadDashboardData();
    },
  });

  // T090: Add volume tracking data fetching with TanStack Query
  const {
    data: volumeData,
    isLoading: isLoadingVolume,
    error: volumeError,
    refetch: refetchVolume,
    isRefetching: isRefetchingVolume,
  } = useCurrentWeekVolume();

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadDashboardData();
    }
  }, [userId]);

  const initializeUser = async () => {
    try {
      const id = await getUserId();
      setUserId(id);
    } catch (error) {
      console.error('[DashboardScreen] Error getting user ID:', error);
    }
  };

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
    if (!userId) return;

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
    if (!userId) return;

    // Haptic feedback on workout start (mobile only)
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // Start workout in store (creates workout if needed)
      if (todayWorkout) {
        // Workout already exists, load it into store before navigating
        const { startWorkout } = useWorkoutStore.getState();
        await startWorkout(userId, todayWorkout.program_day_id, todayWorkout.date);

        // Navigate after workout is loaded into store
        if (todayWorkout.day_type === 'vo2max') {
          router.push({
            pathname: '/(tabs)/vo2max-workout',
            params: { programDayId: todayWorkout.program_day_id, date: todayWorkout.date },
          });
        } else {
          router.push({
            pathname: '/(tabs)/workout',
            params: { programDayId: todayWorkout.program_day_id, date: todayWorkout.date },
          });
        }
      } else if (recommendedProgramDay) {
        const today = new Date().toISOString().split('T')[0];

        // Create workout via store before navigating
        const { startWorkout } = useWorkoutStore.getState();
        await startWorkout(userId, recommendedProgramDay.id, today);

        // Navigate after workout is created
        if (recommendedProgramDay.day_type === 'vo2max') {
          router.push({
            pathname: '/(tabs)/vo2max-workout',
            params: { programDayId: recommendedProgramDay.id, date: today },
          });
        } else {
          router.push({
            pathname: '/(tabs)/workout',
            params: { programDayId: recommendedProgramDay.id, date: today },
          });
        }
      }
    } catch (error) {
      console.error('[DashboardScreen] Error starting workout:', error);
      // Show error feedback (mobile only)
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleSubmitRecoveryAssessment = async (
    sleepQuality: number,
    muscleSoreness: number,
    mentalMotivation: number
  ) => {
    if (!userId) return;

    try {
      // Haptic feedback on successful submission (mobile only)
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      await submitAssessment(userId, sleepQuality, muscleSoreness, mentalMotivation);
    } catch (error) {
      console.error('[DashboardScreen] Error submitting recovery:', error);
      // Haptic feedback on error (mobile only)
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleSwapWorkout = async (newProgramDayId: number) => {
    if (!todayWorkout) return;
    await workoutSwap.swapWorkout(todayWorkout.id, newProgramDayId);
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.heroSection}>
          <Text variant="headlineLarge" style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <WorkoutCardSkeleton />
        <Card style={styles.volumeCard}>
          <Card.Title
            title="This Week's Volume"
            titleVariant="titleLarge"
            titleStyle={styles.sectionTitle}
          />
          <Card.Content>
            <VolumeBarSkeleton count={3} />
          </Card.Content>
        </Card>
      </ScrollView>
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
      <View>
        {/* Hero Section with Date, Quote & Recovery */}
        <DashboardHeader
          date={new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
          quote={quoteOfTheDay}
          todayAssessment={todayAssessment}
          volumeAdjustment={volumeAdjustment}
          onSubmitRecoveryAssessment={handleSubmitRecoveryAssessment}
          isSubmitting={false}
        />

        {/* Today's Workout Card */}
        {todayWorkout ? (
          <TodaysWorkoutCard
            dayName={todayWorkout.day_name || 'Workout'}
            dayType={todayWorkout.day_type}
            status={todayWorkout.status}
            exercises={todayWorkout.exercises}
            totalVolumeKg={todayWorkout.total_volume_kg}
            averageRir={todayWorkout.average_rir}
            onStartWorkout={handleStartWorkout}
            onSwapWorkout={workoutSwap.openDialog}
          />
        ) : recommendedProgramDay ? (
          <TodaysWorkoutCard
            dayName={recommendedProgramDay.day_name}
            dayType={recommendedProgramDay.day_type}
            status="not_started"
            exercises={recommendedProgramDay.exercises}
            isRecommended
            onStartWorkout={handleStartWorkout}
          />
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

        {/* Weekly Volume Section */}
        <WeeklyVolumeSection
          volumeData={volumeData}
          isLoading={isLoadingVolume}
          error={volumeError}
          onRetry={refetchVolume}
        />

        {/* Body Weight Widget */}
        <BodyWeightWidget onWeightLogged={handleRefresh} />
      </View>

      {/* Workout Swap Dialog */}
      <WorkoutSwapDialog
        visible={workoutSwap.showDialog}
        programDays={workoutSwap.programDays}
        currentProgramDayId={todayWorkout?.program_day_id}
        isLoading={workoutSwap.isLoadingDays}
        isSwapping={workoutSwap.isSwapping}
        onDismiss={workoutSwap.closeDialog}
        onSwapWorkout={handleSwapWorkout}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
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
