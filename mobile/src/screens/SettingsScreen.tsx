/**
 * SettingsScreen (T066)
 *
 * User settings and account management screen.
 * Uses React Native Paper components for Material Design UI.
 *
 * Features:
 * - User profile display (username)
 * - CSV export button (calls T054 csvExporter)
 * - Delete Account button (opens T055 DeleteAccountModal)
 * - Logout button (clear AsyncStorage token)
 * - Data export (download SQLite database via Share API)
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  List,
  Divider,
  ActivityIndicator,
  useTheme,
  Portal,
  Dialog,
  Paragraph,
} from 'react-native-paper';
import * as FileSystem from 'expo-file-system/legacy';
import { getToken } from '../services/api/authApi';
import {
  exportAndShareWorkouts,
  exportAndShareRecovery,
  shareCsvFile,
} from '../services/export/csvExporter';
import DeleteAccountModal from '../components/common/DeleteAccountModal';
import { useSettingsStore, type WeightUnit } from '../stores/settingsStore';

interface SettingsScreenProps {
  onLogout: () => void; // Navigate to AuthScreen after logout
}

/**
 * Get user data from token
 * @returns User object or null
 */
async function getUserFromToken(): Promise<{
  userId: number;
  username: string;
} | null> {
  try {
    const token = await getToken();
    if (!token) {
      return null;
    }

    // Decode JWT payload
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Note: Full user data should be fetched from backend GET /api/users/:id
    // For now, we use what's available in the token
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      userId: payload.userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      username: payload.username || '',
    };
  } catch (err) {
    console.error('[SettingsScreen] Failed to decode token:', err);
    return null;
  }
}

/**
 * SettingsScreen Component
 *
 * Displays user settings, profile editing, and data export options.
 *
 * @param onLogout - Callback after successful logout (navigate to auth)
 */
export default function SettingsScreen({ onLogout }: SettingsScreenProps) {
  const theme = useTheme();

  // Settings store
  const { weightUnit, setWeightUnit } = useSettingsStore();

  // User state
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  /**
   * Load user data from token
   */
  const loadUserData = async () => {
    setIsLoading(true);

    try {
      const user = await getUserFromToken();

      if (user) {
        setUserId(user.userId);
        setUsername(user.username);
      }
    } catch (err) {
      console.error('[SettingsScreen] Failed to load user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export workouts to CSV
   */
  const handleExportWorkouts = async () => {
    if (!userId) {
      Alert.alert('Error', 'Not authenticated', [{ text: 'OK' }]);
      return;
    }

    setIsLoading(true);

    try {
      await exportAndShareWorkouts(userId);
      console.log('[SettingsScreen] Workouts exported successfully');
    } catch (err) {
      console.error('[SettingsScreen] Export failed:', err);
      Alert.alert('Export Failed', 'Failed to export workouts. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export recovery assessments to CSV
   */
  const handleExportRecovery = async () => {
    if (!userId) {
      Alert.alert('Error', 'Not authenticated', [{ text: 'OK' }]);
      return;
    }

    setIsLoading(true);

    try {
      await exportAndShareRecovery(userId);
      console.log('[SettingsScreen] Recovery data exported successfully');
    } catch (err) {
      console.error('[SettingsScreen] Export failed:', err);
      Alert.alert('Export Failed', 'Failed to export recovery data. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export SQLite database file
   */
  const handleExportDatabase = async () => {
    setIsLoading(true);

    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/fitflow.db`;

      // Check if database file exists
      const fileInfo = await FileSystem.getInfoAsync(dbPath);

      if (!fileInfo.exists) {
        Alert.alert('Error', 'Database file not found', [{ text: 'OK' }]);
        return;
      }

      // Copy to cache directory for sharing
      const filename = `fitflow_database_${new Date().toISOString().split('T')[0]}.db`;
      const cacheUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.copyAsync({
        from: dbPath,
        to: cacheUri,
      });

      // Share database file
      await shareCsvFile(cacheUri, 'application/x-sqlite3');

      console.log('[SettingsScreen] Database exported successfully');
    } catch (err) {
      console.error('[SettingsScreen] Database export failed:', err);
      Alert.alert('Export Failed', 'Failed to export database. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle logout - show confirmation dialog
   */
  const handleLogout = () => {
    console.log('[SettingsScreen] Logout button pressed, showing dialog');
    setLogoutDialogVisible(true);
  };

  /**
   * Confirm logout - actually perform logout
   */
  const confirmLogout = () => {
    console.log('[SettingsScreen] Logout confirmed by user');
    setLogoutDialogVisible(false);
    // onLogout will handle token clearing and navigation
    console.log('[SettingsScreen] Calling onLogout callback');
    void onLogout();
  };

  /**
   * Handle delete account success
   */
  const handleDeleteAccountSuccess = () => {
    // Navigate to auth screen (already handled by DeleteAccountModal)
    onLogout();
  };

  if (isLoading && !userId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading settings...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Section */}
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

        <Divider style={styles.divider} />

        {/* Preferences Section */}
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
            onPress={() => setWeightUnit('kg')}
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
            onPress={() => setWeightUnit('lbs')}
            accessibilityLabel="Set weight unit to pounds"
            accessibilityRole="button"
            accessibilityState={{ selected: weightUnit === 'lbs' }}
          />
        </List.Section>

        <Divider style={styles.divider} />

        {/* Data Export Section */}
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          Data Export
        </Text>

        <List.Item
          title="Export Workouts (CSV)"
          description="Download all workout data as CSV file"
          left={(props) => <List.Icon {...props} icon="download" />}
          onPress={() => void handleExportWorkouts()}
          disabled={isLoading}
          accessibilityLabel="Export workouts"
          accessibilityHint="Download all workout data as a CSV file"
          accessibilityRole="button"
        />

        <List.Item
          title="Export Recovery Data (CSV)"
          description="Download recovery assessments as CSV file"
          left={(props) => <List.Icon {...props} icon="download" />}
          onPress={() => void handleExportRecovery()}
          disabled={isLoading}
          accessibilityLabel="Export recovery data"
          accessibilityHint="Download recovery assessments as a CSV file"
          accessibilityRole="button"
        />

        <List.Item
          title="Export Database"
          description="Download complete SQLite database file"
          left={(props) => <List.Icon {...props} icon="database" />}
          onPress={() => void handleExportDatabase()}
          disabled={isLoading}
          accessibilityLabel="Export database"
          accessibilityHint="Download complete SQLite database file"
          accessibilityRole="button"
        />

        <Divider style={styles.divider} />

        {/* Account Section */}
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          Account
        </Text>

        {/* Logout Button */}
        <Button
          mode="outlined"
          onPress={() => void handleLogout()}
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
          onPress={() => setDeleteModalVisible(true)}
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

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={deleteModalVisible}
        onDismiss={() => setDeleteModalVisible(false)}
        onSuccess={handleDeleteAccountSuccess}
      />

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>Logout</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Are you sure you want to logout?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmLogout}>Logout</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  divider: {
    marginVertical: 24,
  },
  logoutButton: {
    marginBottom: 12,
    height: 56, // WCAG AAA compliance - optimal touch target (upgraded from 44pt)
    minHeight: 56,
  },
  deleteButton: {
    marginBottom: 24,
    height: 56, // WCAG AAA compliance - optimal touch target (upgraded from 44pt)
    minHeight: 56,
  },
  versionText: {
    textAlign: 'center',
    opacity: 0.5,
  },
  listSubheader: {
    fontSize: 14,
    fontWeight: '500',
  },
});
