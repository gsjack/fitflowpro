/**
 * RestTimer Component (T059)
 *
 * Countdown timer with visual progress and controls.
 * Uses timerService for background support.
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Card, Text, Button, ProgressBar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as timerService from '../../services/timer/timerService';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface RestTimerProps {
  isActive: boolean;
  onComplete?: () => void;
}

export default function RestTimer({ isActive, onComplete }: RestTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState(0);
  const hasShownWarning = useRef(false);
  const hasCompletedTimer = useRef(false);

  useEffect(() => {
    if (!isActive) {
      // Timer is not active, stop it
      void timerService.stopTimer();
      setRemainingSeconds(0);
      setTargetSeconds(0);
      hasShownWarning.current = false;
      hasCompletedTimer.current = false;
      return;
    }

    // Get current timer state
    const state = timerService.getTimerState();
    if (state.isRunning) {
      setRemainingSeconds(state.remainingSeconds);
      setTargetSeconds(state.targetSeconds);
    }

    // Poll timer state every second to update display
    const intervalId = setInterval(async () => {
      const currentState = timerService.getTimerState();
      if (currentState.isRunning) {
        setRemainingSeconds(currentState.remainingSeconds);
        setTargetSeconds(currentState.targetSeconds);

        // Haptic feedback at 10 second warning (mobile only)
        if (currentState.remainingSeconds === 10 && !hasShownWarning.current) {
          hasShownWarning.current = true;
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }

        // Haptic feedback on completion (mobile only)
        if (currentState.remainingSeconds === 0 && !hasCompletedTimer.current) {
          hasCompletedTimer.current = true;
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      } else {
        // Timer completed
        setRemainingSeconds(0);
        setTargetSeconds(0);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, onComplete]);

  const handleSkip = async () => {
    // Haptic feedback on skip (mobile only)
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    await timerService.stopTimer();
    setRemainingSeconds(0);
    setTargetSeconds(0);
    onComplete?.();
  };

  const handleAdd30s = async () => {
    // Haptic feedback on timer adjustment (mobile only)
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    timerService.adjustTimer(30);
    const state = timerService.getTimerState();
    setRemainingSeconds(state.remainingSeconds);
    setTargetSeconds(state.targetSeconds);
  };

  const handleSubtract30s = async () => {
    // Haptic feedback on timer adjustment (mobile only)
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    timerService.adjustTimer(-30);
    const state = timerService.getTimerState();
    setRemainingSeconds(state.remainingSeconds);
    setTargetSeconds(state.targetSeconds);
  };

  if (!isActive) {
    return null;
  }

  const progress = targetSeconds > 0 ? (targetSeconds - remainingSeconds) / targetSeconds : 0;
  const formattedTime = timerService.formatTime(remainingSeconds);
  const isAlmostDone = remainingSeconds <= 10 && remainingSeconds > 0;

  return (
    <Card style={styles.card} elevation={5}>
      <LinearGradient
        colors={
          isAlmostDone
            ? [colors.warning.dark, colors.background.tertiary]
            : [colors.primary.dark, colors.background.tertiary]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Card.Content style={styles.content}>
          <Text variant="labelMedium" style={styles.title}>
            REST TIMER
          </Text>

          <Text
            variant="displayLarge"
            style={[styles.countdown, isAlmostDone && styles.countdownWarning]}
            accessibilityLabel={`Time remaining: ${formattedTime}`}
            accessibilityLiveRegion="polite"
          >
            {formattedTime}
          </Text>

          <View style={styles.progressContainer}>
            <ProgressBar
              progress={progress}
              color={isAlmostDone ? colors.warning.main : colors.success.main}
              style={styles.progressBar}
            />
          </View>

          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={() => void handleSubtract30s()}
              style={styles.controlButton}
              textColor={colors.text.primary}
              contentStyle={styles.controlButtonContent}
              accessibilityLabel="Reduce timer by 30 seconds"
            >
              -30s
            </Button>
            <Button
              mode="contained"
              onPress={() => void handleSkip()}
              style={styles.skipButton}
              buttonColor={colors.success.main}
              textColor="#000000"
              contentStyle={styles.skipButtonContent}
              icon="skip-next"
              accessibilityLabel="Skip rest period"
            >
              Skip
            </Button>
            <Button
              mode="outlined"
              onPress={() => void handleAdd30s()}
              style={styles.controlButton}
              textColor={colors.text.primary}
              contentStyle={styles.controlButtonContent}
              accessibilityLabel="Add 30 seconds to timer"
            >
              +30s
            </Button>
          </View>
        </Card.Content>
      </LinearGradient>
    </Card>
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
    alignItems: 'center',
  },
  title: {
    color: colors.text.secondary,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  countdown: {
    textAlign: 'center',
    marginVertical: spacing.lg,
    fontVariant: ['tabular-nums'],
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 64,
  },
  countdownWarning: {
    color: colors.warning.main,
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.background.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  controlButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderColor: colors.effects.divider,
  },
  controlButtonContent: {
    height: 48,
  },
  skipButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  skipButtonContent: {
    height: 48,
  },
});
