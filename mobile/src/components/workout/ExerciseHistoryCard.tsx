/**
 * ExerciseHistoryCard Component
 *
 * Displays last performance data for an exercise to help users make
 * informed progression decisions during workouts.
 *
 * Features:
 * - Shows last workout date and all sets performed
 * - Displays estimated 1RM for reference
 * - Collapsible to save screen space
 * - Unit conversion support (kg/lbs)
 * - Loading skeleton state
 * - Empty state for first-time exercises
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';
import { useSettingsStore } from '../../stores/settingsStore';
import { fromBackendWeight, getUnitLabel } from '../../utils/unitConversion';
import type { LastPerformance } from '../../services/api/exerciseApi';

interface ExerciseHistoryCardProps {
  lastPerformance: LastPerformance | null | undefined;
  isLoading: boolean;
  expanded: boolean;
  onToggle: () => void;
}

export default function ExerciseHistoryCard({
  lastPerformance,
  isLoading,
  expanded,
  onToggle,
}: ExerciseHistoryCardProps) {
  const { weightUnit } = useSettingsStore();
  const unitLabel = getUnitLabel(weightUnit);

  // Loading skeleton
  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="history"
              size={20}
              color={colors.text.tertiary}
              style={styles.icon}
            />
            <ActivityIndicator size="small" color={colors.primary.main} />
          </View>
        </Card.Content>
      </Card>
    );
  }

  // Empty state - no history
  if (!lastPerformance) {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="history"
              size={20}
              color={colors.text.tertiary}
              style={styles.icon}
            />
            <Text variant="bodyMedium" style={styles.emptyTitle}>
              First Time
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.emptyDescription}>
            No previous performance data. Start with a conservative weight and build from there.
          </Text>
        </Card.Content>
      </Card>
    );
  }

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Show only last 3 sets to avoid clutter
  const setsToShow = lastPerformance.sets.slice(0, 3);

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        {/* Header - Always visible */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="history"
              size={20}
              color={colors.primary.main}
              style={styles.icon}
            />
            <Text variant="bodyMedium" style={styles.headerTitle}>
              Last Performance ({formatDate(lastPerformance.last_workout_date)})
            </Text>
          </View>
          <IconButton
            icon={expanded ? 'chevron-up' : 'chevron-down'}
            iconColor={colors.text.secondary}
            size={24}
            onPress={onToggle}
            style={styles.toggleButton}
            accessibilityLabel={expanded ? 'Collapse history' : 'Expand history'}
          />
        </View>

        {/* Expandable content */}
        {expanded && (
          <>
            <View style={styles.divider} />

            {/* Sets list */}
            {setsToShow.map((set, index) => {
              const weightDisplay = fromBackendWeight(set.weight_kg, weightUnit);
              return (
                <View key={index} style={styles.setRow}>
                  <Text variant="bodyMedium" style={styles.setLabel}>
                    Set {index + 1}:
                  </Text>
                  <Text variant="bodyMedium" style={styles.setValue}>
                    {weightDisplay.toFixed(1)}
                    {unitLabel} × {set.reps} @ RIR {set.rir}
                  </Text>
                </View>
              );
            })}

            {/* Show indicator if there are more sets */}
            {lastPerformance.sets.length > 3 && (
              <Text variant="bodySmall" style={styles.moreIndicator}>
                +{lastPerformance.sets.length - 3} more set{lastPerformance.sets.length - 3 > 1 ? 's' : ''}
              </Text>
            )}

            <View style={styles.divider} />

            {/* Estimated 1RM */}
            <View style={styles.oneRmRow}>
              <Text variant="bodyMedium" style={styles.oneRmLabel}>
                Est. 1RM:
              </Text>
              <Text variant="bodyLarge" style={styles.oneRmValue}>
                {fromBackendWeight(lastPerformance.estimated_1rm, weightUnit).toFixed(1)}
                {unitLabel}
              </Text>
            </View>
          </>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    elevation: 2,
  },
  cardContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: spacing.xs,
  },
  headerTitle: {
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  toggleButton: {
    margin: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.effects.divider,
    marginVertical: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  setLabel: {
    color: colors.text.secondary,
    fontWeight: '500',
  },
  setValue: {
    color: colors.text.primary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  moreIndicator: {
    color: colors.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  oneRmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  oneRmLabel: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  oneRmValue: {
    color: colors.primary.main,
    fontWeight: '700',
    fontSize: 18,
  },
  emptyTitle: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  emptyDescription: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
