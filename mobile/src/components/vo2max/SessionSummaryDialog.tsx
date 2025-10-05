/**
 * SessionSummaryDialog Component
 *
 * Displays workout completion summary with metrics (duration, intervals, HR, VO2max).
 * Shows after completing a VO2max session.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Dialog, Button, Text } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface SessionData {
  duration_minutes: number;
  intervals_completed: number;
  average_heart_rate?: number;
  peak_heart_rate?: number;
  estimated_vo2max?: number;
  completion_status?: 'complete' | 'incomplete';
  session_id?: number;
}

interface SessionSummaryDialogProps {
  visible: boolean;
  onDismiss: () => void;
  sessionData: SessionData | null;
  onViewDetails?: () => void;
}

/**
 * SessionSummaryDialog Component
 *
 * Celebration dialog showing workout completion metrics.
 */
export default function SessionSummaryDialog({
  visible,
  onDismiss,
  sessionData,
  onViewDetails,
}: SessionSummaryDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.summaryDialog}>
        <Dialog.Title style={styles.summaryTitle}>Workout Complete! 🎉</Dialog.Title>
        <Dialog.Content>
          {sessionData && (
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text variant="labelMedium" style={styles.summaryLabel}>
                  Duration
                </Text>
                <Text variant="titleLarge" style={styles.summaryValue}>
                  {sessionData.duration_minutes} min
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text variant="labelMedium" style={styles.summaryLabel}>
                  Intervals Completed
                </Text>
                <Text variant="titleLarge" style={styles.summaryValue}>
                  {sessionData.intervals_completed}/4
                </Text>
              </View>

              {sessionData.average_heart_rate && (
                <View style={styles.summaryRow}>
                  <Text variant="labelMedium" style={styles.summaryLabel}>
                    Average HR
                  </Text>
                  <Text variant="titleLarge" style={styles.summaryValue}>
                    {sessionData.average_heart_rate} bpm
                  </Text>
                </View>
              )}

              {sessionData.peak_heart_rate && (
                <View style={styles.summaryRow}>
                  <Text variant="labelMedium" style={styles.summaryLabel}>
                    Peak HR
                  </Text>
                  <Text variant="titleLarge" style={styles.summaryValue}>
                    {sessionData.peak_heart_rate} bpm
                  </Text>
                </View>
              )}

              {sessionData.estimated_vo2max && (
                <View style={[styles.summaryRow, styles.vo2maxRow]}>
                  <Text variant="labelMedium" style={styles.summaryLabel}>
                    Estimated VO2max
                  </Text>
                  <Text variant="displaySmall" style={styles.vo2maxValue}>
                    {sessionData.estimated_vo2max.toFixed(1)}
                  </Text>
                  <Text variant="bodySmall" style={styles.vo2maxUnit}>
                    ml/kg/min
                  </Text>
                </View>
              )}

              {sessionData.completion_status === 'incomplete' && (
                <View style={styles.incompleteWarning}>
                  <Text variant="bodySmall" style={styles.incompleteText}>
                    Session marked as incomplete (less than 4 intervals)
                  </Text>
                </View>
              )}
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions style={styles.summaryActions}>
          <Button onPress={onDismiss} mode="outlined" style={styles.summaryButton}>
            Done
          </Button>
          {sessionData?.session_id && onViewDetails && (
            <Button
              onPress={onViewDetails}
              mode="contained"
              buttonColor={colors.primary.main}
              style={styles.summaryButton}
            >
              View Details
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  summaryDialog: {
    backgroundColor: colors.background.secondary,
  },
  summaryTitle: {
    textAlign: 'center',
    fontSize: 24,
    color: colors.text.primary,
  },
  summaryContent: {
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.effects.divider,
  },
  summaryLabel: {
    color: colors.text.secondary,
  },
  summaryValue: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  vo2maxRow: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary.dark + '20',
    borderRadius: borderRadius.md,
    borderBottomWidth: 0,
    marginTop: spacing.md,
  },
  vo2maxValue: {
    color: colors.primary.main,
    fontWeight: '700',
    fontSize: 48,
  },
  vo2maxUnit: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  incompleteWarning: {
    backgroundColor: colors.warning.main + '20',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning.main,
  },
  incompleteText: {
    color: colors.warning.dark,
    textAlign: 'center',
  },
  summaryActions: {
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
  },
  summaryButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});
