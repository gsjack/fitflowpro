/**
 * DashboardHeader Component
 *
 * Displays date, quote of the day, and recovery status/assessment.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import RecoveryAssessmentForm from './RecoveryAssessmentForm';
import { getRecoveryMessage } from '../../stores/recoveryStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';
import type { RecoveryAssessment } from '../../database/db';

interface DashboardHeaderProps {
  date: string;
  quote: string;
  todayAssessment: RecoveryAssessment | null;
  volumeAdjustment: string | null;
  onSubmitRecoveryAssessment: (
    sleepQuality: number,
    muscleSoreness: number,
    mentalMotivation: number
  ) => void;
  isSubmitting: boolean;
}

export default function DashboardHeader({
  date,
  quote,
  todayAssessment,
  volumeAdjustment,
  onSubmitRecoveryAssessment,
  isSubmitting,
}: DashboardHeaderProps) {
  return (
    <View style={styles.heroSection}>
      <Text variant="headlineLarge" style={styles.dateText}>
        {date}
      </Text>

      {/* Quote of the Day */}
      <View style={styles.quoteContainer}>
        <Text variant="bodyMedium" style={styles.quoteText}>
          "{quote}"
        </Text>
      </View>

      {/* Recovery Assessment */}
      {todayAssessment ? (
        <View style={styles.recoveryPrompt}>
          <Text variant="bodySmall" style={styles.promptTitle}>
            Recovery Check ✓
          </Text>
          <View style={styles.recoveryLoggedState}>
            <Text variant="bodyMedium" style={styles.recoveryScoreText}>
              {todayAssessment.total_score}/15
            </Text>
            <Text variant="bodySmall" style={styles.recoveryMessageText}>
              {getRecoveryMessage(volumeAdjustment || 'none')}
            </Text>
          </View>
        </View>
      ) : (
        <RecoveryAssessmentForm onSubmit={onSubmitRecoveryAssessment} isSubmitting={isSubmitting} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  dateText: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  quoteContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main + '10',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.main,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  quoteText: {
    color: colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  recoveryPrompt: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
  },
  promptTitle: {
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  recoveryLoggedState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recoveryScoreText: {
    color: colors.primary.main,
    fontWeight: '700',
    fontSize: 20,
  },
  recoveryMessageText: {
    color: colors.text.secondary,
    flex: 1,
  },
});
