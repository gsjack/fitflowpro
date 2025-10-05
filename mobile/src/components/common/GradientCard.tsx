/**
 * GradientCard Component
 *
 * Reusable card with gradient background for hero sections
 * Optimized for dark mode with glassmorphism effects
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../theme/colors';
import { borderRadius } from '../../theme/typography';

interface GradientCardProps {
  children: React.ReactNode;
  gradient?: [string, string, ...string[]];
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: number;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'none';
}

export default function GradientCard({
  children,
  gradient = gradients.card,
  style,
  onPress,
  elevation = 4,
  accessible = true,
  accessibilityLabel,
  accessibilityRole,
}: GradientCardProps) {
  return (
    <Card
      style={[styles.card, style]}
      elevation={elevation as 0 | 1 | 2 | 3 | 4 | 5}
      onPress={onPress}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Card.Content style={styles.content}>{children}</Card.Content>
      </LinearGradient>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  gradient: {
    width: '100%',
  },
  content: {
    padding: 0, // We'll control padding in children
  },
});
