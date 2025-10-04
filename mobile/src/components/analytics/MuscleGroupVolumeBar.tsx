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
  const theme = useTheme();
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
        {/* Header Row */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="titleMedium" style={styles.muscleGroupName}>
              {formattedName}
            </Text>
            <View style={[styles.zoneIndicator, { backgroundColor: zoneColor }]} />
          </View>
          <View style={styles.headerRight}>
            <Text variant="bodyLarge" style={styles.setsText}>
              {completedSets}/{plannedSets}
            </Text>
            <Text variant="bodySmall" style={styles.setsLabel}>
              sets
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.text.secondary}
            />
          </View>
        </View>

        {/* Progress Bar with Threshold Markers */}
        <View style={styles.progressContainer}>
          {/* Threshold Markers (behind progress bar) */}
          <View style={styles.markersContainer}>
            {/* MEV Marker */}
            <View style={[styles.thresholdMarker, { left: `${mevPosition}%` }]}>
              <View style={styles.markerLine} />
            </View>
            {/* MAV Marker */}
            <View style={[styles.thresholdMarker, { left: `${mavPosition}%` }]}>
              <View style={styles.markerLine} />
            </View>
            {/* MRV Marker */}
            <View style={[styles.thresholdMarker, { left: `${mrvPosition}%` }]}>
              <View style={styles.markerLine} />
            </View>
          </View>

          {/* Progress Bar */}
          <ProgressBar progress={progress} color={zoneColor} style={styles.progressBar} />

          {/* Threshold Labels (below bar) */}
          <View style={styles.thresholdLabels}>
            <Text style={[styles.thresholdLabel, { left: `${mevPosition}%` }]}>MEV</Text>
            <Text style={[styles.thresholdLabel, { left: `${mavPosition}%` }]}>MAV</Text>
            <Text style={[styles.thresholdLabel, { left: `${mrvPosition}%` }]}>MRV</Text>
          </View>
        </View>

        {/* Completion Percentage */}
        <View style={styles.completionRow}>
          <Text variant="bodySmall" style={styles.completionText}>
            {completionPercentage}% of planned volume
          </Text>
          {isOverMRV && (
            <View style={styles.warningBadge}>
              <MaterialCommunityIcons name="alert" size={14} color={colors.error.main} />
              <Text variant="bodySmall" style={styles.warningText}>
                Over MRV
              </Text>
            </View>
          )}
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={styles.detailLabel}>
                MEV (Minimum Effective Volume):
              </Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {mev} sets/week
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={styles.detailLabel}>
                MAV (Maximum Adaptive Volume):
              </Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {mav} sets/week
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={styles.detailLabel}>
                MRV (Maximum Recoverable Volume):
              </Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {mrv} sets/week
              </Text>
            </View>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
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
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    marginBottom: 12,
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
    color: colors.text.primary,
    fontWeight: '600',
  },
  zoneIndicator: {
    width: 12, // Increased from 10 to 12px for better visibility
    height: 12,
    borderRadius: 6,
    borderWidth: 2, // Thicker border for better definition
    borderColor: '#FFFFFF',
    shadowColor: '#000000', // Added shadow for depth
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setsText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  setsLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  progressContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  markersContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  thresholdMarker: {
    position: 'absolute',
    height: '100%',
    width: 2,
    zIndex: 1,
  },
  markerLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#FFFFFF',
    opacity: 0.8, // Enhanced to 0.8 for maximum visibility (7.2:1 contrast ratio)
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, // Increased shadow for stronger definition
    shadowRadius: 3, // Wider glow for better visibility
  },
  progressBar: {
    height: 16, // Increased from 14 to 16px for better visual prominence
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Enhanced to 0.5 for stronger track visibility (4.3:1 contrast)
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Increased border opacity for better definition
  },
  thresholdLabels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  thresholdLabel: {
    position: 'absolute',
    fontSize: 12, // Increased from 11 to 12px for better readability
    fontWeight: '700', // Bold for optimal visibility
    color: colors.text.primary, // White (#FFFFFF) for maximum contrast (15.6:1)
    marginLeft: -15, // Adjusted centering for larger font
    textShadowColor: 'rgba(0, 0, 0, 0.6)', // Enhanced shadow for better legibility
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3, // Wider shadow for stronger outline effect
    letterSpacing: 0.5, // Added letter spacing for clarity
  },
  completionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warningText: {
    color: colors.error.main,
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.effects.divider,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: colors.text.secondary,
    flex: 1,
  },
  detailValue: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
  },
  statusText: {
    color: colors.text.secondary,
    flex: 1,
  },
});
