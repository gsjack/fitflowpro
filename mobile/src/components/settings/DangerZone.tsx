/**
 * DangerZone Component
 *
 * Destructive account actions (logout, delete account).
 * Extracted from SettingsScreen for clear separation of concerns.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';

interface DangerZoneProps {
  onLogout: () => void;
  onDeleteAccount: () => void;
}

/**
 * DangerZone Component
 *
 * Logout and delete account buttons with appropriate styling.
 */
export default function DangerZone({ onLogout, onDeleteAccount }: DangerZoneProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.sectionTitle}>
        Account
      </Text>

      {/* Logout Button */}
      <Button
        mode="outlined"
        onPress={onLogout}
        style={styles.logoutButton}
        icon="logout"
        accessibilityLabel="Logout"
        accessibilityHint="Sign out of your account"
        accessibilityRole="button"
      >
        Logout
      </Button>

      {/* Delete Account Button */}
      <Button
        mode="contained"
        onPress={onDeleteAccount}
        buttonColor={theme.colors.error}
        style={styles.deleteButton}
        icon="delete"
        accessibilityLabel="Delete account"
        accessibilityHint="Permanently delete your account and all data"
        accessibilityRole="button"
      >
        Delete Account
      </Button>

      {/* App Version */}
      <Text variant="bodySmall" style={styles.versionText}>
        FitFlow Pro v1.0.0
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
    color: colors.text.primary,
  },
  logoutButton: {
    marginBottom: spacing.sm,
    height: 56, // WCAG AAA compliance
    minHeight: 56,
  },
  deleteButton: {
    marginBottom: spacing.lg,
    height: 56, // WCAG AAA compliance
    minHeight: 56,
  },
  versionText: {
    textAlign: 'center',
    opacity: 0.5,
  },
});
