/**
 * Analytics Screen (T062)
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
import { View, ScrollView, StyleSheet } from 'react-native';
import { Surface, Text, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useConsistencyMetrics,
} from '../services/api/analyticsApi';
import { OneRMProgressionChart } from '../components/analytics/OneRMProgressionChart';
import { VolumeChart } from '../components/analytics/VolumeChart';
import { colors } from '../theme/colors';
import { spacing } from '../theme/typography';
import StatCard from '../components/common/StatCard';

/**
 * Tab options for analytics navigation
 */
type AnalyticsTab = 'strength' | 'volume' | 'consistency' | 'cardio';

/**
 * Analytics Screen Component
 */
export function AnalyticsScreen(): React.JSX.Element {
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
          onValueChange={(value) => setActiveTab(value as AnalyticsTab)}
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
  return (
    <View>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        1RM Progression
      </Text>
      <Text variant="bodyMedium" style={styles.sectionDescription}>
        Track your estimated one-rep max over time using the Epley formula with RIR adjustment.
      </Text>

      <OneRMProgressionChart startDate={startDate} endDate={endDate} />
    </View>
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
  return (
    <View>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        Volume Trends
      </Text>
      <Text variant="bodyMedium" style={styles.sectionDescription}>
        Monitor weekly volume per muscle group with MEV/MAV/MRV landmarks from Renaissance
        Periodization.
      </Text>

      <VolumeChart startDate={startDate} endDate={endDate} />
    </View>
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
  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading stats...
        </Text>
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
        <MaterialCommunityIcons
          name="chart-line-variant"
          size={64}
          color={colors.text.disabled}
        />
        <Text variant="titleMedium" style={styles.emptyText}>No data available</Text>
        <Text variant="bodyMedium" style={styles.emptySubtext}>
          Complete workouts to see your performance stats
        </Text>
      </View>
    );
  }

  const adherencePercentage = Math.round(data.adherence_rate * 100);
  const avgDurationMinutes = Math.round(data.avg_session_duration);

  return (
    <View>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        Performance Stats
      </Text>

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
    </View>
  );
}

/**
 * Cardio Tab - VO2max Progression
 */
function CardioTab(): React.JSX.Element {
  return (
    <View style={styles.centerContent}>
      <MaterialCommunityIcons
        name="run"
        size={64}
        color={colors.text.disabled}
      />
      <Text variant="titleLarge" style={styles.sectionTitle}>
        Cardio Metrics
      </Text>
      <Text variant="bodyMedium" style={styles.placeholderText}>
        VO2max progression tracking coming soon
      </Text>
      <Text variant="bodySmall" style={styles.placeholderSubtext}>
        Track your cardiovascular fitness improvements with Norwegian 4x4 protocol
      </Text>
    </View>
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

export default AnalyticsScreen;
