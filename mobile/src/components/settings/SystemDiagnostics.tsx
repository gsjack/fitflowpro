/**
 * SystemDiagnostics Component
 *
 * Displays system information and SQLite status for troubleshooting.
 * Can be added to Settings screen to help users diagnose issues.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import {
  getSystemDiagnostics,
  getStatusMessage,
  getRecommendedActions,
} from '../../utils/diagnostics';

interface SystemDiagnosticsProps {
  visible?: boolean;
}

export default function SystemDiagnostics({ visible = true }: SystemDiagnosticsProps) {
  const theme = useTheme();
  const diagnostics = getSystemDiagnostics();
  const statusMessage = getStatusMessage();
  const actions = getRecommendedActions();

  if (!visible) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Status Overview */}
      <Card style={styles.card}>
        <Card.Title title="System Status" />
        <Card.Content>
          <Text variant="bodyMedium" style={styles.statusText}>
            {statusMessage}
          </Text>
        </Card.Content>
      </Card>

      {/* Platform Info */}
      <Card style={styles.card}>
        <Card.Title title="Platform" />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={styles.label}>
              Operating System:
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {diagnostics.platform.os} {diagnostics.platform.version}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* App Info */}
      <Card style={styles.card}>
        <Card.Title title="Application" />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={styles.label}>
              Expo SDK:
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {diagnostics.expo.version}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={styles.label}>
              Version:
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {diagnostics.expo.appVersion} ({diagnostics.expo.buildNumber})
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Database Status */}
      <Card style={styles.card}>
        <Card.Title title="Database" />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={styles.label}>
              SQLite Available:
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.value,
                {
                  color: diagnostics.database.available ? theme.colors.primary : theme.colors.error,
                },
              ]}
            >
              {diagnostics.database.available ? '✅ YES' : '❌ NO'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={styles.label}>
              Platform:
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {diagnostics.database.platform}
            </Text>
          </View>
          {diagnostics.database.error && (
            <View style={styles.errorContainer}>
              <Text variant="bodySmall" style={styles.errorLabel}>
                Error:
              </Text>
              <Text variant="bodySmall" style={styles.errorText}>
                {diagnostics.database.error}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Features */}
      <Card style={styles.card}>
        <Card.Title title="Features" />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={styles.label}>
              Offline Mode:
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.value,
                {
                  color: diagnostics.features.offlineMode
                    ? theme.colors.primary
                    : theme.colors.error,
                },
              ]}
            >
              {diagnostics.features.offlineMode ? '✅ Enabled' : '❌ Disabled'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={styles.label}>
              Background Sync:
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.value,
                {
                  color: diagnostics.features.backgroundSync
                    ? theme.colors.primary
                    : theme.colors.error,
                },
              ]}
            >
              {diagnostics.features.backgroundSync ? '✅ Enabled' : '❌ Disabled'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={styles.label}>
              Local Storage:
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.value,
                {
                  color: diagnostics.features.localStorage
                    ? theme.colors.primary
                    : theme.colors.error,
                },
              ]}
            >
              {diagnostics.features.localStorage ? '✅ Enabled' : '❌ Disabled'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Recommended Actions */}
      {actions.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Recommended Actions" />
          <Card.Content>
            {actions.map((action, index) => (
              <Text key={index} variant="bodySmall" style={styles.actionText}>
                {action}
              </Text>
            ))}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  label: {
    fontWeight: '600',
    flex: 1,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  statusText: {
    marginVertical: 8,
  },
  errorContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 4,
  },
  errorLabel: {
    fontWeight: '600',
    color: '#c62828',
    marginBottom: 4,
  },
  errorText: {
    color: '#c62828',
    fontFamily: 'monospace',
  },
  actionText: {
    marginVertical: 2,
    lineHeight: 20,
  },
});
