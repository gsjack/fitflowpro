/**
 * ExerciseVideoModal Component
 *
 * Displays exercise demonstration video link during workouts
 * Opens YouTube video in external app/browser for form guidance
 */

import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Portal, Dialog, Button, Paragraph, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/typography';

interface ExerciseVideoModalProps {
  visible: boolean;
  onDismiss: () => void;
  exerciseName: string;
  videoUrl?: string;
}

export default function ExerciseVideoModal({
  visible,
  onDismiss,
  exerciseName,
  videoUrl,
}: ExerciseVideoModalProps) {
  /**
   * Open YouTube video in external app/browser
   */
  const handleOpenVideo = async () => {
    if (!videoUrl) {
      console.warn('[ExerciseVideoModal] No video URL provided');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(videoUrl);

      if (supported) {
        console.log('[ExerciseVideoModal] Opening video:', videoUrl);
        await Linking.openURL(videoUrl);
        onDismiss(); // Close modal after opening video
      } else {
        console.error('[ExerciseVideoModal] Cannot open URL:', videoUrl);
      }
    } catch (error) {
      console.error('[ExerciseVideoModal] Error opening video:', error);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog} dismissable={true}>
        <Dialog.Title style={styles.title}>Exercise Demonstration</Dialog.Title>

        <Dialog.Content>
          <View style={styles.exerciseNameContainer}>
            <MaterialCommunityIcons
              name="dumbbell"
              size={24}
              color={colors.primary.main}
              style={styles.icon}
            />
            <Text variant="bodyLarge" style={styles.exerciseName}>
              {exerciseName}
            </Text>
          </View>

          {videoUrl ? (
            <>
              <Paragraph style={styles.description}>
                Watch a demonstration video to learn proper form and technique. The video will open
                in YouTube.
              </Paragraph>

              <View style={styles.videoIconContainer}>
                <MaterialCommunityIcons name="youtube" size={64} color={colors.error.main} />
              </View>
            </>
          ) : (
            <View style={styles.noVideoContainer}>
              <MaterialCommunityIcons
                name="video-off"
                size={48}
                color={colors.text.disabled}
                style={styles.noVideoIcon}
              />
              <Paragraph style={styles.noVideoText}>
                Video demonstration not available for this exercise yet.
              </Paragraph>
            </View>
          )}
        </Dialog.Content>

        <Dialog.Actions style={styles.actions}>
          <Button onPress={onDismiss} textColor={colors.text.secondary}>
            Close
          </Button>
          {videoUrl && (
            <Button
              mode="contained"
              onPress={handleOpenVideo}
              buttonColor={colors.primary.main}
              contentStyle={styles.watchButtonContent}
              icon="play-circle"
              accessibilityLabel={`Watch demonstration video for ${exerciseName}`}
            >
              Watch Video
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  title: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
  },
  exerciseNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  exerciseName: {
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  videoIconContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noVideoContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noVideoIcon: {
    marginBottom: spacing.md,
  },
  noVideoText: {
    color: colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  watchButtonContent: {
    height: 44,
    paddingHorizontal: spacing.md,
  },
});
