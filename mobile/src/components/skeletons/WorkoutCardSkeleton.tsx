/**
 * Workout Card Skeleton
 *
 * Skeleton loader for DashboardScreen workout card
 * Matches layout of actual workout card with gradient background
 *
 * Web Compatibility: Shows simple loading indicator on web (skeleton library not web-compatible)
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Card, ActivityIndicator } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';
import { SkeletonWrapper } from './SkeletonWrapper';

export function WorkoutCardSkeleton() {
  // Web fallback: show simple loading indicator (skeleton library not web-compatible)
  if (Platform.OS === 'web') {
    return (
      <Card style={styles.card}>
        <Card.Content style={[styles.content, styles.webLoadingContainer]}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </Card.Content>
      </Card>
    );
  }

  // Mobile: use animated skeleton
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <SkeletonWrapper
          backgroundColor={colors.background.tertiary}
          highlightColor={colors.background.secondary}
          speed={1200}
        >
          {/* Header with label and status chip */}
          <View style={styles.header}>
            <View style={styles.labelSkeleton} />
            <View style={styles.chipSkeleton} />
          </View>

          {/* Workout name */}
          <View style={styles.workoutNameSkeleton} />

          {/* Workout type */}
          <View style={styles.workoutTypeSkeleton} />

          {/* Exercise list */}
          <View style={styles.exerciseSection}>
            <View style={styles.exerciseSkeleton} />
            <View style={styles.exerciseSkeleton} />
            <View style={styles.exerciseSkeleton} />
          </View>

          {/* Action button */}
          <View style={styles.buttonSkeleton} />
        </SkeletonWrapper>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.background.secondary,
  },
  content: {
    padding: spacing.lg,
  },
  webLoadingContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  labelSkeleton: {
    width: 120,
    height: 12,
    borderRadius: 6,
  },
  chipSkeleton: {
    width: 80,
    height: 28,
    borderRadius: 14,
  },
  workoutNameSkeleton: {
    width: '70%',
    height: 28,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  workoutTypeSkeleton: {
    width: '50%',
    height: 16,
    borderRadius: 6,
    marginBottom: spacing.lg,
  },
  exerciseSection: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.effects.divider,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  exerciseSkeleton: {
    width: '100%',
    height: 40,
    borderRadius: 6,
  },
  buttonSkeleton: {
    width: '100%',
    height: 56,
    borderRadius: borderRadius.md,
  },
});
