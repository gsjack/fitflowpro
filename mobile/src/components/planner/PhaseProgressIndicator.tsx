/**
 * Phase Progress Indicator Component (T080)
 *
 * Visual timeline showing mesocycle phase progression with advance functionality.
 * Features:
 * - Timeline: MEV (weeks 1-2) → MAV (3-5) → MRV (6-7) → Deload (8)
 * - Highlight current phase
 * - Show current week within phase
 * - Progress bar for current phase completion
 * - "Advance Phase" button (enabled when ready)
 * - Confirmation dialog before advancing (React Native Paper Dialog)
 * - Display volume multiplier in confirmation
 * - Loading state during API call
 *
 * Phase transitions:
 * - MEV → MAV: +20% volume (1.2x multiplier)
 * - MAV → MRV: +15% volume (1.15x multiplier)
 * - MRV → Deload: -50% volume (0.5x multiplier)
 * - Deload → MEV: Reset to baseline (2.0x multiplier)
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Card,
  Text,
  Button,
  ProgressBar,
  Dialog,
  Portal,
  Paragraph,
  ActivityIndicator,
  useTheme,
  Chip,
} from 'react-native-paper';
import { advancePhase } from '../../services/api/programApi';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface PhaseProgressIndicatorProps {
  currentPhase: 'mev' | 'mav' | 'mrv' | 'deload';
  currentWeek: number;
  programId: number;
  onAdvancePhase?: (newPhase: string, volumeMultiplier: number) => void;
}

/**
 * Phase Progress Indicator Component
 *
 * @param currentPhase - Current mesocycle phase
 * @param currentWeek - Current week in mesocycle
 * @param programId - Program ID for advancing phase
 * @param onAdvancePhase - Callback after successful phase advance
 */
