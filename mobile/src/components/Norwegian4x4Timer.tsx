/**
 * Norwegian4x4Timer Component (T085)
 *
 * Interval timer for Norwegian 4x4 VO2max protocol:
 * - 4 intervals of 4 minutes work (85-95% max HR) + 3 minutes recovery (60-70% max HR)
 * - Total duration: 28 minutes
 * - Visual phase indicators, heart rate tracking, pause/resume controls
 * - Background timer support (iOS silent audio workaround)
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Vibration, Platform } from 'react-native';
import {
  Card,
  Text,
  Button,
  ProgressBar,
  Portal,
  Dialog,
  Paragraph,
  TextInput,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as timerService from '../services/timer/timerService';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/typography';

interface Norwegian4x4TimerProps {
  onComplete: (data: {
    duration_minutes: number;
    intervals_completed: number;
    average_heart_rate?: number;
    peak_heart_rate?: number;
  }) => void;
  onCancel: () => void;
}

type Phase = 'work' | 'recovery';

// Protocol configuration
const WORK_DURATION = 4 * 60; // 4 minutes
const RECOVERY_DURATION = 3 * 60; // 3 minutes
const TOTAL_INTERVALS = 4;
const TOTAL_DURATION = TOTAL_INTERVALS * (WORK_DURATION + RECOVERY_DURATION); // 28 minutes

export default function Norwegian4x4Timer({ onComplete, onCancel }: Norwegian4x4TimerProps) {
  const [currentInterval, setCurrentInterval] = useState(1);
  const [currentPhase, setCurrentPhase] = useState<Phase>('work');
  const [remainingSeconds, setRemainingSeconds] = useState(WORK_DURATION);
  const [isPaused, setIsPaused] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);

  // Heart rate tracking
  const [currentHR, setCurrentHR] = useState('');
  const [peakHR, setPeakHR] = useState(0);
  const [hrReadings, setHrReadings] = useState<number[]>([]);

  // Track elapsed time for completion data
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Calculate progress
  const totalProgress = elapsedSeconds / TOTAL_DURATION;
  const phaseProgress =
    currentPhase === 'work'
      ? (WORK_DURATION - remainingSeconds) / WORK_DURATION
      : (RECOVERY_DURATION - remainingSeconds) / RECOVERY_DURATION;

  useEffect(() => {
    // Start first interval
    startPhase('work', WORK_DURATION);

    return () => {
      // Cleanup: stop timer when component unmounts
      void timerService.stopTimer();
    };
  }, []);

  const startPhase = (phase: Phase, duration: number) => {
    setCurrentPhase(phase);
    setRemainingSeconds(duration);

    void timerService.startRestTimer(
      duration,
      (remaining) => {
        setRemainingSeconds(remaining);
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      },
      () => {
        handlePhaseComplete();
      }
    );

    // Vibrate on phase transition
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 200, 100, 200]);
    }
  };

  const handlePhaseComplete = () => {
    if (currentPhase === 'work') {
      // Work phase done, start recovery
      startPhase('recovery', RECOVERY_DURATION);
    } else {
      // Recovery phase done, move to next interval or complete
      if (currentInterval < TOTAL_INTERVALS) {
        setCurrentInterval(currentInterval + 1);
        startPhase('work', WORK_DURATION);
      } else {
        // Session complete
        handleComplete();
      }
    }
  };

  const handlePauseResume = async () => {
    if (isPaused) {
      // Resume
      const duration = currentPhase === 'work' ? WORK_DURATION : RECOVERY_DURATION;
      startPhase(currentPhase, remainingSeconds);
      setIsPaused(false);
    } else {
      // Pause
      await timerService.stopTimer();
      setIsPaused(true);
    }
  };

  const handleCancel = () => {
    setCancelDialogVisible(true);
  };

  const confirmCancel = async () => {
    await timerService.stopTimer();
    setCancelDialogVisible(false);
    onCancel();
  };

  const handleComplete = async () => {
    await timerService.stopTimer();

    const avgHR =
      hrReadings.length > 0
        ? Math.round(hrReadings.reduce((a, b) => a + b, 0) / hrReadings.length)
        : undefined;

    onComplete({
      duration_minutes: Math.floor(elapsedSeconds / 60),
      intervals_completed: currentInterval,
      average_heart_rate: avgHR,
      peak_heart_rate: peakHR > 0 ? peakHR : undefined,
    });
  };

  const handleHRInput = (value: string) => {
    setCurrentHR(value);
    const hrNum = parseInt(value, 10);

    if (!isNaN(hrNum) && hrNum > 0 && hrNum < 250) {
      setHrReadings([...hrReadings, hrNum]);
      if (hrNum > peakHR) {
        setPeakHR(hrNum);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isWorkPhase = currentPhase === 'work';
  const gradientColors = (
    isWorkPhase
      ? [colors.error.dark, colors.background.tertiary]
      : [colors.success.dark, colors.background.tertiary]
  ) as [string, string, ...string[]];

  return (
    <>
      <Card style={styles.card} elevation={5}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Card.Content style={styles.content}>
            {/* Header: Interval Progress */}
            <View style={styles.header}>
              <Text variant="labelMedium" style={styles.headerLabel}>
                NORWEGIAN 4x4 PROTOCOL
              </Text>
              <Text variant="titleLarge" style={styles.intervalText}>
                Interval {currentInterval}/{TOTAL_INTERVALS}
              </Text>
            </View>

            {/* Phase Indicator */}
            <View style={styles.phaseIndicator}>
              <Text
                variant="headlineMedium"
                style={[styles.phaseText, isWorkPhase && styles.phaseTextWork]}
                accessibilityLabel={`Current phase: ${isWorkPhase ? 'Work interval' : 'Recovery interval'}`}
              >
                {isWorkPhase ? 'PUSH HARD' : 'ACTIVE RECOVERY'}
              </Text>
              <Text variant="bodySmall" style={styles.phaseSubtext}>
                {isWorkPhase ? '85-95% Max HR' : '60-70% Max HR'}
              </Text>
            </View>

            {/* Countdown Timer */}
            <Text
              variant="displayLarge"
              style={styles.countdown}
              accessibilityLabel={`Time remaining: ${formatTime(remainingSeconds)}`}
              accessibilityLiveRegion="polite"
            >
              {formatTime(remainingSeconds)}
            </Text>

            {/* Phase Progress Bar */}
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={phaseProgress}
                color={isWorkPhase ? colors.error.main : colors.success.main}
                style={styles.progressBar}
              />
            </View>

            {/* Overall Progress Bar */}
            <View style={styles.overallProgressContainer}>
              <Text variant="labelSmall" style={styles.progressLabel}>
                Overall Progress: {Math.round(totalProgress * 100)}%
              </Text>
              <ProgressBar
                progress={totalProgress}
                color={colors.primary.main}
                style={styles.overallProgressBar}
              />
            </View>

            {/* Heart Rate Input */}
            <View style={styles.hrContainer}>
              <Text variant="labelSmall" style={styles.hrLabel}>
                HEART RATE (BPM)
              </Text>
              <View style={styles.hrInputRow}>
                <TextInput
                  value={currentHR}
                  onChangeText={setCurrentHR}
                  onSubmitEditing={() => {
                    handleHRInput(currentHR);
                    setCurrentHR('');
                  }}
                  keyboardType="number-pad"
                  placeholder="Enter HR"
                  style={styles.hrInput}
                  mode="outlined"
                  dense
                  outlineColor={colors.effects.divider}
                  activeOutlineColor={colors.primary.main}
                  textColor={colors.text.primary}
                  placeholderTextColor={colors.text.tertiary}
                />
                <Button
                  mode="contained"
                  onPress={() => {
                    handleHRInput(currentHR);
                    setCurrentHR('');
                  }}
                  style={styles.hrButton}
                  buttonColor={colors.primary.main}
                  disabled={!currentHR}
                  contentStyle={styles.hrButtonContent}
                >
                  Log
                </Button>
              </View>
              {peakHR > 0 && (
                <Text variant="bodySmall" style={styles.hrStats}>
                  Peak: {peakHR} bpm | Avg:{' '}
                  {hrReadings.length > 0
                    ? Math.round(hrReadings.reduce((a, b) => a + b, 0) / hrReadings.length)
                    : '-'}{' '}
                  bpm
                </Text>
              )}
            </View>

            {/* Controls */}
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={handleCancel}
                style={styles.cancelButton}
                textColor={colors.error.main}
                contentStyle={styles.controlButtonContent}
                icon="close"
                accessibilityLabel="Cancel workout"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => void handlePauseResume()}
                style={styles.pauseButton}
                buttonColor={colors.primary.main}
                textColor={colors.text.primary}
                contentStyle={styles.controlButtonContent}
                icon={isPaused ? 'play' : 'pause'}
                accessibilityLabel={isPaused ? 'Resume workout' : 'Pause workout'}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            </View>
          </Card.Content>
        </LinearGradient>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Portal>
        <Dialog visible={cancelDialogVisible} onDismiss={() => setCancelDialogVisible(false)}>
          <Dialog.Title>Cancel Workout?</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to cancel this VO2max session? Your progress will not be saved.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelDialogVisible(false)}>Keep Going</Button>
            <Button onPress={() => void confirmCancel()} textColor={colors.error.main}>
              Cancel Workout
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  gradient: {
    width: '100%',
  },
  content: {
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLabel: {
    color: colors.text.secondary,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  intervalText: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  phaseIndicator: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.effects.overlay,
    borderRadius: borderRadius.md,
  },
  phaseText: {
    color: colors.success.main,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  phaseTextWork: {
    color: colors.error.main,
  },
  phaseSubtext: {
    color: colors.text.secondary,
  },
  countdown: {
    textAlign: 'center',
    marginVertical: spacing.lg,
    fontVariant: ['tabular-nums'],
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 64,
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.background.primary,
  },
  overallProgressContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  progressLabel: {
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  overallProgressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background.primary,
  },
  hrContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  hrLabel: {
    color: colors.text.tertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  hrInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  hrInput: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  hrButton: {
    borderRadius: borderRadius.sm,
  },
  hrButtonContent: {
    height: 40,
  },
  hrStats: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderColor: colors.error.main,
  },
  pauseButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  controlButtonContent: {
    height: 56,
  },
});
