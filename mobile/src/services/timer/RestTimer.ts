/**
 * Rest Timer Service
 *
 * Manages rest period timing between sets during workouts.
 * Provides countdown timer with notifications at:
 * - 10 seconds remaining (warning)
 * - 0 seconds (completion)
 *
 * Uses silent audio playback workaround to keep timer running
 * in background on iOS (plays silence.mp3 on loop).
 *
 * Performance requirements:
 * - Timer accuracy: ±2 seconds
 * - Must continue running when app is backgrounded
 */

// TODO: Add expo-av back for iOS background audio support
// import { Audio } from 'expo-av';
import { scheduleNotification, cancelNotification } from '../notifications';

interface TimerState {
  startTime: number | null;
  duration: number;
  isRunning: boolean;
  warningNotificationId: string | null;
  completionNotificationId: string | null;
  // silentSound: Audio.Sound | null; // Disabled for now
}

const state: TimerState = {
  startTime: null,
  duration: 0,
  isRunning: false,
  warningNotificationId: null,
  completionNotificationId: null,
  // silentSound: null, // Disabled for now
};

/**
 * Start a rest timer
 *
 * @param durationSeconds - Rest period in seconds (typically 3-5 minutes for compound lifts)
 */
export async function startTimer(durationSeconds: number): Promise<void> {
  try {
    // Stop any existing timer
    if (state.isRunning) {
      await stopTimer();
    }

    state.startTime = Date.now();
    state.duration = durationSeconds;
    state.isRunning = true;

    console.log(`[RestTimer] Started ${durationSeconds}s rest timer`);

    // Schedule warning notification (10 seconds before completion)
    if (durationSeconds > 10) {
      const warningDelay = durationSeconds - 10;
      const id = await scheduleNotification(
        'Rest Almost Over',
        '10 seconds remaining',
        warningDelay
      );
      if (id) {
        state.warningNotificationId = id;
      }
    }

    // Schedule completion notification
    const completionId = await scheduleNotification(
      'Rest Complete',
      'Ready for next set',
      durationSeconds
    );
    if (completionId) {
      state.completionNotificationId = completionId;
    }

    // Start silent audio to keep app alive in background (iOS workaround)
    await startBackgroundAudio();
  } catch (error) {
    console.error('[RestTimer] Failed to start timer:', error);
    throw error;
  }
}

/**
 * Stop the current rest timer
 */
export async function stopTimer(): Promise<void> {
  try {
    console.log('[RestTimer] Stopping timer');

    state.isRunning = false;
    state.startTime = null;

    // Cancel scheduled notifications
    if (state.warningNotificationId) {
      await cancelNotification(state.warningNotificationId);
      state.warningNotificationId = null;
    }
    if (state.completionNotificationId) {
      await cancelNotification(state.completionNotificationId);
      state.completionNotificationId = null;
    }

    // Stop background audio
    await stopBackgroundAudio();
  } catch (error) {
    console.error('[RestTimer] Failed to stop timer:', error);
  }
}

/**
 * Get time remaining on current timer
 *
 * @returns Seconds remaining (rounded), or 0 if timer is not running
 */
export function getTimeRemaining(): number {
  if (!state.isRunning || !state.startTime) {
    return 0;
  }

  const elapsed = (Date.now() - state.startTime) / 1000;
  const remaining = Math.max(0, state.duration - elapsed);

  return Math.round(remaining);
}

/**
 * Start playing silent audio to keep timer active in background
 *
 * iOS Background Workaround:
 * - Plays silence.mp3 on loop
 * - Keeps app's audio session active
 * - Prevents iOS from suspending the app after 30 seconds
 * - Required for 3-5 minute rest timers
 */
async function startBackgroundAudio(): Promise<void> {
  try {
    // Configure audio mode for background playback
    // TODO: Re-enable when expo-av is added back
    // await Audio.setAudioModeAsync({
    //   playsInSilentModeIOS: true,
    //   staysActiveInBackground: true,
    //   shouldDuckAndroid: false,
    // });

    // Create and play silent audio on loop
    // Note: silence.mp3 should be a 1-second silent audio file in assets/
    // TODO: Create assets/silence.mp3 for iOS background timer support
    // For now, background audio is disabled - timer works in foreground only

    // Uncomment when silence.mp3 asset is added:
    // const { sound } = await Audio.Sound.createAsync(
    //   require('../../../assets/silence.mp3'),
    //   { isLooping: true, volume: 0.0 }
    // );
    // await sound.playAsync();
    // state.silentSound = sound;

    console.log('[RestTimer] Background audio not configured (foreground-only mode)');
  } catch (error) {
    console.warn(
      '[RestTimer] Failed to start background audio (timer will still work in foreground):',
      error
    );
  }
}

/**
 * Stop background audio playback
 */
async function stopBackgroundAudio(): Promise<void> {
  try {
    // TODO: Re-enable when expo-av is added back
    // if (state.silentSound) {
    //   await state.silentSound.stopAsync();
    //   await state.silentSound.unloadAsync();
    //   state.silentSound = null;
    //   console.log('[RestTimer] Background audio stopped');
    // }
  } catch (error) {
    console.warn('[RestTimer] Failed to stop background audio:', error);
  }
}

/**
 * Check if timer is currently running
 *
 * @returns True if timer is active
 */
export function isTimerRunning(): boolean {
  return state.isRunning;
}
