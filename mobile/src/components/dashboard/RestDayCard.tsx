/**
 * RestDayCard Component
 *
 * Displays a motivational rest day card with benefits and optional workout override.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import GradientCard from '../common/GradientCard';
import { colors, gradients } from '../../theme/colors';
import { spacing } from '../../theme/typography';

interface RestDayCardProps {
  onStartWorkoutAnyway: () => void;
}

export default function RestDayCard({ onStartWorkoutAnyway }: RestDayCardProps) {
  return (
    <GradientCard
      gradient={gradients.card}
      style={styles.restDayCard}
      accessibilityLabel="Rest Day - No workout scheduled"
    >
      <View style={styles.restDayContent}>
        {/* Rest Day Icon */}
        <View style={styles.restDayIconContainer}>
          <Text style={styles.restDayIcon}>🧘</Text>
        </View>

        {/* Rest Day Header */}
        <Text variant="headlineLarge" style={styles.restDayTitle}>
          Rest Day
        </Text>

        <Text variant="bodyMedium" style={styles.restDayMessage}>
          Recovery is just as important as training. Your body needs time to adapt and grow
          stronger.
        </Text>

        {/* Rest Day Benefits */}
        <View style={styles.restDayBenefits}>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>💪</Text>
            <Text variant="bodySmall" style={styles.benefitText}>
              Muscle repair & growth
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>⚡</Text>
            <Text variant="bodySmall" style={styles.benefitText}>
              Energy restoration
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🧠</Text>
            <Text variant="bodySmall" style={styles.benefitText}>
              Mental recovery
            </Text>
          </View>
        </View>

        {/* Optional: Start Workout Anyway */}
        <View style={styles.restDayActions}>
          <Text variant="bodySmall" style={styles.restDayActionHint}>
            Feeling great? You can still train today
          </Text>
          <Button
            mode="outlined"
            onPress={onStartWorkoutAnyway}
            style={styles.swapFromRestButton}
            icon="dumbbell"
            accessibilityLabel="Start workout anyway"
          >
            Start Workout Anyway
          </Button>
        </View>
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  restDayCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  restDayContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  restDayIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.main + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  restDayIcon: {
    fontSize: 48,
  },
  restDayTitle: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  restDayMessage: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  restDayBenefits: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colors.effects.divider,
    borderBottomColor: colors.effects.divider,
    width: '100%',
    justifyContent: 'space-around',
  },
  benefitItem: {
    alignItems: 'center',
    flex: 1,
  },
  benefitIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  benefitText: {
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 12,
  },
  restDayActions: {
    alignItems: 'center',
    width: '100%',
  },
  restDayActionHint: {
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  swapFromRestButton: {
    borderColor: colors.primary.main,
    borderWidth: 1.5,
  },
});
