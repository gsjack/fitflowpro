/**
 * DaySelectorTabs Component
 *
 * Horizontal scrollable tabs for selecting program training days.
 * Used in PlannerScreen to navigate between workout days.
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { colors } from '../../theme/colors';

interface ProgramDay {
  id: number;
  day_name: string;
}

interface DaySelectorTabsProps {
  programDays: ProgramDay[];
  selectedDayId: number | null;
  onSelectDay: (dayId: number) => void;
}

export default function DaySelectorTabs({
  programDays,
  selectedDayId,
  onSelectDay,
}: DaySelectorTabsProps) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Training Days
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
          {programDays.map((day) => (
            <Button
              key={day.id}
              mode={selectedDayId === day.id ? 'contained' : 'outlined'}
              onPress={() => onSelectDay(day.id)}
              style={styles.dayButton}
              compact
            >
              {day.day_name}
            </Button>
          ))}
        </ScrollView>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.background.secondary,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text.primary,
  },
  daysScroll: {
    marginTop: 8,
  },
  dayButton: {
    marginRight: 8,
  },
});
