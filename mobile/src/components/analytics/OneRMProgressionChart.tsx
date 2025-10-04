/**
 * 1RM Progression Chart Component (T063)
 *
 * Line chart displaying estimated one-rep max progression over time.
 * Uses Epley formula with RIR adjustment: 1RM = weight × (1 + (reps - rir) / 30)
 *
 * Features:
 * - Exercise selector dropdown
 * - X-axis: dates, Y-axis: estimated 1RM (kg)
 * - Loading states and error handling
 * - Custom SVG-based line chart implementation
 */

import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  Surface,
  Text,
  Menu,
  Button,
  ActivityIndicator,
  useTheme,
  MD3Theme,
} from 'react-native-paper';
import { Svg, Line, Circle, Text as SvgText, Polyline } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { use1RMProgression, OneRMDataPoint } from '../../services/api/analyticsApi';
import { colors } from '../../theme/colors';
import { ChartSkeleton } from '../skeletons';
import { useSettingsStore } from '../../stores/settingsStore';
import { fromBackendWeight, getUnitLabel } from '../../utils/unitConversion';

const CHART_WIDTH = Dimensions.get('window').width - 64; // Account for padding
const CHART_HEIGHT = 250;
const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

/**
 * Sample exercises for the selector
 * In production, this would come from the exercises database
 */
const SAMPLE_EXERCISES = [
  { id: 1, name: 'Barbell Bench Press' },
  { id: 2, name: 'Barbell Back Squat' },
  { id: 3, name: 'Conventional Deadlift' },
  { id: 4, name: 'Overhead Press' },
  { id: 5, name: 'Barbell Row' },
];

interface OneRMProgressionChartProps {
  startDate: string;
  endDate: string;
}

export function OneRMProgressionChart({
  startDate,
  endDate,
}: OneRMProgressionChartProps): React.JSX.Element {
  const theme = useTheme();
  const { weightUnit } = useSettingsStore();
  const [selectedExercise, setSelectedExercise] = useState(SAMPLE_EXERCISES[0]);
  const [menuVisible, setMenuVisible] = useState(false);

  // Fetch 1RM progression data
  const { data, isLoading, error } = use1RMProgression(selectedExercise.id, startDate, endDate);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const selectExercise = (exercise: (typeof SAMPLE_EXERCISES)[0]) => {
    setSelectedExercise(exercise);
    closeMenu();
  };

  return (
    <Surface style={styles.container} elevation={1}>
      {/* Exercise Selector */}
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerText}>
          Select Exercise
        </Text>
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <Button mode="outlined" onPress={openMenu} style={styles.selector}>
              {selectedExercise.name}
            </Button>
          }
        >
          {SAMPLE_EXERCISES.map((exercise) => (
            <Menu.Item
              key={exercise.id}
              onPress={() => selectExercise(exercise)}
              title={exercise.name}
              leadingIcon={selectedExercise.id === exercise.id ? 'check' : undefined}
            />
          ))}
        </Menu>
      </View>

      {/* Chart Content */}
      {isLoading && <ChartSkeleton height={CHART_HEIGHT} showLegend={false} />}

      {error && (
        <View style={styles.centerContent}>
          <Text variant="bodyMedium" style={styles.errorText}>
            Error loading progression data
          </Text>
          <Text variant="bodySmall" style={styles.errorSubtext}>
            {error.message}
          </Text>
        </View>
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="chart-line-variant"
            size={64}
            color={colors.text.disabled}
          />
          <Text variant="bodyMedium" style={styles.emptyText}>
            No progression data available
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Start logging workouts to track your 1RM progression
          </Text>
        </View>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <LineChart data={data} theme={theme} weightUnit={weightUnit} />
      )}
    </Surface>
  );
}

/**
 * Line Chart Component
 */
interface LineChartProps {
  data: OneRMDataPoint[];
  theme: MD3Theme;
  weightUnit: 'kg' | 'lbs';
}

