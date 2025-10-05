/**
 * HeartRateZoneDisplay Component
 *
 * Displays heart rate zones for Norwegian 4x4 protocol during workout.
 * Shows work zone and recovery zone targets side-by-side.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface HeartRateZone {
  min: number;
  max: number;
}

interface HeartRateZoneDisplayProps {
  workZone: HeartRateZone;
  recoveryZone: HeartRateZone;
}

/**
 * HeartRateZoneDisplay Component
 *
 * Shows target heart rate ranges for current workout phase.
 */
export default function HeartRateZoneDisplay({
  workZone,
  recoveryZone,
}: HeartRateZoneDisplayProps) {
  return (
    <View style={styles.zoneDisplayContainer}>
      <Text variant="labelMedium" style={styles.zoneDisplayLabel}>
        TARGET HEART RATE
      </Text>
      <View style={styles.zoneDisplayRow}>
        <View style={styles.zoneDisplayItem}>
          <Text variant="labelSmall" style={styles.zoneDisplaySubLabel}>
            Work Phase
          </Text>
          <Text variant="headlineSmall" style={styles.zoneDisplayValue}>
            {workZone.min}-{workZone.max} bpm
          </Text>
        </View>
        <View style={styles.zoneDivider} />
        <View style={styles.zoneDisplayItem}>
          <Text variant="labelSmall" style={styles.zoneDisplaySubLabel}>
            Recovery Phase
          </Text>
          <Text variant="headlineSmall" style={styles.zoneDisplayValue}>
            {recoveryZone.min}-{recoveryZone.max} bpm
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zoneDisplayContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  zoneDisplayLabel: {
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  zoneDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  zoneDisplayItem: {
    flex: 1,
    alignItems: 'center',
  },
  zoneDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.effects.divider,
    marginHorizontal: spacing.md,
  },
  zoneDisplaySubLabel: {
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  zoneDisplayValue: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 18,
  },
});
