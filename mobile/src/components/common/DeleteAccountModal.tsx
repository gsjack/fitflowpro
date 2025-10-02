/**
 * Delete Account Confirmation Modal (T055)
 *
 * Displays a confirmation dialog for account deletion with text validation.
 * Requires user to type "DELETE" exactly to confirm irreversible action.
 *
 * On confirmation:
 * - Calls deleteAccount() API (backend DELETE /api/users/:id)
 * - Clears AsyncStorage (JWT token and all local data)
 * - Navigates to AuthScreen
 *
 * FR-038: Account deletion (irreversible, cascades to all workout data)
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAccount } from '../../services/api/authApi';

interface DeleteAccountModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void; // Navigate to AuthScreen after deletion
}

/**
 * Delete Account Modal Component
 *
 * @param visible - Modal visibility state
 * @param onDismiss - Callback when modal is dismissed (cancel)
 * @param onSuccess - Callback after successful deletion (navigate to auth)
 */
export default function DeleteAccountModal({
  visible,
  onDismiss,
  onSuccess,
}: DeleteAccountModalProps) {
  const theme = useTheme();
  const [confirmationText, setConfirmationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation: user must type exactly "DELETE"
  const isConfirmationValid = confirmationText === 'DELETE';

  /**
   * Handle account deletion
   * 1. Call deleteAccount() API
   * 2. Clear AsyncStorage (JWT token, sync queue, etc.)
   * 3. Navigate to AuthScreen
   */
  const handleDeleteAccount = async () => {
    if (!isConfirmationValid) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call backend DELETE /api/users/:id
      await deleteAccount();

      // Clear all local storage
      await AsyncStorage.clear();

      console.log('[DeleteAccountModal] Account deleted successfully');

      // Close modal and navigate to auth screen
      onDismiss();
      onSuccess();

      // Show success message
      Alert.alert(
        'Account Deleted',
        'Your account and all workout history have been permanently deleted.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('[DeleteAccountModal] Deletion failed:', err);

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete account. Please try again.';

      setError(errorMessage);

      // Show error alert
      Alert.alert('Deletion Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle modal dismissal (reset state)
   */
  const handleDismiss = () => {
    setConfirmationText('');
    setError(null);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.content} accessible={true} accessibilityRole="alert">
          {/* Warning Icon */}
          <View
            style={[styles.warningIcon, { backgroundColor: theme.colors.errorContainer }]}
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
          >
            <Text style={[styles.warningIconText, { color: theme.colors.error }]}>⚠️</Text>
          </View>

          {/* Title */}
          <Text variant="headlineSmall" style={styles.title} accessibilityRole="header">
            Delete Account
          </Text>

          {/* Warning Message */}
          <Text
            variant="bodyMedium"
            style={styles.warningText}
            accessibilityRole="alert"
            accessibilityLabel="Warning: This will permanently delete all your workout history, programs, recovery data, and analytics. This action cannot be undone."
          >
            This will permanently delete all your workout history, programs, recovery data, and
            analytics. This action cannot be undone.
          </Text>

          {/* Confirmation Input */}
          <Text variant="bodySmall" style={styles.instructionText} accessibilityRole="text">
            Type <Text style={styles.deleteText}>DELETE</Text> to confirm:
          </Text>

          <TextInput
            mode="outlined"
            value={confirmationText}
            onChangeText={setConfirmationText}
            placeholder="DELETE"
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            error={!!error}
            disabled={isLoading}
            accessibilityLabel="Confirmation input (required)"
            accessibilityHint="Type DELETE in capital letters to confirm account deletion"
          />

          {/* Error Message */}
          {error && (
            <Text
              variant="bodySmall"
              style={[styles.errorText, { color: theme.colors.error }]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {error}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleDismiss}
              disabled={isLoading}
              style={styles.cancelButton}
              accessibilityLabel="Cancel deletion"
              accessibilityHint="Closes this dialog without deleting your account"
              accessibilityRole="button"
            >
              Cancel
            </Button>

            <Button
              mode="contained"
              onPress={() => void handleDeleteAccount()}
              disabled={!isConfirmationValid || isLoading}
              buttonColor={theme.colors.error}
              style={styles.deleteButton}
              accessibilityLabel="Delete account forever"
              accessibilityHint="Permanently deletes your account and all data. This cannot be undone."
              accessibilityRole="button"
              accessibilityState={{ disabled: !isConfirmationValid || isLoading }}
            >
              {isLoading ? <ActivityIndicator size="small" color="#fff" /> : 'Delete Forever'}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
  },
  content: {
    alignItems: 'center',
  },
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  warningIconText: {
    fontSize: 32,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  warningText: {
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  instructionText: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  deleteText: {
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  input: {
    width: '100%',
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    minHeight: 44, // WCAG 2.1 AA: Minimum 44pt touch target
  },
  deleteButton: {
    flex: 1,
    marginLeft: 8,
    minHeight: 44, // WCAG 2.1 AA: Minimum 44pt touch target
  },
});
