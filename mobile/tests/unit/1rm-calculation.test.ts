/**
 * Unit Test T082: 1RM Calculation
 *
 * Tests Epley formula with RIR adjustment:
 * 1RM = weight × (1 + (reps - rir) / 30)
 */

import { describe, it, expect } from 'vitest';

/**
 * Calculate estimated 1RM using Epley formula with RIR adjustment
 *
 * @param weight - Weight lifted in kg
 * @param reps - Number of repetitions performed
 * @param rir - Reps in reserve (0-4)
 * @returns Estimated 1RM in kg
 */
function calculateOneRepMax(weight: number, reps: number, rir: number): number {
  if (weight <= 0) {
    throw new Error('Weight must be positive');
  }
  if (reps <= 0) {
    throw new Error('Reps must be positive');
  }
  if (rir < 0 || rir > 4) {
    throw new Error('RIR must be between 0 and 4');
  }

  // Epley formula with RIR adjustment
  // Effective reps = actual reps - rir (how many reps until failure)
  const effectiveReps = reps - rir;

  // 1RM = weight × (1 + effectiveReps / 30)
  const oneRM = weight * (1 + effectiveReps / 30);

  return Math.round(oneRM * 10) / 10; // Round to 1 decimal place
}

describe('Unit Test: 1RM Calculation (T082)', () => {
  describe('Epley formula with RIR adjustment', () => {
    it('should calculate 1RM for 100kg × 8 reps @ RIR 2', () => {
      const result = calculateOneRepMax(100, 8, 2);

      // Effective reps = 8 - 2 = 6
      // 1RM = 100 × (1 + 6/30) = 100 × 1.2 = 120kg
      expect(result).toBe(120);
    });

    it('should calculate 1RM for 100kg × 8 reps @ RIR 0 (failure)', () => {
      const result = calculateOneRepMax(100, 8, 0);

      // Effective reps = 8 - 0 = 8
      // 1RM = 100 × (1 + 8/30) = 100 × 1.267 = 126.7kg
      expect(result).toBe(126.7);
    });

    it('should calculate 1RM for 80kg × 10 reps @ RIR 3', () => {
      const result = calculateOneRepMax(80, 10, 3);

      // Effective reps = 10 - 3 = 7
      // 1RM = 80 × (1 + 7/30) = 80 × 1.233 = 98.7kg
      expect(result).toBeCloseTo(98.7, 1);
    });

    it('should handle 1RM test (1 rep @ RIR 0)', () => {
      const result = calculateOneRepMax(150, 1, 0);

      // Effective reps = 1 - 0 = 1
      // 1RM = 150 × (1 + 1/30) = 150 × 1.033 = 155kg
      expect(result).toBeCloseTo(155, 0);
    });

    it('should handle heavy singles with reserve (1 rep @ RIR 2)', () => {
      const result = calculateOneRepMax(140, 1, 2);

      // Effective reps = 1 - 2 = -1 (conservative estimate)
      // 1RM = 140 × (1 + (-1)/30) = 140 × 0.967 = 135.3kg
      expect(result).toBeCloseTo(135.3, 1);
    });

    it('should handle high rep sets (15 reps @ RIR 1)', () => {
      const result = calculateOneRepMax(60, 15, 1);

      // Effective reps = 15 - 1 = 14
      // 1RM = 60 × (1 + 14/30) = 60 × 1.467 = 88kg
      expect(result).toBe(88);
    });
  });

  describe('Edge cases and validation', () => {
    it('should throw error for zero weight', () => {
      expect(() => calculateOneRepMax(0, 8, 2)).toThrow('Weight must be positive');
    });

    it('should throw error for negative weight', () => {
      expect(() => calculateOneRepMax(-100, 8, 2)).toThrow('Weight must be positive');
    });

    it('should throw error for zero reps', () => {
      expect(() => calculateOneRepMax(100, 0, 2)).toThrow('Reps must be positive');
    });

    it('should throw error for negative reps', () => {
      expect(() => calculateOneRepMax(100, -8, 2)).toThrow('Reps must be positive');
    });

    it('should throw error for RIR > 4', () => {
      expect(() => calculateOneRepMax(100, 8, 5)).toThrow('RIR must be between 0 and 4');
    });

    it('should throw error for negative RIR', () => {
      expect(() => calculateOneRepMax(100, 8, -1)).toThrow('RIR must be between 0 and 4');
    });
  });

  describe('Boundary conditions', () => {
    it('should handle minimum RIR (0 - failure)', () => {
      const result = calculateOneRepMax(100, 5, 0);
      // 1RM = 100 × (1 + 5/30) = 100 × 1.167 = 116.7kg
      expect(result).toBeCloseTo(116.7, 1);
    });

    it('should handle maximum RIR (4)', () => {
      const result = calculateOneRepMax(100, 8, 4);
      // Effective reps = 8 - 4 = 4
      // 1RM = 100 × (1 + 4/30) = 100 × 1.133 = 113.3kg
      expect(result).toBeCloseTo(113.3, 1);
    });

    it('should handle very heavy weight', () => {
      const result = calculateOneRepMax(500, 3, 1);
      // Effective reps = 3 - 1 = 2
      // 1RM = 500 × (1 + 2/30) = 500 × 1.067 = 533.3kg
      expect(result).toBeCloseTo(533.3, 1);
    });

    it('should handle very light weight', () => {
      const result = calculateOneRepMax(2.5, 20, 2);
      // Effective reps = 20 - 2 = 18
      // 1RM = 2.5 × (1 + 18/30) = 2.5 × 1.6 = 4kg
      expect(result).toBe(4);
    });
  });

  describe('Realistic training scenarios', () => {
    it('should estimate bench press progression (week 1 to week 4)', () => {
      // Week 1: 100kg × 8 @ RIR 2
      const week1 = calculateOneRepMax(100, 8, 2);
      expect(week1).toBe(120);

      // Week 2: 102.5kg × 8 @ RIR 2
      const week2 = calculateOneRepMax(102.5, 8, 2);
      expect(week2).toBe(123);

      // Week 3: 105kg × 8 @ RIR 1
      const week3 = calculateOneRepMax(105, 8, 1);
      expect(week3).toBeCloseTo(128.6, 1);

      // Week 4: 107.5kg × 8 @ RIR 0
      const week4 = calculateOneRepMax(107.5, 8, 0);
      expect(week4).toBeCloseTo(136.2, 1);

      // Verify progression
      expect(week4).toBeGreaterThan(week1);
      expect(week4 - week1).toBeGreaterThan(10); // At least 10kg improvement
    });

    it('should handle deload week (lighter weight, higher RIR)', () => {
      // Normal week: 100kg × 8 @ RIR 2
      const normal = calculateOneRepMax(100, 8, 2);

      // Deload week: 80kg × 8 @ RIR 3
      const deload = calculateOneRepMax(80, 8, 3);

      // Deload 1RM should be lower
      expect(deload).toBeLessThan(normal);
      expect(deload).toBeCloseTo(98.7, 1);
    });

    it('should compare compound vs isolation exercise estimates', () => {
      // Compound (Bench Press): 100kg × 6 @ RIR 2
      const compound = calculateOneRepMax(100, 6, 2);

      // Isolation (Cable Flyes): 20kg × 12 @ RIR 3
      const isolation = calculateOneRepMax(20, 12, 3);

      expect(compound).toBe(113.3);
      expect(isolation).toBe(26);

      // Compound 1RM should be much higher
      expect(compound).toBeGreaterThan(isolation * 3);
    });
  });

  describe('Comparison with actual 1RM', () => {
    it('should estimate within 5% of true 1RM for moderate rep ranges', () => {
      // Assume true 1RM = 120kg
      const true1RM = 120;

      // Test at 85% (102kg) for 6 reps @ RIR 1
      const estimated = calculateOneRepMax(102, 6, 1);

      const errorPercentage = Math.abs((estimated - true1RM) / true1RM) * 100;
      expect(errorPercentage).toBeLessThan(5);
    });

    it('should be conservative for high RIR (safer estimate)', () => {
      // If someone lifts 100kg × 8 @ RIR 4 (easy)
      const conservative = calculateOneRepMax(100, 8, 4);

      // vs 100kg × 8 @ RIR 0 (failure)
      const maxEffort = calculateOneRepMax(100, 8, 0);

      // Conservative should be lower
      expect(conservative).toBeLessThan(maxEffort);
      expect(maxEffort - conservative).toBeGreaterThan(10);
    });
  });

  describe('Return value precision', () => {
    it('should round to 1 decimal place', () => {
      const result = calculateOneRepMax(100, 7, 2);
      // 1RM = 100 × (1 + 5/30) = 100 × 1.167 = 116.667...
      expect(result).toBe(116.7);
      expect(result.toString()).toMatch(/^\d+\.\d$/);
    });

    it('should handle whole numbers correctly', () => {
      const result = calculateOneRepMax(100, 8, 2);
      expect(result).toBe(120);
    });
  });

  describe('Inverse calculation (find working weight from 1RM)', () => {
    it('should find working weight for target reps and RIR', () => {
      const oneRM = 120;
      const targetReps = 8;
      const targetRIR = 2;

      // Reverse formula: weight = 1RM / (1 + (reps - rir) / 30)
      const effectiveReps = targetReps - targetRIR;
      const workingWeight = oneRM / (1 + effectiveReps / 30);

      expect(Math.round(workingWeight)).toBe(100);

      // Verify by calculating 1RM back
      const verified1RM = calculateOneRepMax(Math.round(workingWeight), targetReps, targetRIR);
      expect(verified1RM).toBe(oneRM);
    });
  });
});
