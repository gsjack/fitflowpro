/**
 * Exercise List Skeleton
 *
 * Skeleton loader for PlannerScreen exercise list
 * Matches layout of draggable exercise cards
 *
 * Web Compatibility: Shows simple loading indicator on web (skeleton library not web-compatible)
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SkeletonWrapper } from './SkeletonWrapper';
import { Card, ActivityIndicator } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';

interface ExerciseListSkeletonProps {
  count?: number; // Number of skeleton items to show
}

export function ExerciseListSkeleton({ count = 5 }: ExerciseListSkeletonProps) {
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
        <ExerciseItemSkeleton key={index} />
      ))}
    </View>
  );
}

function ExerciseItemSkeleton() {
  return (
    <Card style={styles.card} elevation={2}>
      <Card.Content style={styles.content}>
        <SkeletonWrapper
          backgroundColor={colors.background.tertiary}
          highlightColor={colors.background.secondary}
          speed={1200}
        >
          <View style={styles.row}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Exercise info */}
            <View style={styles.exerciseInfo}>
              {/* Exercise name */}
              <View style={styles.exerciseName} />

              {/* Exercise details (sets, reps, RIR) */}
              <View style={styles.detailsRow}>
                <View style={styles.setsAdjuster} />
                <View style={styles.repsRir} />
              </View>
            </View>

            {/* Menu button */}
            <View style={styles.menuButton} />
          </View>
        </SkeletonWrapper>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.background.tertiary,
  },
  content: {
    paddingVertical: spacing.sm,
  },
  webLoadingContainer: {
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: spacing.md,
  },
  exerciseInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseName: {
    width: '70%',
    height: 20,
    borderRadius: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setsAdjuster: {
    width: 100,
    height: 32,
    borderRadius: 8,
  },
  repsRir: {
    width: 120,
    height: 16,
    borderRadius: 6,
  },
  menuButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
});
