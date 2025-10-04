/**
 * Volume Bar Skeleton
 *
 * Skeleton loader for MuscleGroupVolumeBar component
 * Used in DashboardScreen weekly volume section
 *
 * Web Compatibility: Shows simple loading indicator on web (skeleton library not web-compatible)
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SkeletonWrapper } from './SkeletonWrapper';
import { Surface, ActivityIndicator } from 'react-native-paper';
import { colors } from '../../theme/colors';

interface VolumeBarSkeletonProps {
  count?: number; // Number of volume bars to show
}

export function VolumeBarSkeleton({ count = 3 }: VolumeBarSkeletonProps) {
  // Web fallback: show simple loading indicator
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {Array.from({ length: count }).map((_, index) => (
          <Surface key={index} style={[styles.surface, styles.webLoadingContainer]} elevation={1}>
            <ActivityIndicator size="small" color={colors.primary.main} />
          </Surface>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <VolumeBarItemSkeleton key={index} />
      ))}
    </View>
  );
}

function VolumeBarItemSkeleton() {
  return (
    <Surface style={styles.surface} elevation={1}>
      <SkeletonWrapper
        backgroundColor={colors.background.tertiary}
        highlightColor={colors.background.secondary}
        speed={1200}
      >
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.muscleGroupName} />
            <View style={styles.zoneIndicator} />
          </View>
          <View style={styles.headerRight}>
            <View style={styles.setsText} />
            <View style={styles.chevron} />
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar} />

        {/* Threshold labels */}
        <View style={styles.thresholdLabels}>
          <View style={styles.thresholdLabel} />
          <View style={styles.thresholdLabel} />
          <View style={styles.thresholdLabel} />
        </View>

        {/* Completion percentage */}
        <View style={styles.completionText} />
      </SkeletonWrapper>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  surface: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
  },
  webLoadingContainer: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleGroupName: {
    width: 100,
    height: 20,
    borderRadius: 6,
  },
  zoneIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setsText: {
    width: 50,
    height: 20,
    borderRadius: 6,
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  progressBar: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  thresholdLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  thresholdLabel: {
    width: 30,
    height: 10,
    borderRadius: 5,
  },
  completionText: {
    width: '60%',
    height: 14,
    borderRadius: 6,
  },
});
