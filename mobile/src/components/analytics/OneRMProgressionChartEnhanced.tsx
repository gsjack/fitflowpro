/**
 * Enhanced 1RM Progression Chart Component (T083)
 *
 * Line chart showing estimated 1RM over time with trend analysis and export functionality.
 *
 * Features:
 * - Line chart with workout date points
 * - Trend line (linear regression or moving average)
 * - Latest 1RM prominently displayed
 * - % increase from first to latest
 * - Tap points to see date, weight, reps, RIR
 * - Export/share chart as image
 * - Weeks selector (4, 8, 12, 26, 52)
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Alert } from 'react-native';
import { Surface, Text, Button, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { Svg, Line, Circle, Text as SvgText, Polyline } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO, subWeeks } from 'date-fns';
import { use1RMProgression, OneRMDataPoint } from '../../services/api/analyticsApi';
import { colors } from '../../theme/colors';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 280;
const PADDING = { top: 20, right: 20, bottom: 60, left: 50 };

const WEEKS_OPTIONS = [
  { value: 4, label: '4w' },
  { value: 8, label: '8w' },
  { value: 12, label: '12w' },
  { value: 26, label: '26w' },
  { value: 52, label: '1y' },
];

export interface OneRMProgressionChartEnhancedProps {
  exerciseId: number;
  exerciseName: string;
  weeks?: number; // Default 12
}

export function OneRMProgressionChartEnhanced({
  exerciseId,
  exerciseName,
  weeks: initialWeeks = 12,
}: OneRMProgressionChartEnhancedProps): React.JSX.Element {
  const theme = useTheme();
  const [selectedWeeks, setSelectedWeeks] = useState(initialWeeks);

  // Calculate date range
  const endDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const startDate = useMemo(
    () => subWeeks(new Date(), selectedWeeks).toISOString().split('T')[0],
    [selectedWeeks]
  );

  // Fetch 1RM progression data
  const { data, isLoading, error } = use1RMProgression(exerciseId, startDate, endDate);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!data || data.length === 0) return null;

    const values = data.map((d) => d.estimated_1rm);
    const latest = values[values.length - 1];
    const first = values[0];
    const increase = latest - first;
    const percentIncrease = (increase / first) * 100;
    const best = Math.max(...values);

    return {
      latest: Math.round(latest * 10) / 10,
      first: Math.round(first * 10) / 10,
      increase: Math.round(increase * 10) / 10,
      percentIncrease: Math.round(percentIncrease * 10) / 10,
      best: Math.round(best * 10) / 10,
    };
  }, [data]);

  const handleExport = () => {
    // TODO: Implement share/export functionality
    // This would use react-native-share or expo-sharing to share the chart as an image
    Alert.alert('Export', 'Chart export feature coming soon!');
  };

  return (
    <Surface style={styles.container} elevation={1}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="titleLarge" style={styles.title}>
            {exerciseName}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            1RM Progression
          </Text>
        </View>
        <Button
          mode="outlined"
          onPress={handleExport}
          icon="share-variant"
          compact
          style={styles.exportButton}
        >
          Share
        </Button>
      </View>

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

      {/* Latest 1RM Display */}
      {statistics && (
        <View style={styles.latestContainer}>
          <Text variant="headlineLarge" style={styles.latestValue}>
            {statistics.latest} kg
          </Text>
          <View style={styles.changeContainer}>
            <MaterialCommunityIcons
              name={statistics.increase >= 0 ? 'arrow-up' : 'arrow-down'}
              size={20}
              color={statistics.increase >= 0 ? colors.success.main : colors.error.main}
            />
            <Text
              variant="titleMedium"
              style={[
                styles.changeText,
                { color: statistics.increase >= 0 ? colors.success.main : colors.error.main },
              ]}
            >
              {statistics.increase >= 0 ? '+' : ''}
              {statistics.increase} kg ({statistics.percentIncrease >= 0 ? '+' : ''}
              {statistics.percentIncrease}%)
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.changeSubtext}>
            from {selectedWeeks} weeks ago
          </Text>
        </View>
      )}

      {/* Chart Content */}
      {isLoading && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading progression data...
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error.main} />
          <Text variant="bodyMedium" style={styles.errorText}>
            Error loading progression data
          </Text>
          <Text variant="bodySmall" style={styles.errorSubtext}>
            {error.message}
          </Text>
        </View>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="chart-line-variant"
            size={64}
            color={colors.text.disabled}
          />
          <Text variant="bodyMedium" style={styles.emptyText}>
            Complete at least 2 workouts to see progression
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Start logging sets for {exerciseName}
          </Text>
        </View>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <LineChart data={data} theme={theme} />
      )}

      {/* Summary Stats */}
      {statistics && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Current
            </Text>
            <Text variant="titleMedium" style={styles.summaryValue}>
              {statistics.latest} kg
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Best
            </Text>
            <Text variant="titleMedium" style={styles.summaryValue}>
              {statistics.best} kg
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Total Gain
            </Text>
            <Text
              variant="titleMedium"
              style={[
                styles.summaryValue,
                { color: statistics.increase >= 0 ? colors.success.main : colors.error.main },
              ]}
            >
              {statistics.increase >= 0 ? '+' : ''}
              {statistics.increase} kg
            </Text>
          </View>
        </View>
      )}
    </Surface>
  );
}

