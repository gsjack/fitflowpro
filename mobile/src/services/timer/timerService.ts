/**
 * Timer Service (T041)
 *
 * Rest timer with iOS background support using silent audio session.
 * Prevents app suspension during 3-5 minute rest periods.
 *
 * Features:
 * - Silent audio loop to keep app alive in background (iOS workaround) - TEMPORARILY DISABLED
 * - Countdown timer with setInterval
 * - Local notifications at 10s remaining and completion
 * - Audio config: playsInSilentModeIOS, staysActiveInBackground
 *
 * NOTE: expo-av temporarily removed to fix Android build issues
 * Background audio will be re-enabled when expo-av is added back
 */

// TODO: Re-enable when expo-av is added back
// import { Audio } from 'expo-av';

// Timer state
interface TimerState {
  isRunning: boolean;
  remainingSeconds: number;
  targetSeconds: number;
  startedAt: number;
  intervalId: NodeJS.Timeout | null;
  // sound: Audio.Sound | null; // Disabled for now
}

const timerState: TimerState = {
  isRunning: false,
  remainingSeconds: 0,
  targetSeconds: 0,
  startedAt: 0,
  intervalId: null,
  // sound: null, // Disabled for now
};

// Timer callbacks
let onTickCallback: ((remainingSeconds: number) => void) | null = null;
let onCompleteCallback: (() => void) | null = null;

/**
 * Start rest timer
 * @param durationSeconds Duration in seconds
 * @param onTick Callback called every second with remaining time
 * @param onComplete Callback called when timer completes
 */
export async function startRestTimer(
  durationSeconds: number,
  onTick?: (remainingSeconds: number) => void,
  onComplete?: () => void
): Promise<void> {
  // Stop any existing timer
  if (timerState.isRunning) {
    await stopRestTimer();
  }

  // Set up callbacks
  onTickCallback = onTick || null;
  onCompleteCallback = onComplete || null;

  // Initialize timer state
  timerState.remainingSeconds = durationSeconds;
  timerState.targetSeconds = durationSeconds;
  timerState.startedAt = Date.now();
  timerState.isRunning = true;

  // NOTE: Background audio temporarily disabled (expo-av removed)
  // await initializeAudioSession();
  // await startSilentAudio();

  // Start countdown interval
  timerState.intervalId = setInterval(() => {
    const elapsedMs = Date.now() - timerState.startedAt;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    timerState.remainingSeconds = timerState.targetSeconds - elapsedSeconds;

    if (timerState.remainingSeconds <= 0) {
      // Timer completed
      stopRestTimer();
      if (onCompleteCallback) {
        onCompleteCallback();
      }
    } else {
      // Tick callback
      if (onTickCallback) {
        onTickCallback(timerState.remainingSeconds);
      }
    }
  }, 1000);

  console.log(`[TimerService] Timer started: ${durationSeconds}s (background audio disabled)`);
}

/**
 * Stop rest timer
 */
export async function stopRestTimer(): Promise<void> {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }

  // NOTE: Background audio temporarily disabled (expo-av removed)
  // await stopSilentAudio();

  timerState.isRunning = false;
  timerState.remainingSeconds = 0;
  timerState.targetSeconds = 0;
  timerState.startedAt = 0;

  console.log('[TimerService] Timer stopped');
}

/**
 * Get current timer state
 */
export function getTimerState(): {
  isRunning: boolean;
  remainingSeconds: number;
  targetSeconds: number;
} {
  return {
    isRunning: timerState.isRunning,
    remainingSeconds: timerState.remainingSeconds,
    targetSeconds: timerState.targetSeconds,
  };
}

/**
 * Adjust timer by adding/removing seconds
 * @param deltaSeconds Seconds to add (positive) or subtract (negative)
 */
export function adjustTimer(deltaSeconds: number): void {
  if (!timerState.isRunning) {
    return;
  }

  timerState.targetSeconds += deltaSeconds;

  // Recalculate remaining seconds based on elapsed time
  const elapsedMs = Date.now() - timerState.startedAt;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  timerState.remainingSeconds = timerState.targetSeconds - elapsedSeconds;

  // Don't allow negative time
  if (timerState.remainingSeconds < 0) {
    timerState.remainingSeconds = 0;
  }

  console.log(
    `[TimerService] Timer adjusted by ${deltaSeconds}s, remaining: ${timerState.remainingSeconds}s`
  );
}

/**
 * Format seconds as MM:SS
 * @param seconds Total seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Alias for startRestTimer (for backward compatibility)
 */
export const startTimer = startRestTimer;

/**
 * Alias for stopRestTimer (for backward compatibility)
 */
export const stopTimer = stopRestTimer;

// Background audio functions - TEMPORARILY DISABLED
// Will be re-enabled when expo-av is added back

/**
 * Initialize audio session for background playback
 * NOTE: Currently disabled (expo-av removed)
 */
// async function initializeAudioSession(): Promise<void> {
//   try {
//     await Audio.setAudioModeAsync({
//       allowsRecordingIOS: false,
//       staysActiveInBackground: true,
//       playsInSilentModeIOS: true,
//       shouldDuckAndroid: true,
//       playThroughEarpieceAndroid: false,
//     });
//     console.log('[TimerService] Audio session initialized');
//   } catch (error) {
//     console.error('[TimerService] Failed to initialize audio session:', error);
//     throw error;
//   }
// }

/**
 * Load and start playing silent audio loop
 * NOTE: Currently disabled (expo-av removed)
 */
// async function startSilentAudio(): Promise<void> {
//   try {
//     if (timerState.sound) {
//       return;
//     }
//     const { sound } = await Audio.Sound.createAsync(
//       require('../../../assets/silence.mp3'),
//       { isLooping: true, volume: 0.0 }
//     );
//     timerState.sound = sound;
//     await sound.playAsync();
//     console.log('[TimerService] Silent audio started');
//   } catch (error) {
//     console.error('[TimerService] Failed to start silent audio:', error);
//   }
// }

/**
 * Stop and unload silent audio
 * NOTE: Currently disabled (expo-av removed)
 */
// async function stopSilentAudio(): Promise<void> {
//   try {
//     if (timerState.sound) {
//       await timerState.sound.stopAsync();
//       await timerState.sound.unloadAsync();
//       timerState.sound = null;
//       console.log('[TimerService] Silent audio stopped');
//     }
//   } catch (error) {
//     console.error('[TimerService] Failed to stop silent audio:', error);
//   }
// }
