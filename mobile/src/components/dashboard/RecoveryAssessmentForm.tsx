/**
 * RecoveryAssessmentForm Component
 *
 * Inline recovery assessment form for dashboard (T060).
 * Displays three questions (sleep, soreness, motivation) with segmented buttons.
 * Auto-submits after all questions answered.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, SegmentedButtons, Button } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';

interface RecoveryAssessmentFormProps {
  onSubmit: (
    sleepQuality: number,
    muscleSoreness: number,
    mentalMotivation: number
  ) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * RecoveryAssessmentForm Component
 *
 * Displays compact recovery assessment with emoji scale (1-5).
 */
export default function RecoveryAssessmentForm({
  onSubmit,
  isSubmitting = false,
}: RecoveryAssessmentFormProps) {
  const [sleepQuality, setSleepQuality] = useState<string>('');
  const [muscleSoreness, setMuscleSoreness] = useState<string>('');
  const [mentalMotivation, setMentalMotivation] = useState<string>('');

  const allQuestionsAnswered = sleepQuality && muscleSoreness && mentalMotivation;

  const handleSubmit = async () => {
    if (!allQuestionsAnswered) return;

    await onSubmit(parseInt(sleepQuality), parseInt(muscleSoreness), parseInt(mentalMotivation));

    // Reset form after submission
    setSleepQuality('');
    setMuscleSoreness('');
    setMentalMotivation('');
  };

  const handleHapticFeedback = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="bodySmall" style={styles.promptTitle}>
        Sleep • Soreness • Motivation
      </Text>

      <View style={styles.compactQuestions}>
        {/* Question 1: Sleep Quality */}
        <View style={styles.compactQuestion}>
          <Text variant="bodySmall" style={styles.recoveryScaleHelper}>
            Sleep Quality: 1 = Terrible, 5 = Excellent
          </Text>
          <SegmentedButtons
            value={sleepQuality}
            onValueChange={(value) => {
              setSleepQuality(value);
              handleHapticFeedback();
            }}
            buttons={[
              { value: '1', label: '😫 1' },
              { value: '2', label: '😴 2' },
              { value: '3', label: '😐 3' },
              { value: '4', label: '🙂 4' },
              { value: '5', label: '😃 5' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Question 2: Muscle Soreness */}
        <View style={styles.compactQuestion}>
          <Text variant="bodySmall" style={styles.recoveryScaleHelper}>
            Muscle Soreness: 1 = Very sore, 5 = No soreness
          </Text>
          <SegmentedButtons
            value={muscleSoreness}
            onValueChange={(value) => {
              setMuscleSoreness(value);
              handleHapticFeedback();
            }}
            buttons={[
              { value: '1', label: '🔥 1' },
              { value: '2', label: '😣 2' },
              { value: '3', label: '😐 3' },
              { value: '4', label: '🙂 4' },
              { value: '5', label: '💪 5' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Question 3: Mental Motivation */}
        <View style={styles.compactQuestion}>
          <Text variant="bodySmall" style={styles.recoveryScaleHelper}>
            Motivation: 1 = Very low, 5 = Very high
          </Text>
          <SegmentedButtons
            value={mentalMotivation}
            onValueChange={(value) => {
              setMentalMotivation(value);
              handleHapticFeedback();
            }}
            buttons={[
              { value: '1', label: '😞 1' },
              { value: '2', label: '😕 2' },
              { value: '3', label: '😐 3' },
              { value: '4', label: '😊 4' },
              { value: '5', label: '🔥 5' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Submit Button */}
        <Button
          mode="text"
          onPress={handleSubmit}
          style={styles.submitButtonMinimal}
          disabled={!allQuestionsAnswered || isSubmitting}
          loading={isSubmitting}
          accessibilityLabel="Submit recovery assessment"
          compact
        >
          {allQuestionsAnswered
            ? `Submit (${parseInt(sleepQuality) + parseInt(muscleSoreness) + parseInt(mentalMotivation)}/15)`
            : 'Submit'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  promptTitle: {
    color: colors.text.tertiary,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  compactQuestions: {
    gap: spacing.xs,
  },
  compactQuestion: {
    marginBottom: spacing.xs,
  },
  recoveryScaleHelper: {
    color: colors.text.tertiary,
    marginBottom: 8,
    fontSize: 12,
  },
  submitButtonMinimal: {
    marginTop: spacing.xs,
  },
  segmentedButtons: {
    minHeight: 48, // WCAG 48px minimum touch target
  },
});
