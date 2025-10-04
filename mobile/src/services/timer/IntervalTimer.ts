/**
 * Interval Timer Service
 *
 * Manages HIIT interval timing for VO2max cardio sessions.
 * Alternates between work intervals and rest intervals with audio/visual feedback.
 *
 * Example VO2max Protocol (8 cycles):
 * - 30 seconds work (high intensity)
 * - 90 seconds rest (low intensity)
 * - Repeat 8 times = 16 minutes total
 *
 * Features:
 * - Beep sounds at phase transitions
 * - Notifications for phase changes
 * - Background execution support
 */

import { sendNotification, playSound } from '../notifications';

type IntervalPhase = 'work' | 'rest' | 'idle';

interface IntervalConfig {
  workSeconds: number;
  restSeconds: number;
  cycles: number;
}

interface IntervalState {
  config: IntervalConfig | null;
  currentCycle: number;
  currentPhase: IntervalPhase;
  phaseStartTime: number | null;
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
}

const state: IntervalState = {
  config: null,
  currentCycle: 0,
  currentPhase: 'idle',
  phaseStartTime: null,
  isRunning: false,
  intervalId: null,
};

/**
 * Start an interval timer session
 *
 * @param workSeconds - Duration of work interval in seconds
 * @param restSeconds - Duration of rest interval in seconds
 * @param cycles - Number of work/rest cycles to complete
 */
export async function startInterval(
  workSeconds: number,
  restSeconds: number,
  cycles: number
): Promise<void> {
  try {
    // Stop any existing interval
    if (state.isRunning) {
      await stopInterval();
    }

    state.config = { workSeconds, restSeconds, cycles };
    state.currentCycle = 1;
    state.currentPhase = 'work';
    state.phaseStartTime = Date.now();
    state.isRunning = true;

    console.log(
      `[IntervalTimer] Started ${cycles} cycles: ${workSeconds}s work / ${restSeconds}s rest`
    );

    // Send start notification
    await sendNotification(
      'Interval Started',
      `Cycle 1/${cycles}: Work for ${workSeconds} seconds`
    );

    // Play start beep
    await playSound('beep');

    // Start monitoring interval progression
    state.intervalId = setInterval(checkPhaseTransition, 1000);
  } catch (error) {
    console.error('[IntervalTimer] Failed to start interval:', error);
    throw error;
  }
}

/**
 * Stop the current interval timer
 */
export async function stopInterval(): Promise<void> {
  try {
    console.log('[IntervalTimer] Stopping interval timer');

    state.isRunning = false;
    state.currentPhase = 'idle';
    state.phaseStartTime = null;

    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
  } catch (error) {
    console.error('[IntervalTimer] Failed to stop interval:', error);
  }
}

/**
 * Get time remaining in current phase
 *
 * @returns Seconds remaining in current work or rest interval
 */
export function getTimeRemaining(): number {
  if (!state.isRunning || !state.phaseStartTime || !state.config) {
    return 0;
  }

  const elapsed = (Date.now() - state.phaseStartTime) / 1000;
  const phaseDuration =
    state.currentPhase === 'work' ? state.config.workSeconds : state.config.restSeconds;

  const remaining = Math.max(0, phaseDuration - elapsed);

  return Math.round(remaining);
}

/**
 * Get current interval phase
 *
 * @returns Current phase: 'work', 'rest', or 'idle'
 */
export function getCurrentPhase(): IntervalPhase {
  return state.currentPhase;
}

/**
 * Get current cycle number
 *
 * @returns Current cycle (1-indexed)
 */
export function getCurrentCycle(): number {
  return state.currentCycle;
}

/**
 * Get total cycles configured
 *
 * @returns Total number of cycles
 */
export function getTotalCycles(): number {
  return state.config?.cycles ?? 0;
}

/**
 * Check if it's time to transition to next phase
 * Called every second by interval
 */
async function checkPhaseTransition(): Promise<void> {
  if (!state.isRunning || !state.phaseStartTime || !state.config) {
    return;
  }

  const elapsed = (Date.now() - state.phaseStartTime) / 1000;
  const phaseDuration =
    state.currentPhase === 'work' ? state.config.workSeconds : state.config.restSeconds;

  // Check if current phase is complete
  if (elapsed >= phaseDuration) {
    await transitionToNextPhase();
  }
}

/**
 * Transition to the next interval phase
 */
async function transitionToNextPhase(): Promise<void> {
  if (!state.config) {
    return;
  }

  // Determine next phase
  if (state.currentPhase === 'work') {
    // Transition to rest
    state.currentPhase = 'rest';
    state.phaseStartTime = Date.now();

    await sendNotification(
      'Rest Phase',
      `Cycle ${state.currentCycle}/${state.config.cycles}: Rest for ${state.config.restSeconds} seconds`
    );
    await playSound('beep');

    console.log(`[IntervalTimer] Cycle ${state.currentCycle}: Transitioned to rest`);
  } else if (state.currentPhase === 'rest') {
    // Check if more cycles remain
    if (state.currentCycle < state.config.cycles) {
      // Start next cycle
      state.currentCycle++;
      state.currentPhase = 'work';
      state.phaseStartTime = Date.now();

      await sendNotification(
        'Work Phase',
        `Cycle ${state.currentCycle}/${state.config.cycles}: Work for ${state.config.workSeconds} seconds`
      );
      await playSound('beep');

      console.log(`[IntervalTimer] Cycle ${state.currentCycle}: Transitioned to work`);
    } else {
      // All cycles complete
      await stopInterval();

      await sendNotification('Interval Complete', `All ${state.config.cycles} cycles finished!`);
      await playSound('complete');

      console.log('[IntervalTimer] All cycles completed');
    }
  }
}

/**
 * Check if interval is currently running
 *
 * @returns True if interval is active
 */
export function isIntervalRunning(): boolean {
  return state.isRunning;
}
