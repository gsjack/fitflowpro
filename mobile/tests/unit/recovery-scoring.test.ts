/**
 * Unit Test T083: Recovery Scoring and Auto-Regulation
 *
 * Tests recovery assessment scoring and volume adjustment logic
 */

import { describe, it, expect } from 'vitest';

/**
 * Recovery assessment data
 */
interface RecoveryAssessment {
  sleep_quality: number; // 1-5 scale
  muscle_soreness: number; // 1-5 scale
  mental_motivation: number; // 1-5 scale
}

/**
 * Volume adjustment options
 */
type VolumeAdjustment = 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day_recommended';

/**
 * Calculate total recovery score from subscores
 */
function calculateRecoveryScore(assessment: RecoveryAssessment): number {
  if (assessment.sleep_quality < 1 || assessment.sleep_quality > 5) {
    throw new Error('Sleep quality must be 1-5');
  }
  if (assessment.muscle_soreness < 1 || assessment.muscle_soreness > 5) {
    throw new Error('Muscle soreness must be 1-5');
  }
  if (assessment.mental_motivation < 1 || assessment.mental_motivation > 5) {
    throw new Error('Mental motivation must be 1-5');
  }

  return assessment.sleep_quality + assessment.muscle_soreness + assessment.mental_motivation;
}

/**
 * Determine volume adjustment based on recovery score
 *
 * Score ranges:
 * - 12-15: No adjustment (good recovery)
 * - 9-11: Reduce 1 set per exercise
 * - 6-8: Reduce 2 sets per exercise
 * - 3-5: Rest day recommended
 */
function determineVolumeAdjustment(score: number): VolumeAdjustment {
  if (score < 3 || score > 15) {
    throw new Error('Recovery score must be 3-15');
  }

  if (score >= 12) return 'none';
  if (score >= 9) return 'reduce_1_set';
  if (score >= 6) return 'reduce_2_sets';
  return 'rest_day_recommended';
}

/**
 * Apply volume adjustment to exercise sets
 */
function applyVolumeAdjustment(originalSets: number, adjustment: VolumeAdjustment): number {
  if (originalSets < 1) {
    throw new Error('Original sets must be at least 1');
  }

  switch (adjustment) {
    case 'none':
      return originalSets;
    case 'reduce_1_set':
      return Math.max(1, originalSets - 1);
    case 'reduce_2_sets':
      return Math.max(1, originalSets - 2);
    case 'rest_day_recommended':
      return 0;
    default:
      throw new Error('Invalid volume adjustment');
  }
}

