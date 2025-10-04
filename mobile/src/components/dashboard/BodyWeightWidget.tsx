/**
 * Body Weight Widget
 * Shows latest weight, trend indicator, and quick-add button
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Button, Text, ActivityIndicator } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLatestBodyWeight, type LatestWeightResponse } from '../../services/api/bodyWeightApi';
import { getAuthenticatedClient } from '../../services/api/authApi';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';
import WeightLogModal from './WeightLogModal';

interface BodyWeightWidgetProps {
  onWeightLogged?: () => void;
}

/**
 * Format weight based on unit preference
 */
function formatWeight(weightKg: number, unit: 'kg' | 'lbs'): string {
  if (unit === 'lbs') {
    const weightLbs = weightKg * 2.20462;
    return `${weightLbs.toFixed(1)} lbs`;
  }
  return `${weightKg.toFixed(1)} kg`;
}

/**
 * Get trend indicator icon
 */
function getTrendIndicator(change: number | null | undefined): string {
  if (!change || Math.abs(change) < 0.1) return '→';
  return change > 0 ? '↑' : '↓';
}

/**
 * Get trend color
 */
function getTrendColor(change: number | null | undefined): string {
  if (!change || Math.abs(change) < 0.1) return colors.text.secondary;
  return change > 0 ? colors.error.main : colors.success.main;
}

export default function BodyWeightWidget({ onWeightLogged }: BodyWeightWidgetProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [unit] = useState<'kg' | 'lbs'>('kg'); // TODO: Read from settingsStore when implemented
  const queryClient = useQueryClient();

  // Fetch latest weight data
  const { data, isLoading, error } = useQuery<LatestWeightResponse>({
    queryKey: ['bodyWeight', 'latest'],
    queryFn: async () => {
      const client = await getAuthenticatedClient();
      if (!client?.token) {
        throw new Error('Not authenticated');
      }
      return getLatestBodyWeight(client.token);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleWeightLogged = async () => {
    // Refresh data
    await queryClient.invalidateQueries({ queryKey: ['bodyWeight'] });
    onWeightLogged?.();
  };

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.loadingContainer}>
          <ActivityIndicator />
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="bodyMedium" style={styles.errorText}>
            Failed to load weight data
          </Text>
          <Button mode="text" onPress={() => queryClient.invalidateQueries({ queryKey: ['bodyWeight'] })}>
            Retry
          </Button>
        </Card.Content>
      </Card>
    );
  }

  const { latest, week_change } = data || {};

  return (
    <>
      <Card style={styles.card}>
        <Card.Content>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="labelLarge" style={styles.title}>
              Body Weight
            </Text>
            <Text style={styles.icon}>📊</Text>
          </View>

          {/* Weight Display */}
          {latest ? (
            <View style={styles.weightContainer}>
              <View style={styles.weightRow}>
                <Text variant="headlineLarge" style={styles.weight}>
                  {formatWeight(latest.weight_kg, unit)}
                </Text>
                {week_change && (
                  <View style={styles.trendContainer}>
                    <Text
                      variant="titleMedium"
                      style={[styles.trendIndicator, { color: getTrendColor(week_change.weight_change_kg) }]}
                    >
                      {getTrendIndicator(week_change.weight_change_kg)}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[styles.trendValue, { color: getTrendColor(week_change.weight_change_kg) }]}
                    >
                      {week_change.weight_change_kg > 0 ? '+' : ''}
                      {formatWeight(Math.abs(week_change.weight_change_kg), unit)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Last logged date */}
              <Text variant="bodySmall" style={styles.lastLogged}>
                Last logged: {new Date(latest.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
          ) : (
            <Text variant="bodyMedium" style={styles.noDataText}>
              No weight logged yet
            </Text>
          )}

          {/* Log Weight Button */}
          <Button
            mode="contained"
            onPress={() => setModalVisible(true)}
            style={styles.logButton}
            contentStyle={styles.logButtonContent}
            accessibilityLabel="Log weight"
          >
            Log Weight
          </Button>
        </Card.Content>
      </Card>

      {/* Weight Log Modal */}
      <WeightLogModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onWeightLogged={handleWeightLogged}
        unit={unit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.paper,
    elevation: 2,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  icon: {
    fontSize: 24,
  },
  weightContainer: {
    marginBottom: spacing.md,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  weight: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendIndicator: {
    fontWeight: '600',
    fontSize: 20,
  },
  trendValue: {
    fontWeight: '600',
  },
  lastLogged: {
    color: colors.text.secondary,
  },
  noDataText: {
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  logButton: {
    marginTop: spacing.sm,
  },
  logButtonContent: {
    paddingVertical: spacing.xs,
  },
  errorText: {
    color: colors.error.main,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
