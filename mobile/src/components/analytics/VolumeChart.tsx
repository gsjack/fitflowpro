/**
 * Volume Chart Component (T064)
 *
 * Bar chart displaying weekly volume trends with MEV/MAV/MRV threshold lines.
 * Color coding indicates volume zone:
 * - Green: MEV-MAV (optimal range)
 * - Yellow: MAV-MRV (approaching limit)
 * - Red: Under MEV or over MRV (under-training or overreaching)
 *
 * Based on Renaissance Periodization volume landmarks.
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
import { Svg, Rect, Line, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVolumeTrends, VolumeTrendDataPoint } from '../../services/api/analyticsApi';
import { MuscleGroup, VOLUME_LANDMARKS, getVolumeZone } from '../../constants/volumeLandmarks';
import { colors } from '../../theme/colors';
import { ChartSkeleton } from '../skeletons';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 280;
const PADDING = { top: 20, right: 20, bottom: 60, left: 50 };

/**
 * Muscle group options for the selector
 */
const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'back_lats', label: 'Back (Lats)' },
  { value: 'back_traps', label: 'Back (Traps)' },
  { value: 'shoulders_front', label: 'Shoulders (Front)' },
  { value: 'shoulders_side', label: 'Shoulders (Side)' },
  { value: 'shoulders_rear', label: 'Shoulders (Rear)' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'quads', label: 'Quadriceps' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'calves', label: 'Calves' },
  { value: 'abs', label: 'Abs' },
];

interface VolumeChartProps {
  startDate: string;
  endDate: string;
}

export function VolumeChart({ startDate, endDate }: VolumeChartProps): React.JSX.Element {
  const theme = useTheme();
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup>('chest');
  const [menuVisible, setMenuVisible] = useState(false);

  // Fetch volume trends data
  const { data, isLoading, error } = useVolumeTrends(selectedMuscleGroup, startDate, endDate);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const selectMuscleGroup = (muscleGroup: MuscleGroup) => {
    setSelectedMuscleGroup(muscleGroup);
    closeMenu();
  };

  const selectedLabel =
    MUSCLE_GROUPS.find((mg) => mg.value === selectedMuscleGroup)?.label || 'Unknown';

  return (
    <Surface style={styles.container} elevation={1}>
      {/* Muscle Group Selector */}
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerText}>
          Select Muscle Group
        </Text>
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <Button mode="outlined" onPress={openMenu} style={styles.selector}>
              {selectedLabel}
            </Button>
          }
        >
          {MUSCLE_GROUPS.map((mg) => (
            <Menu.Item
              key={mg.value}
              onPress={() => selectMuscleGroup(mg.value)}
              title={mg.label}
              leadingIcon={selectedMuscleGroup === mg.value ? 'check' : undefined}
            />
          ))}
        </Menu>
      </View>

      {/* Chart Content */}
      {isLoading && <ChartSkeleton height={CHART_HEIGHT} showLegend={true} />}

      {error && (
        <View style={styles.centerContent}>
          <Text variant="bodyMedium" style={styles.errorText}>
            Error loading volume data
          </Text>
          <Text variant="bodySmall" style={styles.errorSubtext}>
            {error.message}
          </Text>
        </View>
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="chart-bar" size={64} color={colors.text.disabled} />
          <Text variant="bodyMedium" style={styles.emptyText}>
            No volume data available
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Start logging workouts to track your weekly volume
          </Text>
        </View>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <BarChart data={data} muscleGroup={selectedMuscleGroup} theme={theme} />
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#22c55e' }]} />
          <Text variant="bodySmall">Optimal (MEV-MAV)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#eab308' }]} />
          <Text variant="bodySmall">High (MAV-MRV)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
          <Text variant="bodySmall">Under/Over</Text>
        </View>
      </View>
    </Surface>
  );
}

/**
 * Bar Chart Component
 */
interface BarChartProps {
  data: VolumeTrendDataPoint[];
  muscleGroup: MuscleGroup;
  theme: MD3Theme;
}