export default function PhaseProgressIndicator({
  currentPhase,
  currentWeek,
  programId,
  onAdvancePhase,
}: PhaseProgressIndicatorProps) {
  const theme = useTheme();

  // Advance state
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

  /**
   * Phase configuration
   */
  const phaseConfigs = {
    mev: {
      label: 'MEV',
      fullName: 'Minimum Effective Volume',
      weeks: [1, 2],
      color: colors.primary.main,
      nextPhase: 'mav' as const,
      volumeMultiplier: 1.2,
      volumeDescription: '+20% volume',
    },
    mav: {
      label: 'MAV',
      fullName: 'Maximum Adaptive Volume',
      weeks: [3, 4, 5],
      color: colors.success.main,
      nextPhase: 'mrv' as const,
      volumeMultiplier: 1.15,
      volumeDescription: '+15% volume',
    },
    mrv: {
      label: 'MRV',
      fullName: 'Maximum Recoverable Volume',
      weeks: [6, 7],
      color: colors.warning.main,
      nextPhase: 'deload' as const,
      volumeMultiplier: 0.5,
      volumeDescription: '-50% volume',
    },
    deload: {
      label: 'Deload',
      fullName: 'Recovery Week',
      weeks: [8],
      color: colors.text.secondary,
      nextPhase: 'mev' as const,
      volumeMultiplier: 2.0,
      volumeDescription: 'Reset to baseline',
    },
  };

  const currentConfig = phaseConfigs[currentPhase];
  const nextConfig = phaseConfigs[currentConfig.nextPhase];

  // Calculate progress within current phase
  const phaseWeeks = currentConfig.weeks;
  const weekInPhase = phaseWeeks.indexOf(currentWeek) + 1;
  const phaseProgress = weekInPhase / phaseWeeks.length;

  // Determine if ready to advance (at max week for phase)
  const isReadyToAdvance = currentWeek === phaseWeeks[phaseWeeks.length - 1];

  /**
   * Show confirmation dialog
   */
  const handleAdvancePress = () => {
    setConfirmDialogVisible(true);
  };

  /**
   * Execute phase advancement
   */
  const handleConfirmAdvance = async () => {
    setIsAdvancing(true);
    setError(null);

    try {
      const result = await advancePhase(programId);

      console.log(
        `[PhaseProgressIndicator] Advanced ${result.previous_phase} → ${result.new_phase} (${result.volume_multiplier}x volume)`
      );

      setConfirmDialogVisible(false);

      // Notify parent
      if (onAdvancePhase) {
        onAdvancePhase(result.new_phase, result.volume_multiplier);
      }
    } catch (err) {
      console.error('[PhaseProgressIndicator] Advance failed:', err);

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to advance phase. Please try again.';

      setError(errorMessage);
    } finally {
      setIsAdvancing(false);
    }
  };

  /**
   * Cancel confirmation dialog
   */
  const handleCancelAdvance = () => {
    setConfirmDialogVisible(false);
    setError(null);
  };

  /**
   * Render phase dot in timeline
   */
  const renderPhaseDot = (phase: keyof typeof phaseConfigs, index: number) => {
    const config = phaseConfigs[phase];
    const isActive = phase === currentPhase;
    const isPast = index < Object.keys(phaseConfigs).indexOf(currentPhase);

    return (
      <View key={phase} style={styles.phaseContainer}>
        {/* Connecting line (before dot) */}
        {index > 0 && (
          <View
            style={[
              styles.phaseLine,
              {
                backgroundColor: isPast ? config.color : colors.effects.divider,
              },
            ]}
          />
        )}

        {/* Phase dot */}
        <View
          style={[
            styles.phaseDot,
            {
              backgroundColor: isActive
                ? config.color
                : isPast
                  ? config.color
                  : colors.background.tertiary,
              borderColor: isActive ? config.color : colors.effects.divider,
              borderWidth: isActive ? 3 : 1,
            },
          ]}
          accessibilityRole="text"
          accessibilityLabel={`${config.label} phase, weeks ${config.weeks.join(' and ')}`}
        />

        {/* Phase label */}
        <Text
          variant="labelSmall"
          style={[
            styles.phaseLabel,
            {
              color: isActive
                ? config.color
                : isPast
                  ? colors.text.secondary
                  : colors.text.tertiary,
              fontWeight: isActive ? 'bold' : 'normal',
            },
          ]}
        >
          {config.label}
        </Text>
        <Text variant="labelSmall" style={styles.phaseWeeks}>
          W{config.weeks.join('-')}
        </Text>
      </View>
    );
  };

  return (
    <Card style={styles.card} elevation={3}>
      <Card.Content>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="titleLarge" style={styles.title}>
              {currentConfig.fullName}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Week {currentWeek} of Mesocycle
            </Text>
          </View>
          <Chip
            mode="flat"
            style={[styles.phaseChip, { backgroundColor: currentConfig.color + '20' }]}
            textStyle={{ color: currentConfig.color, fontWeight: 'bold' }}
          >
            {currentConfig.label}
          </Chip>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {(['mev', 'mav', 'mrv', 'deload'] as const).map((phase, index) =>
            renderPhaseDot(phase, index)
          )}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text variant="labelSmall" style={styles.progressLabel}>
              Phase Progress
            </Text>
            <Text variant="labelSmall" style={styles.progressPercentage}>
              {Math.round(phaseProgress * 100)}%
            </Text>
          </View>
          <ProgressBar
            progress={phaseProgress}
            color={currentConfig.color}
            style={styles.progressBar}
          />
          <Text variant="bodySmall" style={styles.progressText}>
            Week {weekInPhase} of {phaseWeeks.length}
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error.bg }]}>
            <Text variant="bodySmall" style={{ color: colors.error.main }}>
              {error}
            </Text>
          </View>
        )}

        {/* Advance Button */}
        <Button
          mode="contained"
          onPress={handleAdvancePress}
          disabled={!isReadyToAdvance || isAdvancing}
          style={styles.advanceButton}
          contentStyle={styles.advanceButtonContent}
          icon={isAdvancing ? undefined : 'arrow-right-circle'}
          accessibilityLabel={`Advance to ${nextConfig.label} phase`}
          accessibilityHint={
            isReadyToAdvance
              ? `Will increase volume by ${currentConfig.volumeDescription}`
              : `Available at week ${phaseWeeks[phaseWeeks.length - 1]}`
          }
        >
          {isAdvancing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isReadyToAdvance ? (
            `Advance to ${nextConfig.label}`
          ) : (
            `Complete Week ${phaseWeeks[phaseWeeks.length - 1]} to Advance`
          )}
        </Button>

        {isReadyToAdvance && (
          <Text variant="bodySmall" style={styles.advanceHint}>
            Next: {nextConfig.fullName} ({currentConfig.volumeDescription})
          </Text>
        )}
      </Card.Content>

      {/* Confirmation Dialog (React Native Paper, NOT Alert.alert) */}
      <Portal>
        <Dialog
          visible={confirmDialogVisible}
          onDismiss={handleCancelAdvance}
        >
          <Dialog.Title>Advance to {nextConfig.label} Phase?</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              You are about to advance from{' '}
              <Paragraph style={styles.boldText}>{currentConfig.label}</Paragraph> to{' '}
              <Paragraph style={styles.boldText}>{nextConfig.label}</Paragraph>.
            </Paragraph>
            <Paragraph style={styles.dialogVolumeText}>
              Volume Adjustment:{' '}
              <Paragraph style={styles.boldText}>{currentConfig.volumeDescription}</Paragraph>
            </Paragraph>
            <Paragraph style={styles.dialogDescription}>
              This will update target sets for all exercises in your program.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelAdvance} disabled={isAdvancing}>
              Cancel
            </Button>
            <Button
              onPress={() => void handleConfirmAdvance()}
              disabled={isAdvancing}
              mode="contained"
              loading={isAdvancing}
            >
              {isAdvancing ? 'Advancing...' : 'Advance Phase'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary,
  },
  phaseChip: {
    height: 32,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  phaseContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  phaseLine: {
    position: 'absolute',
    top: 12,
    left: -50,
    right: '50%',
    height: 2,
  },
  phaseDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: spacing.xs,
    zIndex: 1,
  },
  phaseLabel: {
    textAlign: 'center',
    marginBottom: 2,
  },
  phaseWeeks: {
    color: colors.text.tertiary,
    fontSize: 10,
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    color: colors.text.secondary,
    letterSpacing: 1.2,
  },
  progressPercentage: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background.tertiary,
    marginBottom: spacing.xs,
  },
  progressText: {
    color: colors.text.tertiary,
  },
  errorContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  advanceButton: {
    marginTop: spacing.md,
  },
  advanceButtonContent: {
    height: 48,
  },
  advanceHint: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  boldText: {
    fontWeight: 'bold',
  },
  dialogVolumeText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
  },
  dialogDescription: {
    marginTop: spacing.md,
    color: colors.text.tertiary,
    fontSize: 12,
  },
});
