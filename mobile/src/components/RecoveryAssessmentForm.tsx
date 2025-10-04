/**
 * RecoveryAssessmentForm Component (T087)
 *
 * Daily 3-question recovery check-in form:
 * 1. Sleep Quality (1-5)
 * 2. Muscle Soreness (1-5)
 * 3. Motivation Level (1-5)
 *
 * Features:
 * - Visual 5-point scale with emojis
 * - Real-time total score calculation (3-15)
 * - Recovery interpretation and volume adjustment recommendation
 * - Read-only mode if assessment already submitted today
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Card,
  Text,
  Button,
  SegmentedButtons,
  Portal,
  Dialog,
  Paragraph,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import {
  RecoveryAssessment,
  useCreateRecoveryAssessment,
  getVolumeAdjustmentDescription,
  getRecoveryScoreInterpretation,
} from '../services/api/recoveryApi';
import { colors, gradients } from '../theme/colors';
import { spacing, borderRadius } from '../theme/typography';

interface RecoveryAssessmentFormProps {
  onSubmit: (assessment: {
    sleep_quality: number;
    soreness_level: number;
    motivation_level: number;
  }) => void;
  existingAssessment?: RecoveryAssessment;
}

// Question configuration with emojis
const SLEEP_QUALITY_OPTIONS = [
  { value: '1', label: '😫', description: 'Poor' },
  { value: '2', label: '😕', description: 'Below Average' },
  { value: '3', label: '😐', description: 'Average' },
  { value: '4', label: '😊', description: 'Good' },
  { value: '5', label: '😴', description: 'Excellent' },
];

const SORENESS_OPTIONS = [
  { value: '1', label: '😖', description: 'Very Sore' },
  { value: '2', label: '😣', description: 'Sore' },
  { value: '3', label: '😐', description: 'Moderate' },
  { value: '4', label: '🙂', description: 'Mild' },
  { value: '5', label: '😄', description: 'No Soreness' },
];

const MOTIVATION_OPTIONS = [
  { value: '1', label: '😞', description: 'Not at all' },
  { value: '2', label: '😕', description: 'Low' },
  { value: '3', label: '😐', description: 'Moderate' },
  { value: '4', label: '😊', description: 'High' },
  { value: '5', label: '🔥', description: 'Very Motivated' },
];

export default function RecoveryAssessmentForm({
  onSubmit,
  existingAssessment,
}: RecoveryAssessmentFormProps) {
  const [sleepQuality, setSleepQuality] = useState('');
  const [sorenessLevel, setSorenessLevel] = useState('');
  const [motivationLevel, setMotivationLevel] = useState('');
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);

  const createMutation = useCreateRecoveryAssessment();

  // If existing assessment, populate values (read-only mode)
  useEffect(() => {
    if (existingAssessment) {
      setSleepQuality(existingAssessment.sleep_quality.toString());
      setSorenessLevel(existingAssessment.muscle_soreness.toString());
      setMotivationLevel(existingAssessment.mental_motivation.toString());
    }
  }, [existingAssessment]);

  // Calculate total score
  const totalScore =
    (sleepQuality ? parseInt(sleepQuality, 10) : 0) +
    (sorenessLevel ? parseInt(sorenessLevel, 10) : 0) +
    (motivationLevel ? parseInt(motivationLevel, 10) : 0);

  // Check if form is complete
  const isComplete = sleepQuality !== '' && sorenessLevel !== '' && motivationLevel !== '';

  // Get interpretation and adjustment
  const interpretation = isComplete ? getRecoveryScoreInterpretation(totalScore) : null;
  const volumeAdjustment = (() => {
    if (!isComplete) return null;
    if (totalScore >= 12) return 'none';
    if (totalScore >= 9) return 'reduce_1_set';
    if (totalScore >= 6) return 'reduce_2_sets';
    return 'rest_day';
  })();

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 12) return colors.success.main;
    if (score >= 9) return colors.primary.main;
    if (score >= 6) return colors.warning.main;
    return colors.error.main;
  };

  const handleSubmit = async () => {
    if (!isComplete) return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const assessmentData = {
      date: today,
      sleep_quality: parseInt(sleepQuality, 10),
      muscle_soreness: parseInt(sorenessLevel, 10),
      mental_motivation: parseInt(motivationLevel, 10),
    };

    try {
      await createMutation.mutateAsync(assessmentData);
      setSuccessDialogVisible(true);
      onSubmit(assessmentData);
    } catch (error) {
      console.error('[RecoveryAssessmentForm] Failed to submit assessment:', error);
      // Error handling could be improved with a toast/snackbar
    }
  };

  const isReadOnly = !!existingAssessment;

  return (
    <>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card} elevation={4}>
          <LinearGradient
            colors={gradients.card as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Card.Content style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.title}>
                  Daily Recovery Check-In
                </Text>
                {isReadOnly && (
                  <Text variant="bodySmall" style={styles.readOnlyLabel}>
                    Already submitted today
                  </Text>
                )}
              </View>

              {/* Question 1: Sleep Quality */}
              <View style={styles.questionContainer}>
                <Text variant="titleMedium" style={styles.questionText}>
                  1. How well did you sleep last night?
                </Text>
                <SegmentedButtons
                  value={sleepQuality}
                  onValueChange={setSleepQuality}
                  density="small"
                  buttons={SLEEP_QUALITY_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                    disabled: isReadOnly,
                  }))}
                  theme={{
                    colors: {
                      secondaryContainer: colors.primary.main,
                      onSecondaryContainer: colors.text.primary,
                      surfaceVariant: colors.background.tertiary,
                      onSurfaceVariant: colors.text.secondary,
                    },
                  }}
                  style={styles.segmentedButtons}
                />
                {sleepQuality && (
                  <Text variant="bodySmall" style={styles.selectedLabel}>
                    {SLEEP_QUALITY_OPTIONS.find((o) => o.value === sleepQuality)?.description}
                  </Text>
                )}
              </View>

              {/* Question 2: Muscle Soreness */}
              <View style={styles.questionContainer}>
                <Text variant="titleMedium" style={styles.questionText}>
                  2. How sore are your muscles?
                </Text>
                <SegmentedButtons
                  value={sorenessLevel}
                  onValueChange={setSorenessLevel}
                  density="small"
                  buttons={SORENESS_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                    disabled: isReadOnly,
                  }))}
                  theme={{
                    colors: {
                      secondaryContainer: colors.primary.main,
                      onSecondaryContainer: colors.text.primary,
                      surfaceVariant: colors.background.tertiary,
                      onSurfaceVariant: colors.text.secondary,
                    },
                  }}
                  style={styles.segmentedButtons}
                />
                {sorenessLevel && (
                  <Text variant="bodySmall" style={styles.selectedLabel}>
                    {SORENESS_OPTIONS.find((o) => o.value === sorenessLevel)?.description}
                  </Text>
                )}
              </View>

              {/* Question 3: Motivation Level */}
              <View style={styles.questionContainer}>
                <Text variant="titleMedium" style={styles.questionText}>
                  3. How motivated do you feel to train?
                </Text>
                <SegmentedButtons
                  value={motivationLevel}
                  onValueChange={setMotivationLevel}
                  density="small"
                  buttons={MOTIVATION_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                    disabled: isReadOnly,
                  }))}
                  theme={{
                    colors: {
                      secondaryContainer: colors.primary.main,
                      onSecondaryContainer: colors.text.primary,
                      surfaceVariant: colors.background.tertiary,
                      onSurfaceVariant: colors.text.secondary,
                    },
                  }}
                  style={styles.segmentedButtons}
                />
                {motivationLevel && (
                  <Text variant="bodySmall" style={styles.selectedLabel}>
                    {MOTIVATION_OPTIONS.find((o) => o.value === motivationLevel)?.description}
                  </Text>
                )}
              </View>

              {/* Score Summary */}
              {isComplete && (
                <View style={styles.summaryContainer}>
                  <View style={styles.scoreRow}>
                    <Text variant="labelMedium" style={styles.scoreLabel}>
                      Total Recovery Score:
                    </Text>
                    <Text
                      variant="displayMedium"
                      style={[styles.scoreValue, { color: getScoreColor(totalScore) }]}
                    >
                      {totalScore}
                      <Text variant="titleMedium" style={styles.scoreMax}>
                        /15
                      </Text>
                    </Text>
                  </View>

                  {/* Interpretation */}
                  <View style={styles.interpretationBox}>
                    <Text variant="titleMedium" style={styles.interpretationTitle}>
                      {interpretation}
                    </Text>
                    {volumeAdjustment && (
                      <Text variant="bodyMedium" style={styles.adjustmentText}>
                        Recommendation: {getVolumeAdjustmentDescription(volumeAdjustment)}
                      </Text>
                    )}
                  </View>

                  {/* Explanation */}
                  <View style={styles.explanationBox}>
                    <Text variant="bodySmall" style={styles.explanationText}>
                      {totalScore >= 12 && '🎯 Great recovery! Proceed with your planned workout.'}
                      {totalScore >= 9 &&
                        totalScore < 12 &&
                        '⚠️ Moderate recovery. Consider reducing volume by 1 set per exercise.'}
                      {totalScore >= 6 &&
                        totalScore < 9 &&
                        '⚠️ Poor recovery. Reduce volume by 2 sets per exercise or focus on lighter work.'}
                      {totalScore < 6 &&
                        '🛑 Very poor recovery. Consider taking a rest day or doing light active recovery only.'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              {!isReadOnly && (
                <Button
                  mode="contained"
                  onPress={() => void handleSubmit()}
                  disabled={!isComplete || createMutation.isPending}
                  style={styles.submitButton}
                  buttonColor={colors.success.main}
                  textColor="#000000"
                  contentStyle={styles.submitButtonContent}
                  icon="check-circle"
                  loading={createMutation.isPending}
                  accessibilityLabel="Submit recovery assessment"
                >
                  Submit Assessment
                </Button>
              )}
            </Card.Content>
          </LinearGradient>
        </Card>
      </ScrollView>

      {/* Success Dialog */}
      <Portal>
        <Dialog visible={successDialogVisible} onDismiss={() => setSuccessDialogVisible(false)}>
          <Dialog.Title>Assessment Submitted</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Your recovery assessment has been saved. Your workout volume will be adjusted based on
              your recovery score.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSuccessDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  card: {
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  gradient: {
    width: '100%',
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  readOnlyLabel: {
    color: colors.success.main,
    fontStyle: 'italic',
  },
  questionContainer: {
    marginBottom: spacing.xl,
  },
  questionText: {
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  segmentedButtons: {
    marginBottom: spacing.sm,
  },
  selectedLabel: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  summaryContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
  },
  scoreRow: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  scoreLabel: {
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontWeight: '800',
  },
  scoreMax: {
    color: colors.text.tertiary,
  },
  interpretationBox: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.effects.overlay,
    borderRadius: borderRadius.sm,
  },
  interpretationTitle: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  adjustmentText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  explanationBox: {
    padding: spacing.md,
    backgroundColor: colors.effects.overlay,
    borderRadius: borderRadius.sm,
  },
  explanationText: {
    color: colors.text.secondary,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
  },
  submitButtonContent: {
    height: 56,
  },
});
