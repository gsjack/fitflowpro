/**
 * VO2maxProgressionChart Component (T088)
 *
 * Line chart displaying VO2max progression over time:
 * - Plot VO2max estimates from cardio sessions
 * - Differentiate Norwegian 4x4 vs Zone 2 with colors
 * - Show trend line and statistics
 * - Date range selector (1M, 3M, 6M, 1Y, All)
 * - Loading/error/empty states
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Surface, Text, SegmentedButtons } from 'react-native-paper';
import { Svg, Line, Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVO2maxProgression } from '../services/api/vo2maxApi';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/typography';
import { ChartSkeleton } from './skeletons';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 280;
const PADDING = { top: 30, right: 30, bottom: 50, left: 50 };

interface VO2maxProgressionChartProps {
  startDate?: string;
  endDate?: string;
}

type DateRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export default function VO2maxProgressionChart({
  startDate: initialStartDate,
  endDate: initialEndDate,
}: VO2maxProgressionChartProps) {
  const [dateRange, setDateRange] = useState<DateRange>('3M');

  // Calculate date range based on selection
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const endDate = initialEndDate || today.toISOString().split('T')[0];

    let startDate = initialStartDate;
    if (!startDate) {
      const start = new Date(today);
      switch (dateRange) {
        case '1M':
          start.setMonth(start.getMonth() - 1);
          break;
        case '3M':
          start.setMonth(start.getMonth() - 3);
          break;
        case '6M':
          start.setMonth(start.getMonth() - 6);
          break;
        case '1Y':
          start.setFullYear(start.getFullYear() - 1);
          break;
        case 'ALL':
          start.setFullYear(start.getFullYear() - 10); // 10 years back
          break;
      }
      startDate = start.toISOString().split('T')[0];
    }

    return { startDate, endDate };
  }, [dateRange, initialStartDate, initialEndDate]);

  // Fetch VO2max progression data
  const { data, isLoading, error } = useVO2maxProgression(startDate, endDate);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data?.sessions || data.sessions.length === 0) {
      return null;
    }

    const values = data.sessions.map((s) => s.estimated_vo2max);
    const latest = values[values.length - 1];
    const first = values[0];
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const change = latest - first;
    const percentChange = (change / first) * 100;

    return {
      latest,
      first,
      average,
      change,
      percentChange,
      totalSessions: data.sessions.length,
    };
  }, [data]);

  return (
    <Surface style={styles.container} elevation={2}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          VO2max Progression
        </Text>

        {/* Date Range Selector */}
        <SegmentedButtons
          value={dateRange}
          onValueChange={(value) => setDateRange(value)}
          density="small"
          buttons={[
            { value: '1M', label: '1M' },
            { value: '3M', label: '3M' },
            { value: '6M', label: '6M' },
            { value: '1Y', label: '1Y' },
            { value: 'ALL', label: 'All' },
          ]}
          theme={{
            colors: {
              secondaryContainer: colors.primary.main,
              onSecondaryContainer: colors.text.primary,
              surfaceVariant: colors.background.tertiary,
              onSurfaceVariant: colors.text.secondary,
            },
          }}
          style={styles.rangeSelector}
        />
      </View>

      {/* Loading State */}
      {isLoading && <ChartSkeleton height={CHART_HEIGHT} showLegend={true} />}

      {/* Error State */}
      {error && (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error.main} />
          <Text variant="bodyMedium" style={styles.errorText}>
            Error loading progression data
          </Text>
          <Text variant="bodySmall" style={styles.errorSubtext}>
            {error.message}
          </Text>
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!data?.sessions || data.sessions.length === 0) && (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="chart-line-variant"
            size={64}
            color={colors.text.disabled}
          />
          <Text variant="bodyMedium" style={styles.emptyText}>
            No cardio sessions yet
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Complete cardio sessions to track VO2max progression
          </Text>
        </View>
      )}

      {/* Chart + Stats */}
      {!isLoading && !error && data?.sessions && data.sessions.length > 0 && (
        <>
          <LineChart sessions={data.sessions} />

          {/* Statistics */}
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Latest
                </Text>
                <Text
                  variant="titleLarge"
                  style={[styles.statValue, { color: colors.primary.main }]}
                >
                  {stats.latest.toFixed(1)}
                </Text>
                <Text variant="bodySmall" style={styles.statUnit}>
                  ml/kg/min
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Change
                </Text>
                <Text
                  variant="titleLarge"
                  style={[
                    styles.statValue,
                    { color: stats.change >= 0 ? colors.success.main : colors.error.main },
                  ]}
                >
                  {stats.change >= 0 ? '+' : ''}
                  {stats.change.toFixed(1)}
                </Text>
                <Text variant="bodySmall" style={styles.statUnit}>
                  ({stats.percentChange >= 0 ? '+' : ''}
                  {stats.percentChange.toFixed(1)}%)
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Average
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {stats.average.toFixed(1)}
                </Text>
                <Text variant="bodySmall" style={styles.statUnit}>
                  ml/kg/min
                </Text>
              </View>

              <View style={styles.statBox}>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Sessions
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {stats.totalSessions}
                </Text>
                <Text variant="bodySmall" style={styles.statUnit}>
                  total
                </Text>
              </View>
            </View>
          )}

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.error.main }]} />
              <Text variant="bodySmall" style={styles.legendText}>
                Norwegian 4x4
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success.main }]} />
              <Text variant="bodySmall" style={styles.legendText}>
                Zone 2
              </Text>
            </View>
          </View>
        </>
      )}
    </Surface>
  );
}

