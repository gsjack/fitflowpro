/**
 * Recovery Store (T045)
 *
 * Zustand store for recovery assessment management with auto-regulation.
 * Updates state immediately and queues background sync.
 *
 * Architecture:
 * - Local-first: All updates succeed immediately
 * - Background sync: Queue operations for server synchronization
 * - Auto-regulation: Apply volume adjustments to workout planning
 */

import { create } from 'zustand';
import * as recoveryDb from '../services/database/recoveryDb';
import { addToSyncQueue } from '../services/sync/syncQueue';
import type { RecoveryAssessment } from '../database/db';

// Recovery store state
interface RecoveryState {
  // Current state
  todayAssessment: RecoveryAssessment | null;
  volumeAdjustment: 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day' | null;

  // Actions
  submitAssessment: (
    userId: number,
    sleepQuality: number,
    muscleSoreness: number,
    mentalMotivation: number
  ) => Promise<void>;
  getTodayAssessment: (userId: number) => Promise<void>;
  clearAssessment: () => void;
}

/**
 * Recovery store with auto-regulation logic
 */
export const useRecoveryStore = create<RecoveryState>((set, _get) => ({
  // Initial state
  todayAssessment: null,
  volumeAdjustment: null,

  /**
   * Submit a new recovery assessment
   * Implements FR-008/FR-009 auto-regulation logic
   */
  submitAssessment: async (
    userId: number,
    sleepQuality: number,
    muscleSoreness: number,
    mentalMotivation: number
  ) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Create assessment locally (includes auto-regulation logic)
      const assessment = await recoveryDb.createAssessment(
        userId,
        today,
        sleepQuality,
        muscleSoreness,
        mentalMotivation
      );

      // Fetch the full assessment object
      const fullAssessment = await recoveryDb.getTodayAssessment(userId);

      // Optimistic update: Set assessment and adjustment immediately
      set({
        todayAssessment: fullAssessment,
        volumeAdjustment: assessment.volume_adjustment,
      });

      // Queue for background sync
      addToSyncQueue('recovery_assessment', {
        id: assessment.id,
        user_id: userId,
        date: today,
        sleep_quality: sleepQuality,
        muscle_soreness: muscleSoreness,
        mental_motivation: mentalMotivation,
        total_score: assessment.total_score,
        volume_adjustment: assessment.volume_adjustment,
        timestamp: Date.now(),
      });

      console.log('[RecoveryStore] Assessment submitted:', {
        totalScore: assessment.total_score,
        volumeAdjustment: assessment.volume_adjustment,
      });
    } catch (error) {
      console.error('[RecoveryStore] Failed to submit assessment:', error);
      throw error;
    }
  },

  /**
   * Get today's recovery assessment
   * Used on app startup and before workout sessions
   */
  getTodayAssessment: async (userId: number) => {
    try {
      // Check for today's assessment
      let assessment = await recoveryDb.getTodayAssessment(userId);

      // Fallback: Use most recent assessment within 72 hours (per spec edge case)
      if (!assessment) {
        assessment = await recoveryDb.getRecentAssessment(userId, 3);

        if (assessment) {
          console.log('[RecoveryStore] Using recent assessment from:', assessment.date);
        }
      }

      // Update state
      set({
        todayAssessment: assessment,
        volumeAdjustment: assessment?.volume_adjustment ?? null,
      });

      console.log("[RecoveryStore] Today's assessment:", assessment);
    } catch (error) {
      console.error("[RecoveryStore] Failed to get today's assessment:", error);
      throw error;
    }
  },

  /**
   * Clear recovery state (for logout, etc.)
   */
  clearAssessment: () => {
    set({
      todayAssessment: null,
      volumeAdjustment: null,
    });
  },
}));

/**
 * Apply volume adjustment to workout exercises
 * Used by workout planner to auto-regulate volume based on recovery
 *
 * @param plannedSets Original planned sets for an exercise
 * @param adjustment Volume adjustment from recovery assessment
 * @returns Adjusted set count
 */
export function applyVolumeAdjustment(
  plannedSets: number,
  adjustment: 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day' | null
): number {
  if (!adjustment || adjustment === 'none') {
    return plannedSets;
  }

  if (adjustment === 'rest_day') {
    return 0; // Skip all sets (rest day)
  }

  if (adjustment === 'reduce_1_set') {
    return Math.max(1, plannedSets - 1); // Reduce by 1, minimum 1 set
  }

  if (adjustment === 'reduce_2_sets') {
    return Math.max(1, plannedSets - 2); // Reduce by 2, minimum 1 set
  }

  return plannedSets;
}

/**
 * Get recovery recommendation message for UI display (FR-010)
 * @param adjustment Volume adjustment
 * @returns User-friendly message explaining the adjustment
 */
export function getRecoveryMessage(
  adjustment: 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day' | null
): string {
  if (!adjustment || adjustment === 'none') {
    return 'Good recovery - proceeding with full workout volume';
  }

  if (adjustment === 'rest_day') {
    return 'Poor recovery detected - rest day recommended for optimal adaptation';
  }

  if (adjustment === 'reduce_1_set') {
    return 'Moderate recovery - volume reduced by 1 set per exercise';
  }

  if (adjustment === 'reduce_2_sets') {
    return 'Poor recovery - volume reduced by 2 sets per exercise for recovery';
  }

  return '';
}
