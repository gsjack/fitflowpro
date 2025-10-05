/**
 * Body Weight Chart
 * Line chart displaying body weight progression over time
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Surface, Text, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { Svg, Line, Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { getBodyWeightHistory, type BodyWeightEntry } from '../../services/api/bodyWeightApi';
import { getToken } from '../../services/api/authApi';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 280;
const PADDING = { top: 30, right: 30, bottom: 50, left: 50 };

type DateRange = '30' | '90' | '365';

interface BodyWeightChartProps {
  unit?: 'kg' | 'lbs';
}

/**
 * Format weight based on unit
 */
function formatWeight(weightKg: number, unit: 'kg' | 'lbs'): number {
  if (unit === 'lbs') {
    return Number((weightKg * 2.20462).toFixed(1));
  }
  return Number(weightKg.toFixed(1));
}

/**
 * Calculate linear regression for trend line
 */
function calculateTrendLine(data: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  const sumX = data.reduce((sum, point) => sum + point.x, 0);
  const sumY = data.reduce((sum, point) => sum + point.y, 0);
  const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export default function BodyWeightChart({ unit = 'kg' }: BodyWeightChartProps) {
  const [dateRange, setDateRange] = useState<DateRange>('90');

  // Fetch body weight history
  const {
    data: entries,
    isLoading,
    error,
  } = useQuery<BodyWeightEntry[]>({
    queryKey: ['bodyWeight', 'history', dateRange],
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      return getBodyWeightHistory(token, parseInt(dateRange, 10));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Process data for chart
  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) return null;

    // Reverse to get chronological order (API returns DESC)
    const chronological = [...entries].reverse();

    // Convert to chart coordinates
    const points = chronological.map((entry, index) => ({
      x: index,
      y: formatWeight(entry.weight_kg, unit),
      date: entry.date,
    }));

    // Calculate bounds
    const yValues = points.map((p) => p.y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const yRange = maxY - minY || 1; // Prevent division by zero

    // Add padding to Y axis
    const yMin = minY - yRange * 0.1;
    const yMax = maxY + yRange * 0.1;

    // Scale points to chart dimensions
    const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const scaledPoints = points.map((point) => ({
      ...point,
      sx: PADDING.left + (point.x / (points.length - 1 || 1)) * plotWidth,
      sy: PADDING.top + ((yMax - point.y) / (yMax - yMin)) * plotHeight,
    }));

    // Calculate trend line
    const trendData = points.map((p, i) => ({ x: i, y: p.y }));
    const { slope, intercept } = calculateTrendLine(trendData);

    const trendPoints = [
      {
        x: 0,
        y: intercept,
        sx: PADDING.left,
        sy: PADDING.top + ((yMax - intercept) / (yMax - yMin)) * plotHeight,
      },
      {
        x: points.length - 1,
        y: slope * (points.length - 1) + intercept,
        sx: PADDING.left + plotWidth,
        sy:
          PADDING.top +
          ((yMax - (slope * (points.length - 1) + intercept)) / (yMax - yMin)) * plotHeight,
      },
    ];

    // Calculate statistics
    const latest = yValues[yValues.length - 1];
    const first = yValues[0];
    const average = yValues.reduce((a, b) => a + b, 0) / yValues.length;
    const change = latest - first;
    const percentChange = (change / first) * 100;

    return {
      points: scaledPoints,
      trendPoints,
      yMin,
      yMax,
      stats: {
        latest,
        first,
        average,
        change,
        percentChange,
        totalEntries: entries.length,
      },
    };
  }, [entries, unit]);

  // Loading state
  if (isLoading) {
    return (
      <Surface style={styles.container} elevation={2}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading weight data...
          </Text>
        </View>
      </Surface>
    );
  }

  // Error state
  if (error) {
    return (
      <Surface style={styles.container} elevation={2}>
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.errorText}>
            Failed to load weight data
          </Text>
          <Text variant="bodySmall" style={styles.errorSubtext}>
            {error instanceof Error ? error.message : 'Unknown error'}
          </Text>
        </View>
      </Surface>
    );
  }

  // Empty state
  if (!entries || entries.length === 0) {
    return (
      <Surface style={styles.container} elevation={2}>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>
            Body Weight Progression
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            No weight data yet
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Start logging your weight to see progress
          </Text>
        </View>
      </Surface>
    );
  }

  if (!chartData) return null;

  const { points, trendPoints, yMin, yMax, stats } = chartData;

  return (
    <Surface style={styles.container} elevation={2}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          Body Weight Progression
        </Text>
      </View>

      {/* Date Range Selector */}
      <View style={styles.dateRangeContainer}>
        <SegmentedButtons
          value={dateRange}
          onValueChange={(value) => setDateRange(value)}
          buttons={[
            { value: '30', label: '30d' },
            { value: '90', label: '90d' },
            { value: '365', label: '1y' },
          ]}
          density="small"
        />
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>
            Latest
          </Text>
          <Text variant="titleMedium" style={styles.statValue}>
            {stats.latest} {unit}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>
            Change
          </Text>
          <Text
            variant="titleMedium"
            style={[
              styles.statValue,
              {
                color:
                  stats.change > 0
                    ? colors.error.main
                    : stats.change < 0
                      ? colors.success.main
                      : colors.text.primary,
              },
            ]}
          >
            {stats.change > 0 ? '+' : ''}
            {stats.change.toFixed(1)} {unit}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="bodySmall" style={styles.statLabel}>
            Average
          </Text>
          <Text variant="titleMedium" style={styles.statValue}>
            {stats.average.toFixed(1)} {unit}
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = PADDING.top + (CHART_HEIGHT - PADDING.top - PADDING.bottom) * ratio;
            const value = yMax - (yMax - yMin) * ratio;
            return (
              <React.Fragment key={ratio}>
                <Line
                  x1={PADDING.left}
                  y1={y}
                  x2={CHART_WIDTH - PADDING.right}
                  y2={y}
                  stroke={colors.text.disabled}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity={0.3}
                />
                <SvgText
                  x={PADDING.left - 10}
                  y={y + 5}
                  fill={colors.text.secondary}
                  fontSize="10"
                  textAnchor="end"
                >
                  {value.toFixed(1)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Trend line */}
          <Line
            x1={trendPoints[0].sx}
            y1={trendPoints[0].sy}
            x2={trendPoints[1].sx}
            y2={trendPoints[1].sy}
            stroke={colors.primary.light}
            strokeWidth="2"
            strokeDasharray="6 3"
            opacity={0.6}
          />

          {/* Data line */}
          <Polyline
            points={points.map((p) => `${p.sx},${p.sy}`).join(' ')}
            fill="none"
            stroke={colors.primary.main}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.sx}
              cy={point.sy}
              r="4"
              fill={colors.primary.main}
              stroke={colors.background.secondary}
              strokeWidth="2"
            />
          ))}

          {/* X-axis labels (first, middle, last) */}
          {[0, Math.floor(points.length / 2), points.length - 1].map((index) => {
            if (index >= points.length) return null;
            const point = points[index];
            const date = new Date(point.date);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <SvgText
                key={index}
                x={point.sx}
                y={CHART_HEIGHT - PADDING.bottom + 20}
                fill={colors.text.secondary}
                fontSize="10"
                textAnchor="middle"
              >
                {label}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      {/* Footer info */}
      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerText}>
          {stats.totalEntries} entries • Trend:{' '}
          {stats.change > 0 ? '↑' : stats.change < 0 ? '↓' : '→'}{' '}
          {Math.abs(stats.percentChange).toFixed(1)}%
        </Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  dateRangeContainer: {
    marginBottom: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.text.tertiary,
  },
  footerText: {
    color: colors.text.secondary,
  },
  loadingContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
  },
  emptyContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    color: colors.text.disabled,
  },
  errorText: {
    color: colors.error.main,
    marginBottom: spacing.xs,
  },
  errorSubtext: {
    color: colors.text.secondary,
  },
});
