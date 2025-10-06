/**
 * Volume Landmarks Constants (T046)
 *
 * Renaissance Periodization volume landmarks for auto-regulation and tracking.
 * Based on research.md data from Dr. Mike Israetel's RP methodology.
 *
 * Definitions:
 * - MEV (Minimum Effective Volume): Lower threshold for muscle growth
 * - MAV (Maximum Adaptive Volume): Optimal volume for most users
 * - MRV (Maximum Recoverable Volume): Upper limit before overreaching
 *
 * Source: Research.md - Renaissance Periodization Volume Landmarks
 */

/**
 * Volume landmark for a single muscle group
 */
export interface VolumeLandmark {
  mev: number; // Minimum Effective Volume (sets/week)
  mav: number; // Maximum Adaptive Volume (sets/week)
  mrv: number; // Maximum Recoverable Volume (sets/week)
}

/**
 * Muscle group identifier type
 */
export type MuscleGroup =
  | 'chest'
  | 'back_lats'
  | 'back_traps'
  | 'shoulders_front'
  | 'shoulders_side'
  | 'shoulders_rear'
  | 'biceps'
  | 'brachialis'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs';

/**
 * Complete volume landmarks map for all major muscle groups
 * Sets per muscle group per week from Renaissance Periodization guidelines
 */
export const VOLUME_LANDMARKS: Record<MuscleGroup, VolumeLandmark> = {
  chest: {
    mev: 8,
    mav: 14,
    mrv: 22,
  },
  back_lats: {
    mev: 10,
    mav: 16,
    mrv: 26,
  },
  back_traps: {
    mev: 6,
    mav: 12,
    mrv: 20,
  },
  shoulders_front: {
    mev: 4,
    mav: 8,
    mrv: 14,
  },
  shoulders_side: {
    mev: 8,
    mav: 16,
    mrv: 26,
  },
  shoulders_rear: {
    mev: 8,
    mav: 14,
    mrv: 22,
  },
  biceps: {
    mev: 6,
    mav: 12,
    mrv: 20,
  },
  brachialis: {
    mev: 4,
    mav: 8,
    mrv: 14,
  },
  triceps: {
    mev: 6,
    mav: 12,
    mrv: 22,
  },
  quads: {
    mev: 8,
    mav: 14,
    mrv: 24,
  },
  hamstrings: {
    mev: 6,
    mav: 12,
    mrv: 20,
  },
  glutes: {
    mev: 6,
    mav: 12,
    mrv: 20,
  },
  calves: {
    mev: 8,
    mav: 14,
    mrv: 22,
  },
  abs: {
    mev: 8,
    mav: 16,
    mrv: 28,
  },
};

/**
 * Get volume landmark for a specific muscle group
 * @param muscleGroup Muscle group identifier
 * @returns Volume landmark with MEV/MAV/MRV values
 */
export function getVolumeLandmark(muscleGroup: MuscleGroup): VolumeLandmark {
  return VOLUME_LANDMARKS[muscleGroup];
}

/**
 * Determine volume zone based on current weekly sets
 * @param muscleGroup Muscle group identifier
 * @param weeklyVolume Current weekly volume (sets)
 * @returns Volume zone classification
 */
export function getVolumeZone(
  muscleGroup: MuscleGroup,
  weeklyVolume: number
): 'under' | 'optimal' | 'approaching_limit' | 'overreaching' {
  const landmark = VOLUME_LANDMARKS[muscleGroup];

  if (weeklyVolume < landmark.mev) {
    return 'under'; // Below MEV - under-training
  } else if (weeklyVolume >= landmark.mev && weeklyVolume <= landmark.mav) {
    return 'optimal'; // MEV to MAV - optimal range
  } else if (weeklyVolume > landmark.mav && weeklyVolume <= landmark.mrv) {
    return 'approaching_limit'; // MAV to MRV - approaching limit
  } else {
    return 'overreaching'; // Above MRV - overreaching/overtraining
  }
}

/**
 * Get color code for volume zone (for UI visualization)
 * @param zone Volume zone classification
 * @returns Color code string
 */
export function getVolumeZoneColor(
  zone: 'under' | 'optimal' | 'approaching_limit' | 'overreaching'
): string {
  switch (zone) {
    case 'under':
      return '#ef4444'; // Red (under-training)
    case 'optimal':
      return '#22c55e'; // Green (optimal)
    case 'approaching_limit':
      return '#eab308'; // Yellow (approaching limit)
    case 'overreaching':
      return '#ef4444'; // Red (overreaching)
    default:
      return '#6b7280'; // Gray (unknown)
  }
}

/**
 * Calculate recommended volume adjustment for mesocycle phase
 * @param currentVolume Current weekly volume
 * @param currentPhase Current mesocycle phase
 * @param targetPhase Target mesocycle phase
 * @returns Adjusted volume recommendation
 */
export function calculatePhaseVolumeAdjustment(
  currentVolume: number,
  currentPhase: 'mev' | 'mav' | 'mrv' | 'deload',
  targetPhase: 'mev' | 'mav' | 'mrv' | 'deload'
): number {
  // Deload phase: 50% reduction (per CLAUDE.md)
  if (targetPhase === 'deload') {
    return Math.round(currentVolume * 0.5);
  }

  // Coming out of deload: return to previous phase volume
  if (currentPhase === 'deload') {
    return currentVolume * 2; // Restore from 50% reduction
  }

  // MEV → MAV: +20% increase (per CLAUDE.md)
  if (currentPhase === 'mev' && targetPhase === 'mav') {
    return Math.round(currentVolume * 1.2);
  }

  // MAV → MRV: +15% increase (per CLAUDE.md)
  if (currentPhase === 'mav' && targetPhase === 'mrv') {
    return Math.round(currentVolume * 1.15);
  }

  // No adjustment needed
  return currentVolume;
}
