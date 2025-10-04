/**
 * SetLogCard Component (T058)
 *
 * Set logging form with weight/reps inputs and RIR selector.
 * Uses Material Design Paper components.
 *
 * UX Enhancements for Gym Environment:
 * - 64×64px adjustment buttons (up from 56×56) for easier tapping with sweaty hands/gloves
 * - Long-press auto-increment: hold +/- buttons to rapidly adjust values (200ms intervals)
 * - Haptic feedback on each increment (native only, not web)
 * - Visual feedback: buttons scale down to 0.95 when long-pressing
 * - Explicit labels on buttons ("+2.5", "-1") for clarity
 * - Minimum screen width support: 320px (buttons + gaps = 160px, input = 160px)
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Card, TextInput, Button, Text, SegmentedButtons } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  fromBackendWeight,
  toBackendWeight,
  getUnitLabel,
  getWeightIncrement,
} from '../../utils/unitConversion';

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
  const { weightUnit } = useSettingsStore();

  // Convert previous weight from kg to display unit
  const previousWeightDisplay = previousWeight
    ? fromBackendWeight(previousWeight, weightUnit).toString()
    : '';

  const [weightDisplay, setWeightDisplay] = useState(previousWeightDisplay);
  const [reps, setReps] = useState(previousReps?.toString() ?? '');
  const [rir, setRir] = useState(targetRir.toString());

  // Long-press state management
  const longPressInterval = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressingWeight, setIsLongPressingWeight] = useState(false);
  const [isLongPressingReps, setIsLongPressingReps] = useState(false);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (longPressInterval.current) {
        clearInterval(longPressInterval.current);
      }
    };
  }, []);

  const handleLogSet = async () => {
    const weightInDisplayUnit = parseFloat(weightDisplay);
    const repsNum = parseInt(reps, 10);
    const rirNum = parseInt(rir, 10);

    if (isNaN(weightInDisplayUnit) || isNaN(repsNum) || isNaN(rirNum)) {
      return;
    }

    // Convert display weight to kg for backend
    const weightKg = toBackendWeight(weightInDisplayUnit, weightUnit);

    // Haptic feedback on successful set completion (mobile only)
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    onLogSet(weightKg, repsNum, rirNum);

    // Clear form for next set
    setWeightDisplay('');
    setReps('');
    setRir(targetRir.toString());
  };

  const adjustReps = async (delta: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const current = parseInt(reps, 10) || 0;
    const newReps = Math.max(0, current + delta);
    setReps(newReps.toString());
  };

  const adjustWeight = async (delta: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const current = parseFloat(weightDisplay) || 0;
    const newWeight = Math.max(0, current + delta);
    setWeightDisplay(newWeight.toFixed(1));
  };

  // Long-press handlers for weight
  const handleWeightLongPressStart = (delta: number) => {
    setIsLongPressingWeight(true);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Start interval for continuous adjustment
    longPressInterval.current = setInterval(() => {
      void adjustWeight(delta);
    }, 200);
  };

  const handleWeightLongPressEnd = () => {
    setIsLongPressingWeight(false);
    if (longPressInterval.current) {
      clearInterval(longPressInterval.current);
      longPressInterval.current = null;
    }
  };

  // Long-press handlers for reps
  const handleRepsLongPressStart = (delta: number) => {
    setIsLongPressingReps(true);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Start interval for continuous adjustment
    longPressInterval.current = setInterval(() => {
      void adjustReps(delta);
    }, 200);
  };

  const handleRepsLongPressEnd = () => {
    setIsLongPressingReps(false);
    if (longPressInterval.current) {
      clearInterval(longPressInterval.current);
      longPressInterval.current = null;
    }
  };

  const isValid =
    weightDisplay !== '' &&
    reps !== '' &&
    !isNaN(parseFloat(weightDisplay)) &&
    !isNaN(parseInt(reps, 10));

  // Get appropriate increment and unit label based on user preference
  const weightIncrement = getWeightIncrement(weightUnit);
  const unitLabel = getUnitLabel(weightUnit);

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
            <Text variant="bodyMedium" style={styles.targetInfo}>
              Target: {targetReps} reps @ RIR {targetRir}
            </Text>
          </View>

          {/* Large Number Inputs */}
          <View style={styles.mainInputs}>
            {/* Weight Input */}
            <View style={styles.inputGroup}>
              <Text variant="labelSmall" style={styles.inputLabel}>
                WEIGHT ({unitLabel.toUpperCase()})
              </Text>
              <View style={styles.numberInputRow}>
                <Button
                  mode="contained-tonal"
                  onPress={() => void adjustWeight(-weightIncrement)}
                  onLongPress={() => handleWeightLongPressStart(-weightIncrement)}
                  onPressOut={handleWeightLongPressEnd}
                  style={[
                    styles.adjustButtonLarge,
                    isLongPressingWeight && styles.adjustButtonPressed,
                  ]}
                  buttonColor={colors.background.tertiary}
                  textColor={colors.text.primary}
                  contentStyle={styles.adjustButtonContent}
                  labelStyle={styles.adjustButtonLabel}
                  accessibilityLabel={`Decrease weight by ${weightIncrement}${unitLabel}`}
                  accessibilityHint="Long press to continuously decrease"
                >
                  −{weightIncrement}
                </Button>
                <View style={styles.numberDisplay}>
                  <TextInput
                    value={weightDisplay}
                    onChangeText={setWeightDisplay}
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
                  onPress={() => void adjustWeight(weightIncrement)}
                  onLongPress={() => handleWeightLongPressStart(weightIncrement)}
                  onPressOut={handleWeightLongPressEnd}
                  style={[
                    styles.adjustButtonLarge,
                    isLongPressingWeight && styles.adjustButtonPressed,
                  ]}
                  buttonColor={colors.background.tertiary}
                  textColor={colors.text.primary}
                  contentStyle={styles.adjustButtonContent}
                  labelStyle={styles.adjustButtonLabel}
                  accessibilityLabel={`Increase weight by ${weightIncrement}${unitLabel}`}
                  accessibilityHint="Long press to continuously increase"
                >
                  +{weightIncrement}
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
                  onPress={() => void adjustReps(-1)}
                  onLongPress={() => handleRepsLongPressStart(-1)}
                  onPressOut={handleRepsLongPressEnd}
                  style={[
                    styles.adjustButtonLarge,
                    isLongPressingReps && styles.adjustButtonPressed,
                  ]}
                  buttonColor={colors.background.tertiary}
                  textColor={colors.text.primary}
                  contentStyle={styles.adjustButtonContent}
                  labelStyle={styles.adjustButtonLabel}
                  accessibilityLabel="Decrease reps by 1"
                  accessibilityHint="Long press to continuously decrease"
                >
                  −1
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
                  onPress={() => void adjustReps(1)}
                  onLongPress={() => handleRepsLongPressStart(1)}
                  onPressOut={handleRepsLongPressEnd}
                  style={[
                    styles.adjustButtonLarge,
                    isLongPressingReps && styles.adjustButtonPressed,
                  ]}
                  buttonColor={colors.background.tertiary}
                  textColor={colors.text.primary}
                  contentStyle={styles.adjustButtonContent}
                  labelStyle={styles.adjustButtonLabel}
                  accessibilityLabel="Increase reps by 1"
                  accessibilityHint="Long press to continuously increase"
                >
                  +1
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
              buttons={[
                { value: '0', label: '0' },
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4+' },
              ]}
              style={styles.segmentedButtons}
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
            onPress={() => void handleLogSet()}
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
    fontSize: 16, // FIX P0-2: Increased from default bodySmall (14px) for better readability
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
    minWidth: 64,
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
  },
  adjustButtonContent: {
    height: 64,
    width: 64,
  },
  adjustButtonLabel: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  adjustButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
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
    // @ts-expect-error - fontVariantNumeric is not in React Native types but works on web
    fontVariantNumeric: 'tabular-nums', // Monospace numbers for alignment
  } as const,
  rirContainer: {
    marginBottom: spacing.lg,
  },
  rirLabel: {
    color: colors.text.tertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  segmentedButtons: {
    minHeight: 48,
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
