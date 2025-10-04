/**
 * Program Volume Overview Component (T092)
 *
 * Volume summary tile showing weekly volume per muscle group.
 * Features:
 * - Bar chart or summary of planned weekly volume per muscle group
 * - Volume zone badges (below_mev, adequate, optimal, above_mrv)
 * - Warnings for muscle groups outside optimal range
 * - Integrates VolumeWarningBadge component
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, ProgressBar } from 'react-native-paper';
import VolumeWarningBadge from './VolumeWarningBadge';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

export interface MuscleGroupVolume {
  muscle_group: string;
  planned_weekly_sets: number;
  mev: number;
  mav: number;
  mrv: number;
  zone: 'below_mev' | 'adequate' | 'optimal' | 'above_mrv';
  warning: string | null;
}

interface ProgramVolumeOverviewProps {
  muscleGroups: MuscleGroupVolume[];
}

/**
 * Program Volume Overview Component
 *
 * @param muscleGroups - Array of muscle group volume data with zones and warnings
 */
export default function ProgramVolumeOverview({ muscleGroups }: ProgramVolumeOverviewProps) {
  /**
   * Calculate progress bar value (0-1) based on zone
   */
  const getProgressValue = (mg: MuscleGroupVolume): number => {
    if (mg.zone === 'below_mev') {
      // 0 to MEV = 0 to 0.33
      return Math.min(mg.planned_weekly_sets / mg.mev, 1) * 0.33;
    } else if (mg.zone === 'adequate') {
      // MEV to MAV = 0.33 to 0.67
      const progress = (mg.planned_weekly_sets - mg.mev) / (mg.mav - mg.mev);
      return 0.33 + progress * 0.34;
    } else if (mg.zone === 'optimal') {
      // MAV to MRV = 0.67 to 1.0
      const progress = (mg.planned_weekly_sets - mg.mav) / (mg.mrv - mg.mav);
      return 0.67 + progress * 0.33;
    } else {
      // Above MRV = 1.0+
      return 1;
    }
  };

  /**
   * Get progress bar color based on zone
   */
  const getProgressColor = (zone: string): string => {
    switch (zone) {
      case 'below_mev':
        return colors.error.main;
      case 'adequate':
        return colors.warning.main;
      case 'optimal':
        return colors.success.main;
      case 'above_mrv':
        return colors.error.main;
      default:
        return colors.primary.main;
    }
  };

  /**
   * Render muscle group volume bar
   */
  const renderMuscleGroupBar = (mg: MuscleGroupVolume) => (
    <View
      key={mg.muscle_group}
      style={styles.muscleGroupRow}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${mg.muscle_group}: ${mg.planned_weekly_sets} sets per week, ${mg.zone.replace('_', ' ')} zone`}
    >
      <View style={styles.muscleGroupHeader}>
        <View style={styles.muscleGroupInfo}>
          <Text variant="labelLarge" style={styles.muscleGroupName}>
            {mg.muscle_group.charAt(0).toUpperCase() + mg.muscle_group.slice(1)}
          </Text>
          <Text variant="bodySmall" style={styles.muscleGroupSets}>
            {mg.planned_weekly_sets} sets/week
          </Text>
        </View>
        <VolumeWarningBadge
          zone={mg.zone}
          muscleGroup={mg.muscle_group}
          warning={mg.warning}
          compact
        />
      </View>
      <ProgressBar
        progress={getProgressValue(mg)}
        color={getProgressColor(mg.zone)}
        style={styles.progressBar}
      />
      <View style={styles.landmarkLabels}>
        <Text variant="labelSmall" style={styles.landmarkLabel}>
          MEV {mg.mev}
        </Text>
        <Text variant="labelSmall" style={styles.landmarkLabel}>
          MAV {mg.mav}
        </Text>
        <Text variant="labelSmall" style={styles.landmarkLabel}>
          MRV {mg.mrv}
        </Text>
      </View>
    </View>
  );

  const warningsCount = muscleGroups.filter((mg) => mg.warning !== null).length;

  return (
    <Card style={styles.card} elevation={2}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            Weekly Volume Overview
          </Text>
          {warningsCount > 0 && (
            <Text variant="labelSmall" style={styles.warningCount}>
              {warningsCount} warning{warningsCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {muscleGroups.map(renderMuscleGroupBar)}
        </ScrollView>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  warningCount: {
    color: colors.warning.main,
    backgroundColor: colors.warning.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  scrollView: {
    maxHeight: 300,
  },
  muscleGroupRow: {
    marginBottom: spacing.lg,
  },
  muscleGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  muscleGroupInfo: {
    flex: 1,
  },
  muscleGroupName: {
    fontWeight: '600',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  muscleGroupSets: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background.tertiary,
    marginBottom: spacing.xs,
  },
  landmarkLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  landmarkLabel: {
    color: colors.text.tertiary,
    fontSize: 10,
  },
});
