/**
 * Volume Warning Badge Component (T079)
 *
 * Visual badge showing volume zone status with color coding.
 * Features:
 * - Color-coded zones (below_mev, adequate, optimal, above_mrv, on_track)
 * - Icon for each zone
 * - Compact and expanded modes
 * - Press to show detailed warning in dialog
 * - Accessible labels
 *
 * Volume Zones:
 * - below_mev: Red/warning (insufficient volume for growth)
 * - adequate: Yellow/caution (MEV ≤ volume < MAV)
 * - optimal: Green/success (MAV ≤ volume ≤ MRV)
 * - above_mrv: Red/error (risk of overtraining)
 * - on_track: Blue/info (no specific warning)
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Chip, Dialog, Portal, Paragraph, Button, useTheme, Icon } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';

interface VolumeWarningBadgeProps {
  zone: 'below_mev' | 'adequate' | 'optimal' | 'above_mrv' | 'on_track';
  muscleGroup?: string;
  warning?: string | null;
  onPress?: () => void;
  compact?: boolean; // If true, show only icon; if false, show icon + text
}

/**
 * Volume Warning Badge Component
 *
 * @param zone - Volume zone (below_mev, adequate, optimal, above_mrv, on_track)
 * @param muscleGroup - Optional muscle group name for context
 * @param warning - Optional warning message (shown in dialog on press)
 * @param onPress - Optional custom onPress handler (overrides default dialog)
 * @param compact - If true, show only icon; if false, show icon + text (default: false)
 */
export default function VolumeWarningBadge({
  zone,
  muscleGroup,
  warning,
  onPress,
  compact = false,
}: VolumeWarningBadgeProps) {
  const theme = useTheme();
  const [dialogVisible, setDialogVisible] = useState(false);

  /**
   * Get zone configuration (color, icon, label)
   */
  const getZoneConfig = () => {
    switch (zone) {
      case 'below_mev':
        return {
          color: colors.error.main,
          backgroundColor: colors.error.bg,
          icon: 'alert-circle',
          label: 'Below MEV',
          description: 'Volume below minimum effective volume (MEV). Increase sets for growth.',
        };
      case 'adequate':
        return {
          color: colors.warning.main,
          backgroundColor: colors.warning.bg,
          icon: 'alert',
          label: 'Adequate',
          description: 'Volume is adequate (MEV to MAV). Consider increasing for optimal results.',
        };
      case 'optimal':
        return {
          color: colors.success.main,
          backgroundColor: colors.success.bg,
          icon: 'check-circle',
          label: 'Optimal',
          description: 'Volume is optimal (MAV to MRV). Perfect for hypertrophy.',
        };
      case 'above_mrv':
        return {
          color: colors.error.main,
          backgroundColor: colors.error.bg,
          icon: 'alert-octagon',
          label: 'Above MRV',
          description:
            'Volume above maximum recoverable volume (MRV). Risk of overtraining. Reduce sets.',
        };
      case 'on_track':
      default:
        return {
          color: colors.primary.main,
          backgroundColor: colors.primary.main + '20', // 20% opacity
          icon: 'information',
          label: 'On Track',
          description: 'Volume is on track. No adjustments needed.',
        };
    }
  };

  const config = getZoneConfig();

  /**
   * Handle badge press
   */
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (warning) {
      setDialogVisible(true);
    }
  };

  /**
   * Close dialog
   */
  const handleCloseDialog = () => {
    setDialogVisible(false);
  };

  /**
   * Render compact mode (icon only)
   */
  if (compact) {
    return (
      <>
        <TouchableOpacity
          onPress={handlePress}
          style={[styles.compactBadge, { backgroundColor: config.backgroundColor }]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${config.label} volume zone`}
          accessibilityHint={warning ? 'Press to view details' : undefined}
          disabled={!warning && !onPress}
        >
          <Icon source={config.icon} size={20} color={config.color} />
        </TouchableOpacity>

        {/* Warning Dialog */}
        {warning && (
          <Portal>
            <Dialog visible={dialogVisible} onDismiss={handleCloseDialog}>
              <Dialog.Title>Volume Warning</Dialog.Title>
              <Dialog.Content>
                {muscleGroup && (
                  <Paragraph style={styles.muscleGroupText}>
                    Muscle Group: <Paragraph style={styles.boldText}>{muscleGroup}</Paragraph>
                  </Paragraph>
                )}
                <Paragraph style={styles.descriptionText}>{config.description}</Paragraph>
                <Paragraph style={styles.warningText}>{warning}</Paragraph>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={handleCloseDialog}>Close</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        )}
      </>
    );
  }

  /**
   * Render expanded mode (icon + text)
   */
  return (
    <>
      <Chip
        icon={config.icon}
        onPress={warning || onPress ? handlePress : undefined}
        mode="flat"
        style={[styles.expandedBadge, { backgroundColor: config.backgroundColor }]}
        textStyle={[styles.expandedText, { color: config.color }]}
        selectedColor={config.color}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${config.label} volume zone${muscleGroup ? ` for ${muscleGroup}` : ''}`}
        accessibilityHint={warning ? 'Press to view details' : undefined}
      >
        {config.label}
      </Chip>

      {/* Warning Dialog */}
      {warning && (
        <Portal>
          <Dialog
            visible={dialogVisible}
            onDismiss={handleCloseDialog}
            accessible={true}
            accessibilityLabel="Volume warning details"
          >
            <Dialog.Title>Volume Warning</Dialog.Title>
            <Dialog.Content>
              {muscleGroup && (
                <Paragraph style={styles.muscleGroupText}>
                  Muscle Group: <Paragraph style={styles.boldText}>{muscleGroup}</Paragraph>
                </Paragraph>
              )}
              <Paragraph style={styles.descriptionText}>{config.description}</Paragraph>
              <Paragraph style={styles.warningText}>{warning}</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={handleCloseDialog}>Close</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  compactBadge: {
    width: 48, // FIX P0-8: Increased from 32px to meet WCAG 2.5.5 minimum 44×44px (48px recommended)
    height: 48, // FIX P0-8: Increased from 32px to meet WCAG 2.5.5 minimum 44×44px (48px recommended)
    borderRadius: 24, // Adjusted to maintain circular shape
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedBadge: {
    alignSelf: 'flex-start',
  },
  expandedText: {
    fontWeight: '600',
    fontSize: 12,
  },
  muscleGroupText: {
    marginBottom: spacing.sm,
    color: colors.text.secondary,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  descriptionText: {
    marginBottom: spacing.md,
    color: colors.text.secondary,
  },
  warningText: {
    fontWeight: '500',
    color: colors.text.primary,
  },
});