/**
 * Line Chart Component with Trend Line
 */
interface LineChartProps {
  data: OneRMDataPoint[];
  theme: any;
}

function LineChart({ data, theme }: LineChartProps): React.JSX.Element {
  // Calculate chart dimensions
  const chartWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  // Find min/max values for scaling
  const values = data.map((d) => d.estimated_1rm);
  const minValue = Math.floor(Math.min(...values) * 0.95); // 5% padding
  const maxValue = Math.ceil(Math.max(...values) * 1.05); // 5% padding
  const valueRange = maxValue - minValue;

  // Calculate point positions
  const points = data.map((point, index) => {
    const x = PADDING.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y =
      PADDING.top + chartHeight - ((point.estimated_1rm - minValue) / valueRange) * chartHeight;
    return { x, y, value: point.estimated_1rm, date: point.date };
  });

  // Calculate trend line (linear regression)
  const trendLine = useMemo(() => {
    if (points.length < 2) return null;

    // Simple linear regression
    const n = points.length;
    const sumX = points.reduce((sum, _, i) => sum + i, 0);
    const sumY = points.reduce((sum, p) => sum + p.value, 0);
    const sumXY = points.reduce((sum, p, i) => sum + i * p.value, 0);
    const sumXX = points.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate trend points
    const trendStart = {
      x: points[0].x,
      y:
        PADDING.top +
        chartHeight -
        ((intercept - minValue) / valueRange) * chartHeight,
    };
    const trendEnd = {
      x: points[points.length - 1].x,
      y:
        PADDING.top +
        chartHeight -
        ((slope * (points.length - 1) + intercept - minValue) / valueRange) * chartHeight,
    };

    return { start: trendStart, end: trendEnd };
  }, [points, chartHeight, minValue, valueRange]);

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

  // Y-axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minValue + (valueRange * i) / 4;
    const y = PADDING.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
    return { value: Math.round(value * 10) / 10, y };
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
              stroke={colors.chart.grid}
              strokeWidth="1"
            />
            <SvgText
              x={PADDING.left - 10}
              y={tick.y + 5}
              fontSize="10"
              fill={colors.chart.axis}
              textAnchor="end"
            >
              {tick.value}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Trend line (dashed) */}
        {trendLine && (
          <Line
            x1={trendLine.start.x}
            y1={trendLine.start.y}
            x2={trendLine.end.x}
            y2={trendLine.end.y}
            stroke={colors.warning.main}
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity={0.6}
          />
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
        {points.length > 0 &&
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
                  fill={colors.chart.axis}
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
          fill={colors.chart.axis}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${CHART_HEIGHT / 2})`}
        >
          1RM (kg)
        </SvgText>
      </Svg>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.text.secondary,
    marginTop: 4,
  },
  exportButton: {
    marginLeft: 8,
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
  latestContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.effects.divider,
    marginBottom: 16,
  },
  latestValue: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  changeText: {
    fontWeight: '600',
  },
  changeSubtext: {
    color: colors.text.secondary,
    marginTop: 4,
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
