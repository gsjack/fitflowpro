/**
 * Analytics Screen (T062) - Migrated to Expo Router
 *
 * Displays analytics data with tab navigation for different metrics:
 * - Strength: 1RM progression tracking
 * - Volume: Weekly volume trends with MEV/MAV/MRV thresholds
 * - Consistency: Workout adherence and session metrics
 * - Cardio: VO2max progression and cardio metrics
 *
 * Uses TanStack Query hooks for data fetching with loading states.
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Animated } from 'react-native';
import { Surface, Text, SegmentedButtons, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useConsistencyMetrics } from '../../src/services/api/analyticsApi';
import { OneRMProgressionChart } from '../../src/components/analytics/OneRMProgressionChart';
import { VolumeChart } from '../../src/components/analytics/VolumeChart';
import { VolumeTrendsChart } from '../../src/components/analytics/VolumeTrendsChart';
import { WeeklyConsistencyCalendar } from '../../src/components/analytics/WeeklyConsistencyCalendar';
import VO2maxProgressionChart from '../../src/components/VO2maxProgressionChart';
import BodyWeightChart from '../../src/components/analytics/BodyWeightChart';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/typography';
import StatCard from '../../src/components/common/StatCard';
import { ChartSkeleton, StatCardSkeleton } from '../../src/components/skeletons';
import { useFadeIn } from '../../src/utils/animations';

/**
 * Tab options for analytics navigation
 */
type AnalyticsTab = 'strength' | 'volume' | 'consistency' | 'cardio';

/**
 * Analytics Screen Component
 */
export default function AnalyticsScreen(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('strength');

  // Default date range: last 8 weeks
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch consistency metrics (always loaded for summary)
  const {
    data: consistencyData,
    isLoading: isLoadingConsistency,
    error: consistencyError,
  } = useConsistencyMetrics();

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <Surface style={styles.tabContainer} elevation={0}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={(value) => setActiveTab(value)}
          buttons={[
            {
              value: 'strength',
              label: 'Strength',
            },
            {
              value: 'volume',
              label: 'Volume',
            },
            {
              value: 'consistency',
              label: 'Stats',
            },
            {
              value: 'cardio',
              label: 'Cardio',
            },
          ]}
          style={styles.segmentedButtons}
          theme={{
            colors: {
              secondaryContainer: colors.primary.main,
              onSecondaryContainer: colors.text.primary,
              surfaceVariant: colors.background.tertiary,
              onSurfaceVariant: colors.text.secondary,
            },
          }}
        />
      </Surface>

      {/* Tab Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'strength' && <StrengthTab startDate={startDate} endDate={endDate} />}

        {activeTab === 'volume' && <VolumeTab startDate={startDate} endDate={endDate} />}

        {activeTab === 'consistency' && (
          <ConsistencyTab
            data={consistencyData}
            isLoading={isLoadingConsistency}
            error={consistencyError}
          />
        )}

        {activeTab === 'cardio' && <CardioTab />}
      </ScrollView>
    </View>
  );
}

/**
 * Strength Tab - 1RM Progression
 */
interface StrengthTabProps {
  startDate: string;
  endDate: string;
}

function StrengthTab({ startDate, endDate }: StrengthTabProps): React.JSX.Element {
  const fadeAnim = useFadeIn(true);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        1RM Progression
      </Text>
      <Text variant="bodyMedium" style={styles.sectionDescription}>
        Track your estimated one-rep max over time using the Epley formula with RIR adjustment.
      </Text>

      <OneRMProgressionChart startDate={startDate} endDate={endDate} />

      <Text variant="titleLarge" style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
        Body Weight
      </Text>
      <Text variant="bodyMedium" style={styles.sectionDescription}>
        Monitor body weight changes over time to track progress alongside strength gains.
      </Text>

      <BodyWeightChart unit="kg" />
    </Animated.View>
  );
}

/**
 * Volume Tab - Weekly Volume Trends
 */
interface VolumeTabProps {
  startDate: string;
  endDate: string;
}

function VolumeTab({ startDate, endDate }: VolumeTabProps): React.JSX.Element {
  const fadeAnim = useFadeIn(true);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        Volume Trends
      </Text>
      <Text variant="bodyMedium" style={styles.sectionDescription}>
        Monitor weekly volume per muscle group with MEV/MAV/MRV landmarks from Renaissance
        Periodization.
      </Text>

      {/* Line chart showing volume trends over time */}
      <VolumeTrendsChart weeks={8} />

      {/* Bar chart showing weekly volume with MEV/MAV/MRV thresholds */}
      <VolumeChart startDate={startDate} endDate={endDate} />
    </Animated.View>
  );
}

