/**
 * Weight Log Modal
 * Quick-add experience for logging body weight
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  Portal,
  Dialog,
  Button,
  Text,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { logBodyWeight } from '../../services/api/bodyWeightApi';
import { getAuthenticatedClient } from '../../services/api/authApi';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';

interface WeightLogModalProps {
  visible: boolean;
  onDismiss: () => void;
  onWeightLogged: () => void;
  unit?: 'kg' | 'lbs';
}

const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;
const MIN_WEIGHT_LBS = 66;
const MAX_WEIGHT_LBS = 660;

/**
 * Convert weight to kg for backend storage
 */
function convertToKg(weight: number, unit: 'kg' | 'lbs'): number {
  if (unit === 'lbs') {
    return weight / 2.20462;
  }
  return weight;
}

/**
 * Validate weight range
 */
function validateWeight(weight: number, unit: 'kg' | 'lbs'): string | null {
  if (unit === 'kg') {
    if (weight < MIN_WEIGHT_KG || weight > MAX_WEIGHT_KG) {
      return `Weight must be between ${MIN_WEIGHT_KG}kg and ${MAX_WEIGHT_KG}kg`;
    }
  } else {
    if (weight < MIN_WEIGHT_LBS || weight > MAX_WEIGHT_LBS) {
      return `Weight must be between ${MIN_WEIGHT_LBS}lbs and ${MAX_WEIGHT_LBS}lbs`;
    }
  }
  return null;
}

export default function WeightLogModal({
  visible,
  onDismiss,
  onWeightLogged,
  unit = 'kg',
}: WeightLogModalProps) {
  const [weight, setWeight] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'lbs'>(unit);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setWeight('');
      setSelectedUnit(unit);
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [visible, unit]);

  const handleSave = async () => {
    try {
      setError(null);

      // Validate weight input
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum)) {
        setError('Please enter a valid weight');
        return;
      }

      // Validate weight range
      const validationError = validateWeight(weightNum, selectedUnit);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsSubmitting(true);

      // Convert to kg for backend
      const weightKg = convertToKg(weightNum, selectedUnit);

      // Get auth token
      const client = await getAuthenticatedClient();
      if (!client?.token) {
        throw new Error('Not authenticated');
      }

      // Log weight
      await logBodyWeight(client.token, {
        weight_kg: weightKg,
        date,
        notes: notes.trim() || undefined,
      });

      // Haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Notify parent
      onWeightLogged();
      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log weight');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSaveDisabled = !weight || isSubmitting;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Log Body Weight</Dialog.Title>
        <Dialog.Content>
          {/* Unit Toggle */}
          <View style={styles.unitToggle}>
            <SegmentedButtons
              value={selectedUnit}
              onValueChange={(value) => setSelectedUnit(value as 'kg' | 'lbs')}
              buttons={[
                { value: 'kg', label: 'kg' },
                { value: 'lbs', label: 'lbs' },
              ]}
            />
          </View>

          {/* Weight Input */}
          <TextInput
            label={`Weight (${selectedUnit})`}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            error={!!error}
            autoFocus
            accessibilityLabel={`Enter weight in ${selectedUnit}`}
          />

          {/* Date Input (hidden for now, defaults to today) */}
          {/* Could be enhanced with a date picker component */}

          {/* Notes Input */}
          <TextInput
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
            placeholder="e.g., Before breakfast"
            accessibilityLabel="Enter notes"
          />

          {/* Error Message */}
          {error && (
            <Text variant="bodySmall" style={styles.errorText}>
              {error}
            </Text>
          )}

          {/* Helper Text */}
          <Text variant="bodySmall" style={styles.helperText}>
            Date: {new Date(date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onPress={handleSave}
            disabled={isSaveDisabled}
            loading={isSubmitting}
            mode="contained"
          >
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  unitToggle: {
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error.main,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  helperText: {
    color: colors.text.secondary,
    marginTop: -spacing.sm,
  },
});
