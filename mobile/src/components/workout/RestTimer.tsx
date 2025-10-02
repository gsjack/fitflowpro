/**
 * RestTimer Component (T059)
 *
 * Countdown timer with visual progress and controls.
 * Uses timerService for background support.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, ProgressBar } from 'react-native-paper';
import * as timerService from '../../services/timer/timerService';

interface RestTimerProps {
  isActive: boolean;
  onComplete?: () => void;
}

export default function RestTimer({ isActive, onComplete }: RestTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState(0);

  useEffect(() => {
    if (!isActive) {
      // Timer is not active, stop it
      void timerService.stopTimer();
      setRemainingSeconds(0);
      setTargetSeconds(0);
      return;
    }

    // Get current timer state
    const state = timerService.getTimerState();
    if (state.isRunning) {
      setRemainingSeconds(state.remainingSeconds);
      setTargetSeconds(state.targetSeconds);
    }

    // Poll timer state every second to update display
    const intervalId = setInterval(() => {
      const currentState = timerService.getTimerState();
      if (currentState.isRunning) {
        setRemainingSeconds(currentState.remainingSeconds);
        setTargetSeconds(currentState.targetSeconds);
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
    await timerService.stopTimer();
    setRemainingSeconds(0);
    setTargetSeconds(0);
    onComplete?.();
  };

  const handleAdd30s = () => {
    timerService.adjustTimer(30);
    const state = timerService.getTimerState();
    setRemainingSeconds(state.remainingSeconds);
    setTargetSeconds(state.targetSeconds);
  };

  const handleSubtract30s = () => {
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

  return (
    <Card style={styles.card} accessibilityRole="timer">
      <Card.Content>
        <Text variant="titleMedium" style={styles.title} accessibilityRole="header">
          Rest Timer
        </Text>

        <Text
          variant="displayMedium"
          style={styles.countdown}
          accessibilityLabel={`Time remaining: ${formattedTime}`}
          accessibilityLiveRegion="polite"
        >
          {formattedTime}
        </Text>

        <ProgressBar
          progress={progress}
          style={styles.progressBar}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        />

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleSubtract30s}
            style={styles.button}
            accessibilityLabel="Reduce timer by 30 seconds"
            accessibilityRole="button"
          >
            -30s
          </Button>
          <Button
            mode="outlined"
            onPress={handleAdd30s}
            style={styles.button}
            accessibilityLabel="Add 30 seconds to timer"
            accessibilityRole="button"
          >
            +30s
          </Button>
          <Button
            mode="contained"
            onPress={() => void handleSkip()}
            style={styles.button}
            accessibilityLabel="Skip rest period"
            accessibilityHint="Ends the rest timer and allows you to continue the workout"
            accessibilityRole="button"
          >
            Skip
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  countdown: {
    textAlign: 'center',
    marginVertical: 16,
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    minHeight: 44, // WCAG 2.1 AA: Minimum 44pt touch target
  },
});