/**
 * Consistency Tab - Adherence Metrics
 */
interface ConsistencyTabProps {
  data: any;
  isLoading: boolean;
  error: Error | null;
}

function ConsistencyTab({ data, isLoading, error }: ConsistencyTabProps): React.JSX.Element {
  const router = useRouter();
  const fadeAnim = useFadeIn(!isLoading && !!data);

  if (isLoading) {
    return (
      <View>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          Performance Stats
        </Text>
        <ChartSkeleton height={200} showLegend={false} />
        <StatCardSkeleton count={3} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContent}>
        <Text variant="bodyLarge" style={styles.errorText}>
          Error loading data
        </Text>
        <Text variant="bodyMedium" style={styles.errorSubtext}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centerContent}>
        <MaterialCommunityIcons name="chart-line-variant" size={80} color={colors.text.disabled} />
        <Text variant="headlineMedium" style={styles.emptyText}>
          Start tracking your progress
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtext}>
          Complete at least 3 workouts to unlock analytics and see your strength gains
        </Text>
        <Button
          mode="contained"
          onPress={() => router.push('/(tabs)')}
          style={styles.emptyCTA}
          icon="dumbbell"
          contentStyle={styles.emptyCtaContent}
          accessibilityLabel="Go to Dashboard to start your first workout"
        >
          Start Your First Workout
        </Button>
      </View>
    );
  }

  const adherencePercentage = Math.round(data.adherence_rate * 100);
  const avgDurationMinutes = Math.round(data.avg_session_duration);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        Performance Stats
      </Text>

      {/* Weekly Consistency Calendar (heatmap) */}
      <WeeklyConsistencyCalendar weeks={12} />

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Adherence Rate"
          value={adherencePercentage}
          unit="%"
          description="Scheduled workouts completed"
          color={
            adherencePercentage >= 80
              ? colors.success.main
              : adherencePercentage >= 60
                ? colors.warning.main
                : colors.error.main
          }
        />

        <StatCard
          label="Avg Duration"
          value={avgDurationMinutes}
          unit="min"
          description="Average workout time"
          color={colors.primary.main}
        />

        <StatCard
          label="Total Workouts"
          value={data.total_workouts}
          description="All-time completed sessions"
          color={colors.success.main}
        />
      </View>
    </Animated.View>
  );
}

/**
 * Cardio Tab - VO2max Progression (T100)
 */
function CardioTab(): React.JSX.Element {
  const fadeAnim = useFadeIn(true);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        Cardio Performance
      </Text>
      <Text variant="bodyMedium" style={styles.sectionDescription}>
        Track your cardiovascular fitness improvements with VO2max estimation from Norwegian 4x4 and
        Zone 2 protocols.
      </Text>

      {/* VO2max Progression Chart with date range selector */}
      <VO2maxProgressionChart />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  tabContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.effects.divider,
  },
  segmentedButtons: {
    backgroundColor: colors.background.secondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionDescription: {
    marginBottom: spacing.lg,
    color: colors.text.secondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    marginTop: spacing.lg,
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.error.main,
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.lg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyCTA: {
    marginTop: spacing.xl,
    borderRadius: 8,
  },
  emptyCtaContent: {
    height: 48,
    paddingHorizontal: spacing.lg,
  },
  statsGrid: {
    gap: spacing.md,
  },
  placeholderText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  placeholderSubtext: {
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
});
