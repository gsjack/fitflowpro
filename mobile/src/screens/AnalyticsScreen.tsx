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
import { Surface, Text, SegmentedButtons, ActivityIndicator, useTheme } from 'react-native-paper';
import {
  useConsistencyMetrics,
} from '../services/api/analyticsApi';
import { OneRMProgressionChart } from '../components/analytics/OneRMProgressionChart';
import { VolumeChart } from '../components/analytics/VolumeChart';

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
      <Surface style={styles.tabContainer} elevation={1}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={(value) => setActiveTab(value)}
          buttons={[
            {
              value: 'strength',
              label: 'Strength',
              icon: 'weight-lifter',
            },
            {
              value: 'volume',
              label: 'Volume',
              icon: 'chart-bar',
            },
            {
              value: 'consistency',
              label: 'Consistency',
              icon: 'calendar-check',
            },
            {
              value: 'cardio',
              label: 'Cardio',
              icon: 'run',
            },
          ]}
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
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading consistency metrics...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContent}>
        <Text variant="bodyLarge" style={styles.errorText}>
          Error loading consistency data
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
        <Text variant="bodyMedium">No consistency data available</Text>
      </View>
    );
  }

  const adherencePercentage = Math.round(data.adherence_rate * 100);
  const avgDurationMinutes = Math.round(data.avg_session_duration);

  return (
    <View>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        Consistency Metrics
      </Text>

      {/* Adherence Rate */}
      <Surface style={styles.metricCard} elevation={1}>
        <Text variant="titleMedium" style={styles.metricLabel}>
          Adherence Rate
        </Text>
        <Text variant="displaySmall" style={[styles.metricValue, { color: theme.colors.primary }]}>
          {adherencePercentage}%
        </Text>
        <Text variant="bodySmall" style={styles.metricDescription}>
          Percentage of scheduled workouts completed
        </Text>
      </Surface>

      {/* Average Session Duration */}
      <Surface style={styles.metricCard} elevation={1}>
        <Text variant="titleMedium" style={styles.metricLabel}>
          Average Session Duration
        </Text>
        <Text variant="displaySmall" style={[styles.metricValue, { color: theme.colors.primary }]}>
          {avgDurationMinutes}
          <Text variant="titleMedium"> min</Text>
        </Text>
        <Text variant="bodySmall" style={styles.metricDescription}>
          Average workout duration
        </Text>
      </Surface>

      {/* Total Workouts */}
      <Surface style={styles.metricCard} elevation={1}>
        <Text variant="titleMedium" style={styles.metricLabel}>
          Total Workouts
        </Text>
        <Text variant="displaySmall" style={[styles.metricValue, { color: theme.colors.primary }]}>
          {data.total_workouts}
        </Text>
        <Text variant="bodySmall" style={styles.metricDescription}>
          Workouts completed all-time
        </Text>
      </Surface>
    </View>
  );
}

/**
 * Cardio Tab - VO2max Progression
 */
function CardioTab(): React.JSX.Element {
  return (
    <View style={styles.centerContent}>
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
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  sectionDescription: {
    marginBottom: 16,
    color: '#666',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#666',
    textAlign: 'center',
  },
  metricCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  metricLabel: {
    marginBottom: 8,
    color: '#666',
  },
  metricValue: {
    fontWeight: '700',
    marginBottom: 4,
  },
  metricDescription: {
    color: '#999',
  },
  placeholderText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  placeholderSubtext: {
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
});

export default AnalyticsScreen;
