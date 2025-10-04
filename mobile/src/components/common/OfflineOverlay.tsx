/**
 * Offline Overlay Component
 *
 * Blocking overlay shown when network is unavailable and operation requires internet.
 * Features:
 * - Centered message with icon
 * - Semi-transparent dark backdrop
 * - Accessible labels
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Icon } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/typography';

interface OfflineOverlayProps {
  message?: string;
}

/**
 * Offline Overlay Component
 *
 * @param message - Custom message to display (default: "Program editing requires internet connection")
 */
export default function OfflineOverlay({ message }: OfflineOverlayProps) {
  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel="Offline overlay"
      accessibilityRole="alert"
    >
      <Card style={styles.card} elevation={5}>
        <Card.Content style={styles.content}>
          <Icon source="wifi-off" size={64} color={colors.error.main} />
          <Text variant="titleLarge" style={styles.title}>
            No Internet Connection
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            {message || 'Program editing requires internet connection'}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.background.primary,
    maxWidth: 400,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.text.primary,
    textAlign: 'center',
  },
  message: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
