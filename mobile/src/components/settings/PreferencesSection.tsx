/**
 * PreferencesSection Component
 *
 * User preferences including weight units (kg/lbs).
 * Extracted from SettingsScreen for better organization.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, List, useTheme } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';
import type { WeightUnit } from '../../stores/settingsStore';

interface PreferencesSectionProps {
  weightUnit: WeightUnit;
  onWeightUnitChange: (unit: WeightUnit) => void;
}

/**
 * PreferencesSection Component
 *
 * Settings for user preferences (units, etc.).
 */
export default function PreferencesSection({
  weightUnit,
  onWeightUnitChange,
}: PreferencesSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        Preferences
      </Text>

      <List.Section>
        <List.Subheader style={styles.listSubheader}>Weight Units</List.Subheader>
        <List.Item
          title="Kilograms (kg)"
          description="Metric system (international standard)"
          left={(props) => (
            <List.Icon
              {...props}
              icon={weightUnit === 'kg' ? 'check-circle' : 'circle-outline'}
              color={weightUnit === 'kg' ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
          )}
          onPress={() => onWeightUnitChange('kg')}
          accessibilityLabel="Set weight unit to kilograms"
          accessibilityRole="button"
          accessibilityState={{ selected: weightUnit === 'kg' }}
        />
        <List.Item
          title="Pounds (lbs)"
          description="Imperial system (US standard)"
          left={(props) => (
            <List.Icon
              {...props}
              icon={weightUnit === 'lbs' ? 'check-circle' : 'circle-outline'}
              color={weightUnit === 'lbs' ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
          )}
          onPress={() => onWeightUnitChange('lbs')}
          accessibilityLabel="Set weight unit to pounds"
          accessibilityRole="button"
          accessibilityState={{ selected: weightUnit === 'lbs' }}
        />
      </List.Section>
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
  listSubheader: {
    fontSize: 14,
    fontWeight: '500',
  },
});
