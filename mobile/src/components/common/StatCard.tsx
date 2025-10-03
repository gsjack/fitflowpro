/**
 * StatCard Component
 *
 * Reusable card for displaying metrics and statistics
 * Features large numbers with labels and optional trend indicators
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/typography';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
}

export default function StatCard({
  label,
  value,
  unit,
  description,
  trend,
  trendValue,
  color = colors.primary.main,
  icon,
  onPress,
}: StatCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return colors.success.main;
      case 'down':
        return colors.error.main;
      default:
        return colors.text.secondary;
    }
  };

  return (
    <Card
      style={styles.card}
      elevation={2}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={`${label}: ${value}${unit || ''}`}
      accessibilityRole={onPress ? 'button' : 'none'}
    >
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text variant="titleMedium" style={styles.label}>
            {label}
          </Text>
        </View>

        <View style={styles.valueContainer}>
          <Text variant="displayLarge" style={[styles.value, { color }]}>
            {value}
          </Text>
          {unit && (
            <Text variant="headlineSmall" style={[styles.unit, { color }]}>
              {unit}
            </Text>
          )}
        </View>

        {description && (
          <Text variant="bodySmall" style={styles.description}>
            {description}
          </Text>
        )}

        {trend && trendValue && (
          <View style={styles.trendContainer}>
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: spacing.sm,
  },
  value: {
    fontWeight: '700',
    letterSpacing: -1,
  },
  unit: {
    marginLeft: spacing.xs,
    fontWeight: '500',
    opacity: 0.8,
  },
  description: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  trendContainer: {
    marginTop: spacing.sm,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
