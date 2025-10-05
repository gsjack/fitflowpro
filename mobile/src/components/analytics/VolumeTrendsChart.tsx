/**
 * Volume Trends Chart Component (T082)
 *
 * Line chart showing weekly volume over time with MEV/MAV/MRV threshold lines.
 * Supports multiple muscle groups with color-coded lines and filtering.
 *
 * Features:
 * - Line chart with weekly volume trends
 * - Dashed threshold lines for MEV, MAV, MRV
 * - Muscle group filter (Chips)
 * - Weeks selector (8, 12, 26, 52)
 * - Tap points to see exact values
 * - Loading skeleton and empty states
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Surface, Text, Chip, ActivityIndicator, useTheme, MD3Theme } from 'react-native-paper';
import { Svg, Line, Circle, Text as SvgText, Polyline } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useVolumeTrendsHistory } from '../../services/api/analyticsApi';
import { colors } from '../../theme/colors';
import { VOLUME_LANDMARKS, MuscleGroup } from '../../constants/volumeLandmarks';
import { ChartSkeleton } from '../skeletons';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 300;
const PADDING = { top: 20, right: 20, bottom: 60, left: 50 };

const WEEKS_OPTIONS = [
  { value: 8, label: '8 weeks' },
  { value: 12, label: '12 weeks' },
  { value: 26, label: '26 weeks' },
  { value: 52, label: '52 weeks' },
];

const MUSCLE_GROUPS: { value: MuscleGroup; label: string; color: string }[] = [
  { value: 'chest', label: 'Chest', color: colors.muscle.chest },
  { value: 'back_lats', label: 'Back', color: colors.muscle.back },
  { value: 'shoulders_side', label: 'Shoulders', color: colors.muscle.shoulders },
  { value: 'biceps', label: 'Biceps', color: colors.muscle.arms },
  { value: 'triceps', label: 'Triceps', color: colors.muscle.arms },
  { value: 'quads', label: 'Quads', color: colors.muscle.legs },
  { value: 'hamstrings', label: 'Hamstrings', color: colors.muscle.legs },
];

interface VolumeTrendsChartProps {
  muscleGroup?: string; // Optional filter
  weeks?: number; // Default 8, max 52
}

export function VolumeTrendsChart({
  muscleGroup: initialMuscleGroup,
  weeks: initialWeeks = 8,
}: VolumeTrendsChartProps): React.JSX.Element {
  const theme = useTheme();
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | undefined>(
    initialMuscleGroup as MuscleGroup | undefined
  );
  const [selectedWeeks, setSelectedWeeks] = useState(initialWeeks);

  // Fetch volume trends data
  const { data, isLoading, error } = useVolumeTrendsHistory(selectedWeeks, selectedMuscleGroup);

  // Process data for chart
  const chartData = useMemo(() => {
    if (!data || !data.weeks) return null;

    // If no muscle group selected, aggregate all muscle groups
    if (!selectedMuscleGroup) {
      return data.weeks.map((week) => ({
        weekStart: week.week_start,
        totalSets: week.muscle_groups.reduce((sum, mg) => sum + mg.completed_sets, 0),
      }));
    }

    // Filter for selected muscle group
    return data.weeks.map((week) => {
      const muscleGroupData = week.muscle_groups.find(
        (mg) => mg.muscle_group === selectedMuscleGroup
      );
      return {
        weekStart: week.week_start,
        totalSets: muscleGroupData?.completed_sets || 0,
      };
    });
  }, [data, selectedMuscleGroup]);

  const landmarks = selectedMuscleGroup ? VOLUME_LANDMARKS[selectedMuscleGroup] : null;

  return (
    <Surface style={styles.container} elevation={1}>
      {/* Title */}
      <Text variant="titleLarge" style={styles.title}>
        Volume Trends
      </Text>

      {/* Muscle Group Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <Chip
          selected={!selectedMuscleGroup}
          onPress={() => setSelectedMuscleGroup(undefined)}
          style={styles.chip}
          textStyle={styles.chipText}
        >
          All Muscles
        </Chip>
        {MUSCLE_GROUPS.map((mg) => (
          <Chip
            key={mg.value}
            selected={selectedMuscleGroup === mg.value}
            onPress={() => setSelectedMuscleGroup(mg.value)}
            style={styles.chip}
            textStyle={styles.chipText}
          >
            {mg.label}
          </Chip>
        ))}
      </ScrollView>

      {/* Weeks Selector */}
      <View style={styles.weeksSelector}>
        {WEEKS_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            selected={selectedWeeks === option.value}
            onPress={() => setSelectedWeeks(option.value)}
            style={styles.weeksChip}
            compact
          >
            {option.label}
          </Chip>
        ))}
      </View>

      {/* Chart Content */}
      {isLoading && <ChartSkeleton height={CHART_HEIGHT} showLegend={true} />}

      {error && (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error.main} />
          <Text variant="bodyMedium" style={styles.errorText}>
            Error loading volume data
          </Text>
          <Text variant="bodySmall" style={styles.errorSubtext}>
            {error.message}
          </Text>
        </View>
      )}

      {!isLoading && !error && (!chartData || chartData.length === 0) && (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="chart-line-variant"
            size={64}
            color={colors.text.disabled}
          />
          <Text variant="bodyMedium" style={styles.emptyText}>
            No volume data for this period
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Start logging workouts to see your volume trends
          </Text>
        </View>
      )}

      {!isLoading && !error && chartData && chartData.length > 0 && (
        <LineChart
          data={chartData}
          landmarks={landmarks}
          muscleGroup={selectedMuscleGroup}
          theme={theme}
        />
      )}

      {/* Legend */}
      {selectedMuscleGroup && landmarks && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: colors.success.main }]} />
            <Text variant="bodySmall">MEV: {landmarks.mev}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: colors.warning.main }]} />
            <Text variant="bodySmall">MAV: {landmarks.mav}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: colors.error.main }]} />
            <Text variant="bodySmall">MRV: {landmarks.mrv}</Text>
          </View>
        </View>
      )}
    </Surface>
  );
}