function BarChart({ data, muscleGroup, theme }: BarChartProps): React.JSX.Element {
  // Calculate chart dimensions
  const chartWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  // Get volume landmarks for selected muscle group
  const landmarks = VOLUME_LANDMARKS[muscleGroup];

  // Calculate max value for Y-axis (use MRV + 20% as ceiling)
  const maxValue = Math.ceil(landmarks.mrv * 1.2);
  const barWidth = Math.min(chartWidth / data.length - 8, 50);
  const barSpacing = chartWidth / data.length;

  // Calculate bar positions and colors
  const bars = data.map((point, index) => {
    const zone = getVolumeZone(muscleGroup, point.total_sets);
    const barHeight = (point.total_sets / maxValue) * chartHeight;
    const x = PADDING.left + index * barSpacing + (barSpacing - barWidth) / 2;
    const y = PADDING.top + chartHeight - barHeight;

    // Color based on volume zone
    let color = '#22c55e'; // Green (optimal)
    if (zone === 'approaching_limit') {
      color = '#eab308'; // Yellow
    } else if (zone === 'under' || zone === 'overreaching') {
      color = '#ef4444'; // Red
    }

    return {
      x,
      y,
      width: barWidth,
      height: barHeight,
      color,
      value: point.total_sets,
      week: point.week,
    };
  });

  // Y-axis ticks
  const yTicks = [0, landmarks.mev, landmarks.mav, landmarks.mrv, maxValue];

  // Format week label (e.g., "2025-W01" -> "W01")
  const formatWeek = (weekStr: string): string => {
    const parts = weekStr.split('-W');
    return parts.length > 1 ? `W${parts[1]}` : weekStr;
  };

  return (
    <View style={styles.chartContainer}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => {
          const y = PADDING.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <React.Fragment key={i}>
              <Line
                x1={PADDING.left}
                y1={y}
                x2={CHART_WIDTH - PADDING.right}
                y2={y}
                stroke={
                  tick === landmarks.mev || tick === landmarks.mav || tick === landmarks.mrv
                    ? theme.colors.primary
                    : '#e0e0e0'
                }
                strokeWidth={
                  tick === landmarks.mev || tick === landmarks.mav || tick === landmarks.mrv
                    ? '2'
                    : '1'
                }
                strokeDasharray={
                  tick === landmarks.mev || tick === landmarks.mav || tick === landmarks.mrv
                    ? '5,5'
                    : undefined
                }
              />
              <SvgText x={PADDING.left - 10} y={y + 5} fontSize="10" fill="#666" textAnchor="end">
                {tick}
              </SvgText>
              {/* Landmark labels */}
              {tick === landmarks.mev && (
                <SvgText
                  x={CHART_WIDTH - PADDING.right + 5}
                  y={y + 5}
                  fontSize="9"
                  fill={theme.colors.primary}
                >
                  MEV
                </SvgText>
              )}
              {tick === landmarks.mav && (
                <SvgText
                  x={CHART_WIDTH - PADDING.right + 5}
                  y={y + 5}
                  fontSize="9"
                  fill={theme.colors.primary}
                >
                  MAV
                </SvgText>
              )}
              {tick === landmarks.mrv && (
                <SvgText
                  x={CHART_WIDTH - PADDING.right + 5}
                  y={y + 5}
                  fontSize="9"
                  fill={theme.colors.primary}
                >
                  MRV
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        {/* Bars */}
        {bars.map((bar, index) => (
          <React.Fragment key={index}>
            <Rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={bar.color}
              rx="4"
            />
            {/* Value label on top of bar */}
            <SvgText
              x={bar.x + bar.width / 2}
              y={bar.y - 5}
              fontSize="10"
              fill="#666"
              textAnchor="middle"
            >
              {bar.value}
            </SvgText>
            {/* Week label */}
            <SvgText
              x={bar.x + bar.width / 2}
              y={CHART_HEIGHT - PADDING.bottom + 20}
              fontSize="10"
              fill="#666"
              textAnchor="middle"
              transform={`rotate(-45, ${bar.x + bar.width / 2}, ${
                CHART_HEIGHT - PADDING.bottom + 20
              })`}
            >
              {formatWeek(bar.week)}
            </SvgText>
          </React.Fragment>
        ))}

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
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            Current Week
          </Text>
          <Text variant="titleMedium" style={styles.summaryValue}>
            {bars[bars.length - 1]?.value || 0} sets
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            Average
          </Text>
          <Text variant="titleMedium" style={styles.summaryValue}>
            {Math.round(bars.reduce((sum, b) => sum + b.value, 0) / bars.length)} sets
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            Peak Week
          </Text>
          <Text variant="titleMedium" style={styles.summaryValue}>
            {Math.max(...bars.map((b) => b.value))} sets
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
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
