/**
 * Weekly Consistency Calendar Component (T084)
 *
 * Calendar heatmap showing workout completion over time (GitHub contribution graph style).
 *
 * Features:
 * - Heatmap grid: Green squares for completed workouts, gray for rest days
 * - Intensity based on volume (darker green = more sets)
 * - Current week highlighted
 * - Tap day to see workout summary
 * - Streak counter and weekly average
 * - Month labels
 * - Horizontal scrolling for many weeks
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Surface, Text, Portal, Dialog, Paragraph, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO, startOfWeek, addDays, isSameDay, differenceInDays } from 'date-fns';
import { useConsistencyMetrics } from '../../services/api/analyticsApi';
import { colors } from '../../theme/colors';

const SQUARE_SIZE = 14;
const SQUARE_GAP = 3;
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface WeeklyConsistencyCalendarProps {
  weeks?: number; // Default 12
}

interface DayData {
  date: Date;
  workoutCompleted: boolean;
  sets: number;
  duration: number; // in minutes
}

export function WeeklyConsistencyCalendar({
  weeks = 12,
}: WeeklyConsistencyCalendarProps): React.JSX.Element {
  const theme = useTheme();
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  // Fetch consistency metrics
  const { data: metrics, isLoading, error } = useConsistencyMetrics();

  // Generate calendar data (mock data - in production, fetch from API)
  const calendarData = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(addDays(today, -weeks * 7));
    const days: DayData[] = [];

    for (let i = 0; i < weeks * 7; i++) {
      const date = addDays(startDate, i);
      // Mock data - in production, fetch actual workout data
      const isToday = isSameDay(date, today);
      const dayOfWeek = date.getDay();
      // Simulate workout pattern: more likely on weekdays, random completion
      const workoutCompleted = !isToday && Math.random() > (dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 0.3);
      const sets = workoutCompleted ? Math.floor(Math.random() * 20) + 5 : 0;
      const duration = workoutCompleted ? Math.floor(Math.random() * 60) + 30 : 0;

      days.push({ date, workoutCompleted, sets, duration });
    }

    return days;
  }, [weeks]);

  // Calculate streak
  const streak = useMemo(() => {
    let currentStreak = 0;
    const today = new Date();

    // Count backwards from today
    for (let i = calendarData.length - 1; i >= 0; i--) {
      const day = calendarData[i];
      if (isSameDay(day.date, today) || day.date > today) continue;

      if (day.workoutCompleted) {
        currentStreak++;
      } else {
        break;
      }
    }

    return currentStreak;
  }, [calendarData]);

  // Calculate last workout
  const lastWorkout = useMemo(() => {
    const today = new Date();
    for (let i = calendarData.length - 1; i >= 0; i--) {
      const day = calendarData[i];
      if (day.workoutCompleted && day.date <= today) {
        return differenceInDays(today, day.date);
      }
    }
    return null;
  }, [calendarData]);

  // Calculate weekly average
  const weeklyAverage = useMemo(() => {
    const completedWorkouts = calendarData.filter((d) => d.workoutCompleted).length;
    return (completedWorkouts / weeks).toFixed(1);
  }, [calendarData, weeks]);

  // Get intensity color based on sets
  const getIntensityColor = (sets: number): string => {
    if (sets === 0) return colors.background.tertiary; // Gray for no workout
    if (sets < 10) return `${colors.success.main}40`; // Light green
    if (sets < 15) return `${colors.success.main}70`; // Medium green
    if (sets < 20) return `${colors.success.main}A0`; // Dark green
    return colors.success.main; // Full green
  };

  // Handle day press
  const handleDayPress = (day: DayData) => {
    setSelectedDay(day);
    setDialogVisible(true);
  };

  // Group days by week
  const weekGroups = useMemo(() => {
    const groups: DayData[][] = [];
    for (let i = 0; i < calendarData.length; i += 7) {
      groups.push(calendarData.slice(i, i + 7));
    }
    return groups;
  }, [calendarData]);

  // Get month labels for the calendar
  const monthLabels = useMemo(() => {
    const labels: Array<{ month: string; weekIndex: number }> = [];
    let lastMonth = '';

    weekGroups.forEach((week, index) => {
      const firstDay = week[0];
      const month = format(firstDay.date, 'MMM');
      if (month !== lastMonth) {
        labels.push({ month, weekIndex: index });
        lastMonth = month;
      }
    });

    return labels;
  }, [weekGroups]);

  return (
    <Surface style={styles.container} elevation={1}>
      {/* Header */}
      <Text variant="titleLarge" style={styles.title}>
        Consistency
      </Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {streak > 0 ? (
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="fire" size={24} color={colors.warning.main} />
            <Text variant="titleMedium" style={styles.statValue}>
              {streak}-day streak!
            </Text>
          </View>
        ) : lastWorkout !== null ? (
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.text.secondary} />
            <Text variant="bodyMedium" style={styles.statLabel}>
              Last workout: {lastWorkout} {lastWorkout === 1 ? 'day' : 'days'} ago
            </Text>
          </View>
        ) : (
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="calendar-question"
              size={24}
              color={colors.text.secondary}
            />
            <Text variant="bodyMedium" style={styles.statLabel}>
              No workouts logged
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="chart-bar" size={20} color={colors.text.secondary} />
          <Text variant="bodyMedium" style={styles.statLabel}>
            Weekly average: {weeklyAverage} workouts
          </Text>
        </View>
      </View>

      {/* Calendar Heatmap */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.calendarScroll}
        contentContainerStyle={styles.calendarContent}
      >
        <View>
          {/* Month Labels */}
          <View style={styles.monthLabelsRow}>
            {monthLabels.map((label, index) => (
              <Text
                key={index}
                style={[
                  styles.monthLabel,
                  { left: label.weekIndex * (SQUARE_SIZE + SQUARE_GAP) },
                ]}
              >
                {label.month}
              </Text>
            ))}
          </View>

          {/* Day Labels */}
          <View style={styles.calendarGrid}>
            <View style={styles.dayLabelsColumn}>
              {DAYS_OF_WEEK.map((day, index) => (
                <Text key={index} style={styles.dayLabel}>
                  {day[0]}
                </Text>
              ))}
            </View>

            {/* Weeks Grid */}
            <View style={styles.weeksContainer}>
              {weekGroups.map((week, weekIndex) => (
                <View key={weekIndex} style={styles.weekColumn}>
                  {week.map((day, dayIndex) => {
                    const isToday = isSameDay(day.date, new Date());
                    const intensity = getIntensityColor(day.sets);

                    return (
                      <TouchableOpacity
                        key={dayIndex}
                        onPress={() => handleDayPress(day)}
                        style={[
                          styles.daySquare,
                          { backgroundColor: intensity },
                          isToday && styles.todaySquare,
                        ]}
                        accessibilityLabel={`${format(day.date, 'MMM d, yyyy')}${day.workoutCompleted ? `, ${day.sets} sets completed` : ', rest day'}`}
                        accessibilityRole="button"
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <Text variant="bodySmall" style={styles.legendLabel}>
              Less
            </Text>
            {[0, 5, 10, 15, 20].map((sets, index) => (
              <View
                key={index}
                style={[
                  styles.legendSquare,
                  { backgroundColor: getIntensityColor(sets) },
                ]}
              />
            ))}
            <Text variant="bodySmall" style={styles.legendLabel}>
              More
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Day Detail Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>
            {selectedDay && format(selectedDay.date, 'EEEE, MMMM d, yyyy')}
          </Dialog.Title>
          <Dialog.Content>
            {selectedDay?.workoutCompleted ? (
              <>
                <View style={styles.dialogRow}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color={colors.success.main}
                  />
                  <Paragraph style={styles.dialogText}>Workout completed</Paragraph>
                </View>
                <View style={styles.dialogRow}>
                  <MaterialCommunityIcons
                    name="weight-lifter"
                    size={20}
                    color={colors.text.secondary}
                  />
                  <Paragraph style={styles.dialogText}>{selectedDay.sets} sets logged</Paragraph>
                </View>
                <View style={styles.dialogRow}>
                  <MaterialCommunityIcons name="clock" size={20} color={colors.text.secondary} />
                  <Paragraph style={styles.dialogText}>
                    {selectedDay.duration} minutes duration
                  </Paragraph>
                </View>
              </>
            ) : (
              <View style={styles.dialogRow}>
                <MaterialCommunityIcons
                  name="sleep"
                  size={20}
                  color={colors.text.secondary}
                />
                <Paragraph style={styles.dialogText}>Rest day</Paragraph>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    marginBottom: 16,
  },
  title: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  statLabel: {
    color: colors.text.secondary,
  },
  calendarScroll: {
    marginTop: 16,
  },
  calendarContent: {
    paddingRight: 16,
  },
  monthLabelsRow: {
    height: 20,
    position: 'relative',
    marginBottom: 8,
    marginLeft: 30, // Offset for day labels
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 10,
    color: colors.text.secondary,
  },
  calendarGrid: {
    flexDirection: 'row',
  },
  dayLabelsColumn: {
    justifyContent: 'space-between',
    marginRight: 8,
    paddingVertical: SQUARE_GAP,
  },
  dayLabel: {
    fontSize: 10,
    color: colors.text.secondary,
    height: SQUARE_SIZE,
    lineHeight: SQUARE_SIZE,
    textAlign: 'right',
    width: 20,
  },
  weeksContainer: {
    flexDirection: 'row',
    gap: SQUARE_GAP,
  },
  weekColumn: {
    gap: SQUARE_GAP,
  },
  daySquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: 2,
  },
  todaySquare: {
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
    marginLeft: 30, // Align with calendar
  },
  legendLabel: {
    color: colors.text.secondary,
    fontSize: 10,
  },
  legendSquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: 2,
  },
  dialogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dialogText: {
    color: colors.text.primary,
  },
});
