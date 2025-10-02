/**
 * SetLogCard Component (T058)
 *
 * Set logging form with weight/reps inputs and RIR selector.
 * Uses Material Design Paper components.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, TextInput, Button, Text, SegmentedButtons } from 'react-native-paper';

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
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.exerciseName} accessibilityRole="header">
          {exerciseName}
        </Text>
        <Text
          variant="bodyMedium"
          style={styles.setInfo}
          accessibilityLabel={`Set ${setNumber}. Target: ${targetReps} repetitions at RIR ${targetRir}`}
        >
          Set {setNumber} • Target: {targetReps} reps @ RIR {targetRir}
        </Text>

        {/* Weight Input */}
        <View
          style={styles.inputRow}
          accessibilityRole="adjustable"
          accessibilityLabel={`Weight input. Current value: ${weightKg || '0'} kilograms`}
        >
          <Button
            mode="outlined"
            onPress={() => adjustWeight(-2.5)}
            style={styles.adjustButton}
            accessibilityLabel="Decrease weight by 2.5 kilograms"
            accessibilityRole="button"
          >
            -2.5
          </Button>
          <TextInput
            label="Weight (kg)"
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
            style={styles.input}
            mode="outlined"
            accessibilityLabel="Weight in kilograms"
            accessibilityHint="Enter the weight used for this set"
            autoFocus={true}
          />
          <Button
            mode="outlined"
            onPress={() => adjustWeight(2.5)}
            style={styles.adjustButton}
            accessibilityLabel="Increase weight by 2.5 kilograms"
            accessibilityRole="button"
          >
            +2.5
          </Button>
        </View>

        {/* Reps Input */}
        <View
          style={styles.inputRow}
          accessibilityRole="adjustable"
          accessibilityLabel={`Repetitions input. Current value: ${reps || '0'} reps`}
        >
          <Button
            mode="outlined"
            onPress={() => adjustReps(-1)}
            style={styles.adjustButton}
            accessibilityLabel="Decrease reps by 1"
            accessibilityRole="button"
          >
            -1
          </Button>
          <TextInput
            label="Reps"
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            style={styles.input}
            mode="outlined"
            accessibilityLabel="Number of repetitions"
            accessibilityHint="Enter the number of reps completed"
          />
          <Button
            mode="outlined"
            onPress={() => adjustReps(1)}
            style={styles.adjustButton}
            accessibilityLabel="Increase reps by 1"
            accessibilityRole="button"
          >
            +1
          </Button>
        </View>

        {/* RIR Selector */}
        <View
          style={styles.rirContainer}
          accessibilityRole="radiogroup"
          accessibilityLabel={`Reps in reserve. Current value: ${rir}`}
        >
          <Text variant="bodyMedium" style={styles.rirLabel} accessibilityRole="text">
            RIR (Reps in Reserve)
          </Text>
          <SegmentedButtons
            value={rir}
            onValueChange={setRir}
            buttons={[
              { value: '0', label: '0', accessibilityLabel: 'RIR 0: Complete failure' },
              { value: '1', label: '1', accessibilityLabel: 'RIR 1: 1 rep left in tank' },
              { value: '2', label: '2', accessibilityLabel: 'RIR 2: 2 reps left in tank' },
              { value: '3', label: '3', accessibilityLabel: 'RIR 3: 3 reps left in tank' },
              { value: '4', label: '4', accessibilityLabel: 'RIR 4: 4 or more reps left' },
            ]}
          />
        </View>

        {/* Complete Set Button */}
        <Button
          mode="contained"
          onPress={handleLogSet}
          disabled={!isValid}
          style={styles.completeButton}
          accessibilityLabel="Complete set"
          accessibilityHint={`Logs ${weightKg || '0'} kilograms for ${reps || '0'} reps at RIR ${rir} and starts rest timer`}
          accessibilityRole="button"
        >
          Complete Set
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  exerciseName: {
    marginBottom: 4,
  },
  setInfo: {
    marginBottom: 16,
    opacity: 0.7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
  },
  adjustButton: {
    minWidth: 60,
  },
  rirContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  rirLabel: {
    marginBottom: 8,
  },
  completeButton: {
    marginTop: 8,
  },
});
