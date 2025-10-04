/**
 * Chart Skeleton
 *
 * Skeleton loader for analytics charts (1RM progression, volume trends, etc.)
 * Simulates chart layout with title and placeholder graph
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { Card } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface ChartSkeletonProps {
  height?: number;
  showLegend?: boolean;
}

export function ChartSkeleton({ height = 250, showLegend = false }: ChartSkeletonProps) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <SkeletonPlaceholder
          backgroundColor={colors.background.tertiary}
          highlightColor={colors.background.secondary}
          speed={1200}
        >
          {/* Chart title */}
          <View style={styles.titleSkeleton} />

          {/* Chart area */}
          <View style={[styles.chartArea, { height }]}>
            {/* Y-axis labels */}
            <View style={styles.yAxisContainer}>
              <View style={styles.yAxisLabel} />
              <View style={styles.yAxisLabel} />
              <View style={styles.yAxisLabel} />
              <View style={styles.yAxisLabel} />
            </View>

            {/* Chart bars/lines simulation */}
            <View style={styles.chartBarsContainer}>
              <View style={[styles.chartBar, { height: '60%' }]} />
              <View style={[styles.chartBar, { height: '80%' }]} />
              <View style={[styles.chartBar, { height: '50%' }]} />
              <View style={[styles.chartBar, { height: '90%' }]} />
              <View style={[styles.chartBar, { height: '70%' }]} />
            </View>
          </View>

          {/* X-axis labels */}
          <View style={styles.xAxisContainer}>
            <View style={styles.xAxisLabel} />
            <View style={styles.xAxisLabel} />
            <View style={styles.xAxisLabel} />
            <View style={styles.xAxisLabel} />
            <View style={styles.xAxisLabel} />
          </View>

          {/* Legend (optional) */}
          {showLegend && (
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={styles.legendColor} />
                <View style={styles.legendText} />
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendColor} />
                <View style={styles.legendText} />
              </View>
            </View>
          )}
        </SkeletonPlaceholder>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  titleSkeleton: {
    width: '50%',
    height: 20,
    borderRadius: 6,
    marginBottom: spacing.lg,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: spacing.md,
  },
  yAxisContainer: {
    justifyContent: 'space-between',
    height: '100%',
    marginRight: spacing.sm,
  },
  yAxisLabel: {
    width: 30,
    height: 12,
    borderRadius: 6,
  },
  chartBarsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    gap: spacing.sm,
  },
  chartBar: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
  },
  xAxisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingLeft: 38, // Align with chart bars (y-axis width + margin)
  },
  xAxisLabel: {
    width: 40,
    height: 12,
    borderRadius: 6,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    width: 60,
    height: 12,
    borderRadius: 6,
  },
});