/**
 * Line Chart Component
 */
interface LineChartProps {
  sessions: Array<{
    date: string;
    estimated_vo2max: number;
    protocol_type: 'norwegian_4x4' | 'zone2';
  }>;
}

function LineChart({ sessions }: LineChartProps): React.JSX.Element {
  const chartWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  // Find min/max values for scaling
  const values = sessions.map((s) => s.estimated_vo2max);
  const minValue = Math.floor(Math.min(...values) * 0.95); // 5% padding
  const maxValue = Math.ceil(Math.max(...values) * 1.05); // 5% padding
  const valueRange = maxValue - minValue;

  // Calculate point positions
  const points = sessions.map((session, index) => {
    const x = PADDING.left + (index / (sessions.length - 1 || 1)) * chartWidth;
    const y =
      PADDING.top +
      chartHeight -
      ((session.estimated_vo2max - minValue) / valueRange) * chartHeight;
    return {
      x,
      y,
      value: session.estimated_vo2max,
      date: session.date,
      protocol: session.protocol_type,
    };
  });

  // Create polyline path for the trend line
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Y-axis ticks (5 levels)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minValue + (valueRange * i) / 4;
    const y = PADDING.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
    return { value: Math.round(value), y };
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.chartScrollView}>
      <View style={styles.chartContainer}>
        <Svg width={Math.max(CHART_WIDTH, points.length * 60)} height={CHART_HEIGHT}>
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
                strokeDasharray="4 4"
              />
              <SvgText
                x={PADDING.left - 10}
                y={tick.y + 4}
                fontSize="12"
                fill={colors.text.tertiary}
                textAnchor="end"
              >
                {tick.value}
              </SvgText>
            </React.Fragment>
          ))}

          {/* X-axis */}
          <Line
            x1={PADDING.left}
            y1={CHART_HEIGHT - PADDING.bottom}
            x2={CHART_WIDTH - PADDING.right}
            y2={CHART_HEIGHT - PADDING.bottom}
            stroke={colors.chart.axis}
            strokeWidth="2"
          />

          {/* Y-axis */}
          <Line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={CHART_HEIGHT - PADDING.bottom}
            stroke={colors.chart.axis}
            strokeWidth="2"
          />

          {/* Trend line */}
          {points.length > 1 && (
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={colors.primary.main}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="6"
              fill={point.protocol === 'norwegian_4x4' ? colors.error.main : colors.success.main}
              stroke={colors.background.primary}
              strokeWidth="2"
            />
          ))}

          {/* X-axis labels (show every nth point to avoid crowding) */}
          {points
            .filter((_, i) => i % Math.ceil(points.length / 5) === 0 || i === points.length - 1)
            .map((point, index) => (
              <SvgText
                key={index}
                x={point.x}
                y={CHART_HEIGHT - PADDING.bottom + 20}
                fontSize="11"
                fill={colors.text.tertiary}
                textAnchor="middle"
              >
                {formatDate(point.date)}
              </SvgText>
            ))}

          {/* Y-axis label */}
          <SvgText
            x={20}
            y={CHART_HEIGHT / 2}
            fontSize="13"
            fill={colors.text.secondary}
            textAnchor="middle"
            transform={`rotate(-90, 20, ${CHART_HEIGHT / 2})`}
            fontWeight="600"
          >
            VO2max (ml/kg/min)
          </SvgText>
        </Svg>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  rangeSelector: {
    marginBottom: spacing.sm,
  },
  centerContent: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.error.main,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  errorSubtext: {
    color: colors.text.tertiary,
  },
  emptyText: {
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  chartScrollView: {
    marginBottom: spacing.lg,
  },
  chartContainer: {
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  statValue: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statUnit: {
    color: colors.text.tertiary,
    fontSize: 10,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.effects.divider,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: colors.text.secondary,
  },
});
