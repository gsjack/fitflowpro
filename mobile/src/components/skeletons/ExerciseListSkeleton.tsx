/**
 * Exercise List Skeleton
 *
 * Skeleton loader for PlannerScreen exercise list
 * Matches layout of draggable exercise cards
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { Card } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';

interface ExerciseListSkeletonProps {
  count?: number; // Number of skeleton items to show
}

export function ExerciseListSkeleton({ count = 5 }: ExerciseListSkeletonProps) {
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
        <SkeletonPlaceholder
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
        </SkeletonPlaceholder>
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
