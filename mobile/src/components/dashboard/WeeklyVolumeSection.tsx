/**
 * WeeklyVolumeSection Component
 *
 * Displays weekly training volume with muscle group breakdown.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Button, Text } from 'react-native-paper';
import { MuscleGroupVolumeBar } from '../analytics/MuscleGroupVolumeBar';
import { VolumeBarSkeleton } from '../skeletons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface MuscleGroupVolume {
  muscle_group: string;
  completed_sets: number;
  planned_sets: number;
  mev: number;
  mav: number;
  mrv: number;
  zone: string;
}

interface VolumeData {
  week_start: string;
  week_end: string;
  muscle_groups: MuscleGroupVolume[];
}

interface WeeklyVolumeSectionProps {
  volumeData: VolumeData | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export default function WeeklyVolumeSection({
  volumeData,
  isLoading,
  error,
  onRetry,
}: WeeklyVolumeSectionProps) {
  return (
    <Card style={styles.volumeCard}>
      <Card.Title
        title="This Week's Volume"
        titleVariant="titleLarge"
        titleStyle={styles.sectionTitle}
      />
      <Card.Content>
        {isLoading && <VolumeBarSkeleton count={3} />}

        {error && (
          <View style={styles.errorContainer}>
            <Text variant="bodyMedium" style={styles.errorText}>
              Failed to load volume data
            </Text>
            <Button mode="outlined" onPress={onRetry} style={styles.retryButton} compact>
              Retry
            </Button>
          </View>
        )}

        {volumeData && volumeData.muscle_groups && volumeData.muscle_groups.length > 0 && (
          <>
            {/* Filter to show only muscle groups with planned sets > 0, excluding minor muscle groups */}
            {volumeData.muscle_groups
              .filter((mg) => {
                const hasPlannedSets = mg.planned_sets > 0;
                const isExcluded = ['brachialis', 'forearms', 'traps'].includes(mg.muscle_group);
                return hasPlannedSets && !isExcluded;
              })
              .sort((a, b) => a.muscle_group.localeCompare(b.muscle_group))
              .map((muscleGroup) => (
                <MuscleGroupVolumeBar
                  key={muscleGroup.muscle_group}
                  muscleGroup={muscleGroup.muscle_group}
                  completedSets={muscleGroup.completed_sets}
                  plannedSets={muscleGroup.planned_sets}
                  mev={muscleGroup.mev}
                  mav={muscleGroup.mav}
                  mrv={muscleGroup.mrv}
                  zone={muscleGroup.zone}
                />
              ))}

            {/* Week info */}
            <Text variant="bodySmall" style={styles.weekInfoText}>
              Week: {new Date(volumeData.week_start).toLocaleDateString()} -{' '}
              {new Date(volumeData.week_end).toLocaleDateString()}
            </Text>
          </>
        )}

        {volumeData && volumeData.muscle_groups && volumeData.muscle_groups.length === 0 && (
          <View style={styles.emptyVolumeContainer}>
            <Text variant="bodyMedium" style={styles.emptyVolumeText}>
              No training volume recorded this week
            </Text>
            <Text variant="bodySmall" style={styles.emptyVolumeHint}>
              Complete workouts to track your weekly volume
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  volumeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  errorText: {
    color: colors.error.main,
    marginBottom: spacing.md,
  },
  retryButton: {
    borderColor: colors.primary.main,
  },
  weekInfoText: {
    color: colors.text.tertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyVolumeContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyVolumeText: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  emptyVolumeHint: {
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
