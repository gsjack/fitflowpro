/**
 * Muscle Group Volume Bar Component (T081)
 *
 * Horizontal progress bar showing completed vs planned sets for a muscle group.
 * Visual markers for MEV, MAV, MRV thresholds with color-coded zones.
 *
 * Features:
 * - Color-coded based on volume zone (below_mev, adequate, optimal, above_mrv, on_track)
 * - Visual threshold markers for MEV/MAV/MRV
 * - Expandable to show detailed landmark numbers
 * - Accessible with VoiceOver/TalkBack support
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Surface, Text, ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export type VolumeZone = 'below_mev' | 'adequate' | 'optimal' | 'above_mrv' | 'on_track';

export interface MuscleGroupVolumeBarProps {
  muscleGroup: string; // e.g., 'chest', 'back_lats', etc.
  completedSets: number;
  plannedSets: number;
  mev: number; // Minimum Effective Volume
  mav: number; // Maximum Adaptive Volume
  mrv: number; // Maximum Recoverable Volume
  zone: VolumeZone;
}

/**
 * Format muscle group name for display
 * Converts snake_case to Title Case
 */
function formatMuscleGroupName(muscleGroup: string): string {
  return muscleGroup
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get color based on volume zone
 */
function getZoneColor(zone: VolumeZone): string {
  switch (zone) {
    case 'below_mev':
      return colors.error.main; // Red
    case 'adequate':
      return colors.warning.main; // Yellow
    case 'optimal':
      return colors.success.main; // Green
    case 'above_mrv':
      return colors.error.main; // Red
    case 'on_track':
      return colors.primary.main; // Blue
    default:
      return colors.text.disabled;
  }
}

/**
 * Get zone status text for accessibility
 */
function getZoneStatusText(zone: VolumeZone): string {
  switch (zone) {
    case 'below_mev':
      return 'Below minimum effective volume - increase training';
    case 'adequate':
      return 'Adequate volume - within effective range';
    case 'optimal':
      return 'Optimal volume - ideal training range';
    case 'above_mrv':
      return 'Above maximum recoverable volume - reduce to prevent overtraining';
    case 'on_track':
      return 'On track to reach planned volume';
    default:
      return 'Unknown zone';
  }
}

export function MuscleGroupVolumeBar({
  muscleGroup,
  completedSets,
  plannedSets,
  mev,
  mav,
  mrv,
  zone,
}: MuscleGroupVolumeBarProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  // Calculate progress (capped at 1.0 for progress bar, but show actual value)
  const progress = useMemo(() => {
    if (plannedSets === 0) return 0;
    return Math.min(completedSets / plannedSets, 1.0);
  }, [completedSets, plannedSets]);

  // Calculate threshold marker positions (as percentage of MRV)
  const mevPosition = (mev / mrv) * 100;
  const mavPosition = (mav / mrv) * 100;
  const mrvPosition = 100;

  const zoneColor = getZoneColor(zone);
  const formattedName = formatMuscleGroupName(muscleGroup);
  const statusText = getZoneStatusText(zone);

  // Determine if over MRV for visual extension
  const isOverMRV = completedSets > mrv;
  const completionPercentage = Math.round((completedSets / plannedSets) * 100);

  return (
    <Surface style={styles.container} elevation={1}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={`${formattedName} volume: ${completedSets} of ${plannedSets} sets completed. ${statusText}. Tap to ${expanded ? 'collapse' : 'expand'} details.`}
        accessibilityHint="Double tap to toggle volume landmark details"
      >
        {/* Compact Header Row */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.zoneIndicator, { backgroundColor: zoneColor }]} />
            <Text variant="bodyLarge" style={styles.muscleGroupName}>
              {formattedName}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text variant="headlineSmall" style={styles.setsText}>
              {completedSets}<Text style={styles.setsDivider}>/</Text>{plannedSets}
            </Text>
            <Text variant="bodySmall" style={styles.completionPercentage}>
              {completionPercentage}%
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.text.tertiary}
            />
          </View>
        </View>

        {/* Simple Progress Bar (no markers by default) */}
        <ProgressBar progress={progress} color={zoneColor} style={styles.progressBar} />

        {/* Expanded Details with Threshold Info */}
        {expanded && (
          <View style={styles.thresholdInfo}>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdMiniLabel}>MEV: {mev}</Text>
              <Text style={styles.thresholdMiniLabel}>MAV: {mav}</Text>
              <Text style={styles.thresholdMiniLabel}>MRV: {mrv}</Text>
            </View>

            <View style={styles.statusRow}>
              <MaterialCommunityIcons
                name="information-outline"
                size={14}
                color={colors.text.secondary}
              />
              <Text variant="bodySmall" style={styles.statusText}>
                {statusText}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  zoneIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  muscleGroupName: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setsText: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  setsDivider: {
    color: colors.text.tertiary,
    fontWeight: '400',
  },
  completionPercentage: {
    color: colors.text.secondary,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.background.tertiary,
  },
  thresholdInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.effects.divider,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  thresholdMiniLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 6,
  },
  statusText: {
    color: colors.text.secondary,
    flex: 1,
    fontSize: 11,
  },
});
