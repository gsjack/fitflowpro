/**
 * Stat Card Skeleton
 *
 * Skeleton loader for StatCard component
 * Used in AnalyticsScreen stats grid
 *
 * Web Compatibility: Shows simple loading indicator on web (skeleton library not web-compatible)
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { Card, ActivityIndicator } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface StatCardSkeletonProps {
  count?: number; // Number of stat cards to show
}

export function StatCardSkeleton({ count = 3 }: StatCardSkeletonProps) {
  // Web fallback: show simple loading indicators
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} style={styles.card} elevation={2}>
            <Card.Content style={[styles.content, styles.webLoadingContainer]}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <StatCardItemSkeleton key={index} />
      ))}
    </View>
  );
}

function StatCardItemSkeleton() {
  return (
    <Card style={styles.card} elevation={2}>
      <Card.Content style={styles.content}>
        <SkeletonPlaceholder
          backgroundColor={colors.background.tertiary}
          highlightColor={colors.background.secondary}
          speed={1200}
        >
          {/* Label */}
          <View style={styles.label} />

          {/* Value with unit */}
          <View style={styles.valueContainer}>
            <View style={styles.value} />
            <View style={styles.unit} />
          </View>

          {/* Description */}
          <View style={styles.description} />
        </SkeletonPlaceholder>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  content: {
    padding: spacing.lg,
  },
  webLoadingContainer: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    width: 120,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  value: {
    width: 80,
    height: 48,
    borderRadius: 8,
  },
  unit: {
    width: 30,
    height: 24,
    borderRadius: 6,
  },
  description: {
    width: '70%',
    height: 14,
    borderRadius: 6,
    marginTop: spacing.xs,
  },
});