/**
 * Line Chart Component with Threshold Lines
 */
interface LineChartProps {
  data: Array<{ weekStart: string; totalSets: number }>;
  landmarks: { mev: number; mav: number; mrv: number } | null;
  muscleGroup: MuscleGroup | undefined;
  theme: MD3Theme;
}

function LineChart({ data, landmarks, muscleGroup, theme }: LineChartProps): React.JSX.Element {
  // Calculate chart dimensions
  const chartWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  // Find min/max values for scaling
  const values = data.map((d) => d.totalSets);
  const maxLandmark = landmarks ? landmarks.mrv : 0;
  const minValue = 0;
  const maxValue = Math.ceil(Math.max(...values, maxLandmark) * 1.1); // 10% padding
  const valueRange = maxValue - minValue;

  // Calculate point positions
  const points = data.map((point, index) => {
    const x = PADDING.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = PADDING.top + chartHeight - ((point.totalSets - minValue) / valueRange) * chartHeight;
    return { x, y, value: point.totalSets, weekStart: point.weekStart };
  });

  // Create polyline path for the line
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Format date for display
  const formatDate = (dateStr: string): string => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'MMM d');
    } catch {
      return dateStr;
    }
  };

  // Y-axis ticks
  const yTicks = [
    { value: minValue, y: PADDING.top + chartHeight },
    ...(landmarks
      ? [
          {
            value: landmarks.mev,
            y: PADDING.top + chartHeight - ((landmarks.mev - minValue) / valueRange) * chartHeight,
          },
          {
            value: landmarks.mav,
            y: PADDING.top + chartHeight - ((landmarks.mav - minValue) / valueRange) * chartHeight,
          },
          {
            value: landmarks.mrv,
            y: PADDING.top + chartHeight - ((landmarks.mrv - minValue) / valueRange) * chartHeight,
          },
        ]
      : []),
    { value: maxValue, y: PADDING.top },
  ];

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
              stroke={colors.chart.grid}
              strokeWidth="1"
              strokeDasharray={tick.value === 0 || tick.value === maxValue ? undefined : '5,5'}
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

        {/* Threshold Lines (MEV, MAV, MRV) */}
        {landmarks && (
          <>
            {/* MEV Line */}
            <Line
              x1={PADDING.left}
              y1={
                PADDING.top + chartHeight - ((landmarks.mev - minValue) / valueRange) * chartHeight
              }
              x2={CHART_WIDTH - PADDING.right}
              y2={
                PADDING.top + chartHeight - ((landmarks.mev - minValue) / valueRange) * chartHeight
              }
              stroke={colors.success.main}
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity={0.6}
            />
            {/* MAV Line */}
            <Line
              x1={PADDING.left}
              y1={
                PADDING.top + chartHeight - ((landmarks.mav - minValue) / valueRange) * chartHeight
              }
              x2={CHART_WIDTH - PADDING.right}
              y2={
                PADDING.top + chartHeight - ((landmarks.mav - minValue) / valueRange) * chartHeight
              }
              stroke={colors.warning.main}
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity={0.6}
            />
            {/* MRV Line */}
            <Line
              x1={PADDING.left}
              y1={
                PADDING.top + chartHeight - ((landmarks.mrv - minValue) / valueRange) * chartHeight
              }
              x2={CHART_WIDTH - PADDING.right}
              y2={
                PADDING.top + chartHeight - ((landmarks.mrv - minValue) / valueRange) * chartHeight
              }
              stroke={colors.error.main}
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity={0.6}
            />
          </>
        )}

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
        {data.length > 0 &&
          [0, Math.floor(points.length / 2), points.length - 1]
            .filter((index) => index < points.length)
            .map((index) => {
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
                  {formatDate(point.weekStart)}
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
          Sets per Week
        </SvgText>
      </Svg>

      {/* Summary Statistics */}
      {points.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Current
            </Text>
            <Text variant="titleMedium" style={styles.summaryValue}>
              {points[points.length - 1].value} sets
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Average
            </Text>
            <Text variant="titleMedium" style={styles.summaryValue}>
              {Math.round(points.reduce((sum, p) => sum + p.value, 0) / points.length)} sets
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Peak
            </Text>
            <Text variant="titleMedium" style={styles.summaryValue}>
              {Math.max(...values)} sets
            </Text>
          </View>
        </View>
      )}
    </View>
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
  filterContainer: {
    marginBottom: 12,
  },
  filterContent: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
  },
  weeksSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  weeksChip: {
    height: 32,
  },
  centerContent: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.error.main,
    marginTop: 16,
    marginBottom: 4,
  },
  errorSubtext: {
    color: colors.text.secondary,
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.effects.divider,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.effects.divider,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.text.secondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: '600',
    color: colors.text.primary,
  },
});