describe('Unit Test: Recovery Scoring and Auto-Regulation (T083)', () => {
  describe('Recovery score calculation', () => {
    it('should calculate perfect recovery score (5+5+5 = 15)', () => {
      const assessment = {
        sleep_quality: 5,
        muscle_soreness: 5,
        mental_motivation: 5,
      };

      const score = calculateRecoveryScore(assessment);
      expect(score).toBe(15);
    });

    it('should calculate poor recovery score (2+4+2 = 8)', () => {
      const assessment = {
        sleep_quality: 2,
        muscle_soreness: 4,
        mental_motivation: 2,
      };

      const score = calculateRecoveryScore(assessment);
      expect(score).toBe(8);
    });

    it('should calculate minimal recovery score (1+1+1 = 3)', () => {
      const assessment = {
        sleep_quality: 1,
        muscle_soreness: 1,
        mental_motivation: 1,
      };

      const score = calculateRecoveryScore(assessment);
      expect(score).toBe(3);
    });

    it('should calculate moderate recovery score (3+3+3 = 9)', () => {
      const assessment = {
        sleep_quality: 3,
        muscle_soreness: 3,
        mental_motivation: 3,
      };

      const score = calculateRecoveryScore(assessment);
      expect(score).toBe(9);
    });
  });

  describe('Volume adjustment determination', () => {
    it('should recommend no adjustment for score 15 (perfect)', () => {
      const adjustment = determineVolumeAdjustment(15);
      expect(adjustment).toBe('none');
    });

    it('should recommend no adjustment for score 12 (good)', () => {
      const adjustment = determineVolumeAdjustment(12);
      expect(adjustment).toBe('none');
    });

    it('should recommend reduce 1 set for score 11', () => {
      const adjustment = determineVolumeAdjustment(11);
      expect(adjustment).toBe('reduce_1_set');
    });

    it('should recommend reduce 1 set for score 9', () => {
      const adjustment = determineVolumeAdjustment(9);
      expect(adjustment).toBe('reduce_1_set');
    });

    it('should recommend reduce 2 sets for score 8', () => {
      const adjustment = determineVolumeAdjustment(8);
      expect(adjustment).toBe('reduce_2_sets');
    });

    it('should recommend reduce 2 sets for score 6', () => {
      const adjustment = determineVolumeAdjustment(6);
      expect(adjustment).toBe('reduce_2_sets');
    });

    it('should recommend rest day for score 5', () => {
      const adjustment = determineVolumeAdjustment(5);
      expect(adjustment).toBe('rest_day_recommended');
    });

    it('should recommend rest day for score 3', () => {
      const adjustment = determineVolumeAdjustment(3);
      expect(adjustment).toBe('rest_day_recommended');
    });
  });

  describe('Volume adjustment application', () => {
    it('should not reduce sets when adjustment is none', () => {
      const adjustedSets = applyVolumeAdjustment(4, 'none');
      expect(adjustedSets).toBe(4);
    });

    it('should reduce 1 set when adjustment is reduce_1_set', () => {
      const adjustedSets = applyVolumeAdjustment(4, 'reduce_1_set');
      expect(adjustedSets).toBe(3);
    });

    it('should reduce 2 sets when adjustment is reduce_2_sets', () => {
      const adjustedSets = applyVolumeAdjustment(4, 'reduce_2_sets');
      expect(adjustedSets).toBe(2);
    });

    it('should set to 0 when rest day recommended', () => {
      const adjustedSets = applyVolumeAdjustment(4, 'rest_day_recommended');
      expect(adjustedSets).toBe(0);
    });

    it('should maintain minimum 1 set when reducing from 2 sets', () => {
      const adjustedSets = applyVolumeAdjustment(2, 'reduce_1_set');
      expect(adjustedSets).toBe(1);
    });

    it('should maintain minimum 1 set when reducing 2 from 2 sets', () => {
      const adjustedSets = applyVolumeAdjustment(2, 'reduce_2_sets');
      expect(adjustedSets).toBe(1);
    });

    it('should maintain minimum 1 set when reducing 2 from 3 sets', () => {
      const adjustedSets = applyVolumeAdjustment(3, 'reduce_2_sets');
      expect(adjustedSets).toBe(1);
    });
  });

  describe('End-to-end auto-regulation flow', () => {
    it('should handle good recovery (no volume change)', () => {
      const assessment = {
        sleep_quality: 4,
        muscle_soreness: 4,
        mental_motivation: 4,
      };

      const score = calculateRecoveryScore(assessment);
      const adjustment = determineVolumeAdjustment(score);
      const adjustedSets = applyVolumeAdjustment(4, adjustment);

      expect(score).toBe(12);
      expect(adjustment).toBe('none');
      expect(adjustedSets).toBe(4);
    });

    it('should handle moderate recovery (reduce 1 set)', () => {
      const assessment = {
        sleep_quality: 3,
        muscle_soreness: 4,
        mental_motivation: 3,
      };

      const score = calculateRecoveryScore(assessment);
      const adjustment = determineVolumeAdjustment(score);
      const adjustedSets = applyVolumeAdjustment(4, adjustment);

      expect(score).toBe(10);
      expect(adjustment).toBe('reduce_1_set');
      expect(adjustedSets).toBe(3);
    });

    it('should handle poor recovery (reduce 2 sets)', () => {
      const assessment = {
        sleep_quality: 2,
        muscle_soreness: 4,
        mental_motivation: 2,
      };

      const score = calculateRecoveryScore(assessment);
      const adjustment = determineVolumeAdjustment(score);
      const adjustedSets = applyVolumeAdjustment(4, adjustment);

      expect(score).toBe(8);
      expect(adjustment).toBe('reduce_2_sets');
      expect(adjustedSets).toBe(2);
    });

    it('should handle very poor recovery (rest day)', () => {
      const assessment = {
        sleep_quality: 1,
        muscle_soreness: 3,
        mental_motivation: 1,
      };

      const score = calculateRecoveryScore(assessment);
      const adjustment = determineVolumeAdjustment(score);
      const adjustedSets = applyVolumeAdjustment(4, adjustment);

      expect(score).toBe(5);
      expect(adjustment).toBe('rest_day_recommended');
      expect(adjustedSets).toBe(0);
    });
  });

  describe('Edge cases and validation', () => {
    it('should throw error for sleep quality < 1', () => {
      const assessment = { sleep_quality: 0, muscle_soreness: 3, mental_motivation: 3 };
      expect(() => calculateRecoveryScore(assessment)).toThrow('Sleep quality must be 1-5');
    });

    it('should throw error for sleep quality > 5', () => {
      const assessment = { sleep_quality: 6, muscle_soreness: 3, mental_motivation: 3 };
      expect(() => calculateRecoveryScore(assessment)).toThrow('Sleep quality must be 1-5');
    });

    it('should throw error for muscle soreness < 1', () => {
      const assessment = { sleep_quality: 3, muscle_soreness: 0, mental_motivation: 3 };
      expect(() => calculateRecoveryScore(assessment)).toThrow('Muscle soreness must be 1-5');
    });

    it('should throw error for mental motivation > 5', () => {
      const assessment = { sleep_quality: 3, muscle_soreness: 3, mental_motivation: 6 };
      expect(() => calculateRecoveryScore(assessment)).toThrow('Mental motivation must be 1-5');
    });

    it('should throw error for invalid recovery score in adjustment', () => {
      expect(() => determineVolumeAdjustment(2)).toThrow('Recovery score must be 3-15');
      expect(() => determineVolumeAdjustment(16)).toThrow('Recovery score must be 3-15');
    });

    it('should throw error for invalid original sets', () => {
      expect(() => applyVolumeAdjustment(0, 'none')).toThrow('Original sets must be at least 1');
      expect(() => applyVolumeAdjustment(-1, 'none')).toThrow('Original sets must be at least 1');
    });
  });

  describe('Boundary conditions', () => {
    it('should handle score exactly at boundaries (12, 9, 6)', () => {
      expect(determineVolumeAdjustment(12)).toBe('none');
      expect(determineVolumeAdjustment(9)).toBe('reduce_1_set');
      expect(determineVolumeAdjustment(6)).toBe('reduce_2_sets');
    });

    it('should handle scores just above boundaries (13, 10, 7)', () => {
      expect(determineVolumeAdjustment(13)).toBe('none');
      expect(determineVolumeAdjustment(10)).toBe('reduce_1_set');
      expect(determineVolumeAdjustment(7)).toBe('reduce_2_sets');
    });

    it('should handle scores just below boundaries (11, 8, 5)', () => {
      expect(determineVolumeAdjustment(11)).toBe('reduce_1_set');
      expect(determineVolumeAdjustment(8)).toBe('reduce_2_sets');
      expect(determineVolumeAdjustment(5)).toBe('rest_day_recommended');
    });
  });

  describe('Realistic scenarios', () => {
    it('should handle "Slept poorly but motivated" (2+3+4 = 9)', () => {
      const assessment = {
        sleep_quality: 2,
        muscle_soreness: 3,
        mental_motivation: 4,
      };

      const score = calculateRecoveryScore(assessment);
      const adjustment = determineVolumeAdjustment(score);

      expect(score).toBe(9);
      expect(adjustment).toBe('reduce_1_set');
    });

    it('should handle "Well rested but very sore" (5+1+3 = 9)', () => {
      const assessment = {
        sleep_quality: 5,
        muscle_soreness: 1, // Very sore = low score
        mental_motivation: 3,
      };

      const score = calculateRecoveryScore(assessment);
      const adjustment = determineVolumeAdjustment(score);

      expect(score).toBe(9);
      expect(adjustment).toBe('reduce_1_set');
    });

    it('should handle "Perfect recovery" (5+5+5 = 15)', () => {
      const assessment = {
        sleep_quality: 5,
        muscle_soreness: 5,
        mental_motivation: 5,
      };

      const score = calculateRecoveryScore(assessment);
      const adjustment = determineVolumeAdjustment(score);

      expect(score).toBe(15);
      expect(adjustment).toBe('none');
    });

    it('should handle "Exhausted after competition" (2+1+2 = 5)', () => {
      const assessment = {
        sleep_quality: 2,
        muscle_soreness: 1,
        mental_motivation: 2,
      };

      const score = calculateRecoveryScore(assessment);
      const adjustment = determineVolumeAdjustment(score);

      expect(score).toBe(5);
      expect(adjustment).toBe('rest_day_recommended');
    });
  });

  describe('Weekly auto-regulation pattern', () => {
    it('should track recovery across a week', () => {
      const week = [
        {
          day: 'Monday',
          assessment: { sleep_quality: 4, muscle_soreness: 4, mental_motivation: 4 },
        },
        {
          day: 'Tuesday',
          assessment: { sleep_quality: 3, muscle_soreness: 3, mental_motivation: 4 },
        },
        {
          day: 'Wednesday',
          assessment: { sleep_quality: 3, muscle_soreness: 2, mental_motivation: 3 },
        },
        {
          day: 'Thursday',
          assessment: { sleep_quality: 2, muscle_soreness: 2, mental_motivation: 2 },
        },
        {
          day: 'Friday',
          assessment: { sleep_quality: 4, muscle_soreness: 4, mental_motivation: 4 },
        },
      ];

      const results = week.map((day) => {
        const score = calculateRecoveryScore(day.assessment);
        const adjustment = determineVolumeAdjustment(score);
        return { day: day.day, score, adjustment };
      });

      expect(results[0].score).toBe(12); // Monday: good
      expect(results[0].adjustment).toBe('none');

      expect(results[1].score).toBe(10); // Tuesday: moderate
      expect(results[1].adjustment).toBe('reduce_1_set');

      expect(results[2].score).toBe(8); // Wednesday: poor
      expect(results[2].adjustment).toBe('reduce_2_sets');

      expect(results[3].score).toBe(6); // Thursday: poor
      expect(results[3].adjustment).toBe('reduce_2_sets');

      expect(results[4].score).toBe(12); // Friday: recovered
      expect(results[4].adjustment).toBe('none');
    });
  });

  describe('Integration with workout planning', () => {
    it('should calculate total weekly volume with auto-regulation', () => {
      const plannedSetsPerWorkout = 32;
      const workoutsPerWeek = 6;

      const weeklyAssessments = [
        { score: 12, adjustment: 'none' as VolumeAdjustment },
        { score: 10, adjustment: 'reduce_1_set' as VolumeAdjustment },
        { score: 8, adjustment: 'reduce_2_sets' as VolumeAdjustment },
        { score: 12, adjustment: 'none' as VolumeAdjustment },
        { score: 9, adjustment: 'reduce_1_set' as VolumeAdjustment },
        { score: 11, adjustment: 'reduce_1_set' as VolumeAdjustment },
      ];

      // Assuming 8 exercises with 4 sets each
      const exercisesPerWorkout = 8;
      const setsPerExercise = 4;

      let totalWeeklySets = 0;

      weeklyAssessments.forEach((day) => {
        let workoutSets = 0;
        for (let i = 0; i < exercisesPerWorkout; i++) {
          const adjustedSets = applyVolumeAdjustment(setsPerExercise, day.adjustment);
          workoutSets += adjustedSets;
        }
        totalWeeklySets += workoutSets;
      });

      // Expected: 32 + 24 + 16 + 32 + 24 + 24 = 152 sets
      expect(totalWeeklySets).toBe(152);

      // Compare to planned volume
      const plannedWeeklyVolume = plannedSetsPerWorkout * workoutsPerWeek;
      expect(plannedWeeklyVolume).toBe(192);

      const volumeReduction = plannedWeeklyVolume - totalWeeklySets;
      const reductionPercentage = (volumeReduction / plannedWeeklyVolume) * 100;

      expect(volumeReduction).toBe(40);
      expect(Math.round(reductionPercentage)).toBe(21); // 21% reduction
    });
  });
});
