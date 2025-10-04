/**
 * VO2maxSessionCard Component (T086)
 *
 * Summary card displaying VO2max cardio session details:
 * - Protocol type badge (Norwegian 4x4 / Zone 2)
 * - Session date, duration, estimated VO2max
 * - Completion status, heart rate data, RPE
 * - Swipeable actions (edit, delete) or tap to view details
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Card,
  Text,
  Badge,
  IconButton,
  Menu,
  Portal,
  Dialog,
  Paragraph,
  Button,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { VO2maxSession } from '../services/api/vo2maxApi';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/typography';

interface VO2maxSessionCardProps {
  session: VO2maxSession;
  onPress?: () => void;
  showActions?: boolean;
  onEdit?: (session: VO2maxSession) => void;
  onDelete?: (sessionId: number) => void;
}

export default function VO2maxSessionCard({
  session,
  onPress,
  showActions = false,
  onEdit,
  onDelete,
}: VO2maxSessionCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleEdit = () => {
    closeMenu();
    onEdit?.(session);
  };

  const handleDeleteConfirm = () => {
    closeMenu();
    setDeleteDialogVisible(true);
  };

  const confirmDelete = () => {
    setDeleteDialogVisible(false);
    onDelete?.(session.id);
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get protocol badge color
  const getProtocolColor = (protocolType: string): string => {
    return protocolType === 'norwegian_4x4' ? colors.error.main : colors.success.main;
  };

  // Get protocol label
  const getProtocolLabel = (protocolType: string): string => {
    return protocolType === 'norwegian_4x4' ? 'Norwegian 4x4' : 'Zone 2';
  };

  // Get completion status color
  const getCompletionColor = (status: string): string => {
    return status === 'completed' ? colors.success.main : colors.text.tertiary;
  };

  // Get RPE color (1-10 scale)
  const getRPEColor = (rpe: number): string => {
    if (rpe >= 9) return colors.error.main;
    if (rpe >= 7) return colors.warning.main;
    return colors.success.main;
  };

  // Get RPE emoji
  const getRPEEmoji = (rpe: number): string => {
    if (rpe >= 9) return '😫';
    if (rpe >= 7) return '😅';
    if (rpe >= 5) return '😊';
    return '😌';
  };

  // Truncate notes
  const truncateNotes = (notes: string | undefined, maxLength: number): string => {
    if (!notes) return '';
    return notes.length > maxLength ? notes.substring(0, maxLength) + '...' : notes;
  };

  const isCompleted = session.completion_status === 'completed';
  const cardGradient = isCompleted
    ? [colors.background.secondary, colors.background.tertiary]
    : [colors.background.tertiary, colors.background.secondary];

  return (
    <>
      <Card style={styles.card} elevation={3} onPress={onPress} mode="elevated">
        <LinearGradient
          colors={cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Card.Content style={styles.content}>
            {/* Header Row: Date + Actions */}
            <View style={styles.header}>
              <Text variant="bodySmall" style={styles.dateText}>
                {formatDate(session.date)}
              </Text>
              {showActions && (
                <Menu
                  visible={menuVisible}
                  onDismiss={closeMenu}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={24}
                      onPress={openMenu}
                      iconColor={colors.text.secondary}
                      containerStyle={styles.iconButtonContainer}
                      accessibilityLabel="Session options"
                    />
                  }
                >
                  <Menu.Item onPress={handleEdit} leadingIcon="pencil" title="Edit" />
                  <Menu.Item onPress={handleDeleteConfirm} leadingIcon="delete" title="Delete" />
                </Menu>
              )}
            </View>

            {/* Protocol Badge + Status */}
            <View style={styles.badgeRow}>
              <Badge
                style={[
                  styles.protocolBadge,
                  { backgroundColor: getProtocolColor(session.protocol_type) },
                ]}
              >
                {getProtocolLabel(session.protocol_type)}
              </Badge>
              <Badge
                style={[
                  styles.statusBadge,
                  { backgroundColor: getCompletionColor(session.completion_status) },
                ]}
              >
                {session.completion_status === 'completed' ? 'Completed' : 'Incomplete'}
              </Badge>
            </View>

            {/* Main Metrics Row */}
            <View style={styles.metricsRow}>
              {/* VO2max Estimate */}
              <View style={styles.metricBox}>
                <Text variant="labelSmall" style={styles.metricLabel}>
                  VO2max
                </Text>
                <Text variant="headlineLarge" style={styles.vo2maxValue}>
                  {session.estimated_vo2max?.toFixed(1) || '-'}
                </Text>
                <Text variant="bodySmall" style={styles.metricUnit}>
                  ml/kg/min
                </Text>
              </View>

              {/* Duration */}
              <View style={styles.metricBox}>
                <Text variant="labelSmall" style={styles.metricLabel}>
                  Duration
                </Text>
                <Text variant="titleLarge" style={styles.metricValue}>
                  {session.duration_minutes}
                </Text>
                <Text variant="bodySmall" style={styles.metricUnit}>
                  minutes
                </Text>
              </View>

              {/* Intervals (if Norwegian 4x4) */}
              {session.protocol_type === 'norwegian_4x4' && (
                <View style={styles.metricBox}>
                  <Text variant="labelSmall" style={styles.metricLabel}>
                    Intervals
                  </Text>
                  <Text variant="titleLarge" style={styles.metricValue}>
                    {session.intervals_completed || 0}/4
                  </Text>
                  <Text variant="bodySmall" style={styles.metricUnit}>
                    completed
                  </Text>
                </View>
              )}
            </View>

            {/* Heart Rate Data */}
            {(session.average_heart_rate || session.peak_heart_rate) && (
              <View style={styles.hrRow}>
                {session.average_heart_rate && (
                  <View style={styles.hrItem}>
                    <Text variant="bodySmall" style={styles.hrLabel}>
                      Avg HR:
                    </Text>
                    <Text variant="bodyMedium" style={styles.hrValue}>
                      {session.average_heart_rate} bpm
                    </Text>
                  </View>
                )}
                {session.peak_heart_rate && (
                  <View style={styles.hrItem}>
                    <Text variant="bodySmall" style={styles.hrLabel}>
                      Peak HR:
                    </Text>
                    <Text variant="bodyMedium" style={styles.hrValue}>
                      {session.peak_heart_rate} bpm
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* RPE */}
            {session.rpe && (
              <View style={styles.rpeRow}>
                <Text variant="bodySmall" style={styles.rpeLabel}>
                  RPE:
                </Text>
                <View
                  style={[styles.rpeBadge, { backgroundColor: getRPEColor(session.rpe) + '30' }]}
                >
                  <Text style={styles.rpeEmoji}>{getRPEEmoji(session.rpe)}</Text>
                  <Text
                    variant="bodyMedium"
                    style={[styles.rpeValue, { color: getRPEColor(session.rpe) }]}
                  >
                    {session.rpe}/10
                  </Text>
                </View>
              </View>
            )}

            {/* Notes Preview */}
            {session.notes && (
              <View style={styles.notesRow}>
                <Text variant="bodySmall" style={styles.notesText}>
                  {truncateNotes(session.notes, 50)}
                </Text>
              </View>
            )}
          </Card.Content>
        </LinearGradient>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Session?</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to delete this VO2max session from {formatDate(session.date)}?
              This action cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDelete} textColor={colors.error.main}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  gradient: {
    width: '100%',
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateText: {
    color: colors.text.secondary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  protocolBadge: {
    paddingHorizontal: spacing.sm,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    fontSize: 11,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vo2maxValue: {
    color: colors.primary.main,
    fontWeight: '700',
    fontSize: 32,
  },
  metricValue: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  metricUnit: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  hrRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.effects.overlay,
    borderRadius: borderRadius.sm,
  },
  hrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hrLabel: {
    color: colors.text.tertiary,
  },
  hrValue: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  rpeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rpeLabel: {
    color: colors.text.tertiary,
  },
  rpeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  rpeEmoji: {
    fontSize: 16,
  },
  rpeValue: {
    fontWeight: '600',
  },
  notesRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.effects.divider,
  },
  notesText: {
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  iconButtonContainer: {
    minWidth: 48,
    minHeight: 48,
  },
});
