/**
 * Workout Exercise Skeleton
 *
 * Skeleton loader for WorkoutScreen exercise loading state
 * Matches layout of exercise header and set logging card
 *
 * Web Compatibility: Shows simple loading indicator on web (skeleton library not web-compatible)
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SkeletonWrapper } from './SkeletonWrapper';
import { Card, ActivityIndicator } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

export function WorkoutExerciseSkeleton() {
  // Web fallback: show simple loading indicator
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, styles.webLoadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SkeletonWrapper
        backgroundColor={colors.background.tertiary}
        highlightColor={colors.background.secondary}
        speed={1200}
      >
        {/* Header section */}
        <View style={styles.header}>
          <View style={styles.labelSkeleton} />
          <View style={styles.titleSkeleton} />
          <View style={styles.progressSkeleton} />
        </View>

        {/* Set logging card */}
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            {/* Input row */}
            <View style={styles.inputRow}>
              <View style={styles.inputSkeleton} />
              <View style={styles.inputSkeleton} />
              <View style={styles.inputSkeleton} />
            </View>

            {/* Previous set info */}
            <View style={styles.previousSetRow}>
              <View style={styles.previousSetLabel} />
              <View style={styles.previousSetValue} />
            </View>

            {/* Log set button */}
            <View style={styles.buttonSkeleton} />
          </View>
        </Card>
      </SkeletonWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  webLoadingContainer: {
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  labelSkeleton: {
    width: 120,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  titleSkeleton: {
    width: '70%',
    height: 28,
    borderRadius: 6,
    marginBottom: spacing.md,
  },
  progressSkeleton: {
    width: '100%',
    height: 12,
    borderRadius: 6,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  cardContent: {
    gap: spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputSkeleton: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.md,
  },
  previousSetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previousSetLabel: {
    width: 120,
    height: 14,
    borderRadius: 6,
  },
  previousSetValue: {
    width: 100,
    height: 14,
    borderRadius: 6,
  },
  buttonSkeleton: {
    width: '100%',
    height: 56,
    borderRadius: borderRadius.md,
  },
});
