/**
 * SetLogCard Component (T058)
 *
 * Set logging form with weight/reps inputs and RIR selector.
 * Uses Material Design Paper components.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Card, TextInput, Button, Text, SegmentedButtons } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface SetLogCardProps {
  exerciseName: string;
  setNumber: number;
  targetReps: string;
  targetRir: number;
  previousWeight?: number;
  previousReps?: number;
  onLogSet: (weightKg: number, reps: number, rir: number) => void;
}

export default function SetLogCard({
  exerciseName,
  setNumber,
  targetReps,
  targetRir,
  previousWeight,
  previousReps,
  onLogSet,
}: SetLogCardProps) {
  const [weightKg, setWeightKg] = useState(previousWeight?.toString() ?? '');
  const [reps, setReps] = useState(previousReps?.toString() ?? '');
  const [rir, setRir] = useState(targetRir.toString());

  const handleLogSet = () => {
    const weight = parseFloat(weightKg);
    const repsNum = parseInt(reps, 10);
    const rirNum = parseInt(rir, 10);

    if (isNaN(weight) || isNaN(repsNum) || isNaN(rirNum)) {
      return;
    }

    onLogSet(weight, repsNum, rirNum);

    // Clear form for next set
    setWeightKg('');
    setReps('');
    setRir(targetRir.toString());
  };

  const adjustReps = (delta: number) => {
    const current = parseInt(reps, 10) || 0;
    const newReps = Math.max(0, current + delta);
    setReps(newReps.toString());
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weightKg) || 0;
    const newWeight = Math.max(0, current + delta);
    setWeightKg(newWeight.toFixed(1));
  };

  const isValid =
    weightKg !== '' && reps !== '' && !isNaN(parseFloat(weightKg)) && !isNaN(parseInt(reps, 10));

  return (
    <Card style={styles.card} elevation={4}>
      <LinearGradient
        colors={[colors.background.secondary, colors.background.tertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Card.Content style={styles.content}>
          {/* Set Info Header */}
          <View style={styles.header}>
            <Text variant="labelMedium" style={styles.setLabel}>
              SET {setNumber}
            </Text>
            <Text variant="bodySmall" style={styles.targetInfo}>
              Target: {targetReps} reps @ RIR {targetRir}
            </Text>
          </View>

          {/* Large Number Inputs */}
          <View style={styles.mainInputs}>
            {/* Weight Input */}
            <View style={styles.inputGroup}>
              <Text variant="labelSmall" style={styles.inputLabel}>
                WEIGHT (KG)
              </Text>
              <View style={styles.numberInputRow}>
                <Button
                  mode="contained-tonal"
                  onPress={() => adjustWeight(-2.5)}
                  style={styles.adjustButtonLarge}
                  buttonColor={colors.background.tertiary}
                  textColor={colors.text.primary}
                  contentStyle={styles.adjustButtonContent}
                  labelStyle={styles.adjustButtonLabel}
                  accessibilityLabel="Decrease weight"
                >
                  −
                </Button>
                <View style={styles.numberDisplay}>
                  <TextInput
                    value={weightKg}
                    onChangeText={setWeightKg}
                    keyboardType="decimal-pad"
                    style={styles.numberInput}
                    mode="flat"
                    textColor={colors.primary.main}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    contentStyle={styles.numberInputContent}
                    autoFocus={true}
                  />
                </View>
                <Button
                  mode="contained-tonal"
                  onPress={() => adjustWeight(2.5)}
                  style={styles.adjustButtonLarge}
                  buttonColor={colors.background.tertiary}
                  textColor={colors.text.primary}
                  contentStyle={styles.adjustButtonContent}
                  labelStyle={styles.adjustButtonLabel}
                  accessibilityLabel="Increase weight"
                >
                  +
                </Button>
              </View>
            </View>

            {/* Reps Input */}
            <View style={styles.inputGroup}>
              <Text variant="labelSmall" style={styles.inputLabel}>
                REPS
              </Text>
              <View style={styles.numberInputRow}>
                <Button
                  mode="contained-tonal"
                  onPress={() => adjustReps(-1)}
                  style={styles.adjustButtonLarge}
                  buttonColor={colors.background.tertiary}
                  textColor={colors.text.primary}
                  contentStyle={styles.adjustButtonContent}
                  labelStyle={styles.adjustButtonLabel}
                  accessibilityLabel="Decrease reps"
                >
                  −
                </Button>
                <View style={styles.numberDisplay}>
                  <TextInput
                    value={reps}
                    onChangeText={setReps}
                    keyboardType="number-pad"
                    style={styles.numberInput}
                    mode="flat"
                    textColor={colors.success.main}
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    contentStyle={styles.numberInputContent}
                  />
                </View>
                <Button
                  mode="contained-tonal"
                  onPress={() => adjustReps(1)}
                  style={styles.adjustButtonLarge}
                  buttonColor={colors.background.tertiary}
                  textColor={colors.text.primary}
                  contentStyle={styles.adjustButtonContent}
                  labelStyle={styles.adjustButtonLabel}
                  accessibilityLabel="Increase reps"
                >
                  +
                </Button>
              </View>
            </View>
          </View>

          {/* RIR Selector */}
          <View style={styles.rirContainer}>
            <Text variant="labelSmall" style={styles.rirLabel}>
              REPS IN RESERVE (RIR)
            </Text>
            <SegmentedButtons
              value={rir}
              onValueChange={setRir}
              density="small"
              buttons={[
                { value: '0', label: '0' },
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4+' },
              ]}
              theme={{
                colors: {
                  secondaryContainer: colors.primary.main,
                  onSecondaryContainer: colors.text.primary,
                  surfaceVariant: colors.background.tertiary,
                  onSurfaceVariant: colors.text.secondary,
                },
              }}
            />
          </View>

          {/* Complete Set Button */}
          <Button
            mode="contained"
            onPress={handleLogSet}
            disabled={!isValid}
            style={styles.completeButton}
            buttonColor={colors.success.main}
            textColor="#000000"
            contentStyle={styles.completeButtonContent}
            labelStyle={styles.completeButtonLabel}
            icon="check-circle"
            accessibilityLabel="Complete set"
          >
            Complete Set
          </Button>
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
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  setLabel: {
    color: colors.text.secondary,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  targetInfo: {
    color: colors.text.tertiary,
  },
  mainInputs: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    color: colors.text.tertiary,
    letterSpacing: 1.2,
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  adjustButtonLarge: {
    minWidth: 56,
    borderRadius: borderRadius.md,
  },
  adjustButtonContent: {
    height: 56,
  },
  adjustButtonLabel: {
    fontSize: 24,
    fontWeight: '700',
  },
  numberDisplay: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberInput: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  numberInputContent: {
    fontSize: 72, // Large for gym visibility (increased from 48pt)
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 0,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: 'system-ui',
    }),
    fontVariantNumeric: 'tabular-nums', // Monospace numbers for alignment
  },
  rirContainer: {
    marginBottom: spacing.lg,
  },
  rirLabel: {
    color: colors.text.tertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  completeButton: {
    minHeight: 56,
    borderRadius: borderRadius.md,
  },
  completeButtonContent: {
    height: 56,
  },
  completeButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
