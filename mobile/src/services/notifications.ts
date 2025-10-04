/**
 * Notification Service
 *
 * Handles local notifications and sound playback for:
 * - Rest timer warnings (10 seconds remaining)
 * - Rest timer completion
 * - VO2max interval timing
 * - Auto-regulation recommendations
 *
 * Uses expo-notifications for local notifications.
 * Uses expo-av for sound playback.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

/**
 * Configure notification handler behavior
 * Shows notifications even when app is in foreground
 * Only works on native platforms (iOS/Android)
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Send a local notification
 *
 * @param title - Notification title
 * @param body - Notification body message
 * @param data - Optional custom data payload
 */
export async function sendNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  // Notifications not supported on web
  if (Platform.OS === 'web') {
    console.log(`[Notifications] Web notification: ${title} - ${body}`);
    return;
  }

  try {
    // Request permissions if not granted
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted for notifications');
      return;
    }

    // Schedule notification immediately
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: true,
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('[Notifications] Failed to send notification:', error);
  }
}

/**
 * Play a sound file
 *
 * Used for audio feedback during workouts (e.g., interval timer beeps).
 * Sounds should be placed in /assets/sounds/ directory.
 *
 * @param soundFile - Sound file name (e.g., 'beep.mp3')
 */
export async function playSound(soundFile: string): Promise<void> {
  // Sound playback not supported on web
  if (Platform.OS === 'web') {
    console.log(`[Notifications] Web sound playback: ${soundFile}`);
    return;
  }

  try {
    // Configure audio mode for playback
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    // Load and play sound
    const { sound } = await Audio.Sound.createAsync(
      // Dynamically require sound based on file name
      // For production, sounds should be in assets/sounds/ directory
      { uri: soundFile }
    );

    await sound.playAsync();

    // Unload sound after playback completes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.error('[Notifications] Failed to play sound:', error);
  }
}

/**
 * Cancel all pending notifications
 *
 * Used when user completes workout early or navigates away.
 */
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Failed to cancel notifications:', error);
  }
}

/**
 * Schedule a notification to be sent after a delay
 *
 * @param title - Notification title
 * @param body - Notification body message
 * @param delaySeconds - Delay in seconds before notification is shown
 * @param data - Optional custom data payload
 * @returns Notification identifier (can be used to cancel)
 */
export async function scheduleNotification(
  title: string,
  body: string,
  delaySeconds: number,
  data?: Record<string, any>
): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log(`[Notifications] Web scheduled notification: ${title} in ${delaySeconds}s`);
    return null;
  }

  try {
    // Request permissions if not granted
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted for notifications');
      return null;
    }

    // Schedule notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: true,
      },
      trigger: {
        type: 'timeInterval' as any,
        seconds: delaySeconds,
      },
    });

    return identifier;
  } catch (error) {
    console.error('[Notifications] Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Cancel a specific scheduled notification
 *
 * @param identifier - Notification identifier returned from scheduleNotification
 */
export async function cancelNotification(identifier: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('[Notifications] Failed to cancel notification:', error);
  }
}