function LineChart({ data, theme, weightUnit }: LineChartProps): React.JSX.Element {
  const unitLabel = getUnitLabel(weightUnit);
  // Calculate chart dimensions
  const chartWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  // Convert all values to display units
  const valuesInDisplayUnit = data.map((d) => fromBackendWeight(d.estimated_1rm, weightUnit));
  const minValue = Math.floor(Math.min(...valuesInDisplayUnit) * 0.9); // 10% padding
  const maxValue = Math.ceil(Math.max(...valuesInDisplayUnit) * 1.1); // 10% padding
  const valueRange = maxValue - minValue;

  // Calculate point positions (using display unit values)
  const points = data.map((point, index) => {
    const valueInDisplayUnit = fromBackendWeight(point.estimated_1rm, weightUnit);
    const x = PADDING.left + (index / (data.length - 1)) * chartWidth;
    const y =
      PADDING.top + chartHeight - ((valueInDisplayUnit - minValue) / valueRange) * chartHeight;
    return { x, y, value: valueInDisplayUnit, date: point.date };
  });

  // Create polyline path for the line
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Format date for display (show month-day)
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minValue + (valueRange * i) / 4;
    const y = PADDING.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
    return { value: Math.round(value), y };
  });

  return (
    <View style={styles.chartContainer}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Y-axis grid lines */}
        {yTicks.map((tick, i) => (
          <React.Fragment key={i}>
            <Line
              x1={PADDING.left}
              y1={tick.y}
              x2={CHART_WIDTH - PADDING.right}
              y2={tick.y}
              stroke="#e0e0e0"
              strokeWidth="1"
            />
            <SvgText
              x={PADDING.left - 10}
              y={tick.y + 5}
              fontSize="10"
              fill="#666"
              textAnchor="end"
            >
              {tick.value}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Line chart */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={theme.colors.primary}
          strokeWidth="3"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="5"
            fill={theme.colors.primary}
            stroke="#fff"
            strokeWidth="2"
          />
        ))}

        {/* X-axis labels (show first, middle, last) */}
        {[0, Math.floor(points.length / 2), points.length - 1].map((index) => {
          const point = points[index];
          return (
            <SvgText
              key={index}
              x={point.x}
              y={CHART_HEIGHT - PADDING.bottom + 20}
              fontSize="10"
              fill="#666"
              textAnchor="middle"
            >
              {formatDate(point.date)}
            </SvgText>
          );
        })}

        {/* Y-axis label */}
        <SvgText
          x={15}
          y={CHART_HEIGHT / 2}
          fontSize="12"
          fill="#666"
          textAnchor="middle"
          transform={`rotate(-90, 15, ${CHART_HEIGHT / 2})`}
        >
          1RM ({unitLabel})
        </SvgText>
      </Svg>

      {/* Summary Statistics */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            Current
          </Text>
          <Text variant="titleMedium" style={styles.summaryValue}>
            {Math.round(points[points.length - 1].value)} {unitLabel}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            Change
          </Text>
          <Text
            variant="titleMedium"
            style={[
              styles.summaryValue,
              {
                color: points[points.length - 1].value > points[0].value ? '#22c55e' : '#ef4444',
              },
            ]}
          >
            {points[points.length - 1].value > points[0].value ? '+' : ''}
            {Math.round(points[points.length - 1].value - points[0].value)} {unitLabel}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            Best
          </Text>
          <Text variant="titleMedium" style={styles.summaryValue}>
            {Math.round(Math.max(...valuesInDisplayUnit))} {unitLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.secondary, // #1A1F3A - soft dark
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerText: {
    marginBottom: 8,
    color: '#666',
  },
  selector: {
    alignSelf: 'flex-start',
  },
  centerContent: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 4,
  },
  errorSubtext: {
    color: '#666',
  },
  emptyText: {
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  chartContainer: {
    marginTop: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#999',
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: '600',
  },
});
