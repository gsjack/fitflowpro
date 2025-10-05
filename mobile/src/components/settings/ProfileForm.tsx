/**
 * ProfileForm Component
 *
 * User profile editing form with age, weight, and experience level.
 * Extracted from SettingsScreen for better separation of concerns.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, List, Button } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';

interface ProfileFormProps {
  username: string;
  age: string;
  weightKg: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  onAgeChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  onExperienceLevelChange: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  onSave: () => void;
  isSaving?: boolean;
}

/**
 * ProfileForm Component
 *
 * Editable user profile fields with save button.
 */
export default function ProfileForm({
  username,
  age,
  weightKg,
  experienceLevel,
  onAgeChange,
  onWeightChange,
  onExperienceLevelChange,
  onSave,
  isSaving = false,
}: ProfileFormProps) {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        Profile
      </Text>

      {/* Username (read-only) */}
      <TextInput
        mode="outlined"
        label="Username"
        value={username}
        editable={false}
        style={styles.input}
      />

      {/* Profile Fields */}
      <Text variant="titleMedium" style={styles.sectionSubtitle}>
        Profile Information
      </Text>

      <TextInput
        label="Age"
        value={age}
        onChangeText={onAgeChange}
        keyboardType="numeric"
        mode="outlined"
        style={styles.input}
        outlineColor={colors.primary.main}
        activeOutlineColor={colors.primary.main}
      />

      <TextInput
        label="Weight (kg)"
        value={weightKg}
        onChangeText={onWeightChange}
        keyboardType="decimal-pad"
        mode="outlined"
        style={styles.input}
        outlineColor={colors.primary.main}
        activeOutlineColor={colors.primary.main}
      />

      <Text variant="bodyMedium" style={styles.label}>
        Experience Level
      </Text>
      <List.Item
        title="Beginner"
        left={() =>
          experienceLevel === 'beginner' ? (
            <List.Icon icon="check" color={colors.primary.main} />
          ) : (
            <View style={{ width: 40 }} />
          )
        }
        onPress={() => onExperienceLevelChange('beginner')}
      />
      <List.Item
        title="Intermediate"
        left={() =>
          experienceLevel === 'intermediate' ? (
            <List.Icon icon="check" color={colors.primary.main} />
          ) : (
            <View style={{ width: 40 }} />
          )
        }
        onPress={() => onExperienceLevelChange('intermediate')}
      />
      <List.Item
        title="Advanced"
        left={() =>
          experienceLevel === 'advanced' ? (
            <List.Icon icon="check" color={colors.primary.main} />
          ) : (
            <View style={{ width: 40 }} />
          )
        }
        onPress={() => onExperienceLevelChange('advanced')}
      />

      <Button
        mode="contained"
        onPress={onSave}
        loading={isSaving}
        disabled={isSaving}
        style={styles.saveButton}
      >
        Save Profile
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
    color: colors.text.primary,
  },
  sectionSubtitle: {
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    color: colors.text.primary,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  label: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  saveButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
