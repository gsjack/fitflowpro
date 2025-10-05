/**
 * Shared Constants
 *
 * Centralized constants used across multiple services to ensure consistency
 * and eliminate duplication.
 */

/**
 * Volume landmarks for muscle groups (Renaissance Periodization methodology)
 *
 * MEV (Minimum Effective Volume): Lower threshold for growth
 * MAV (Maximum Adaptive Volume): Optimal range
 * MRV (Maximum Recoverable Volume): Upper limit before overtraining
 */
export const VOLUME_LANDMARKS: Record<string, { mev: number; mav: number; mrv: number }> = {
  chest: { mev: 8, mav: 14, mrv: 22 },
  back_lats: { mev: 10, mav: 16, mrv: 26 },
  back_traps: { mev: 6, mav: 12, mrv: 20 },
  shoulders_front: { mev: 4, mav: 8, mrv: 14 },
  shoulders_side: { mev: 8, mav: 16, mrv: 26 },
  shoulders_rear: { mev: 8, mav: 14, mrv: 22 },
  biceps: { mev: 6, mav: 12, mrv: 20 },
  triceps: { mev: 6, mav: 12, mrv: 22 },
  quads: { mev: 8, mav: 14, mrv: 24 },
  hamstrings: { mev: 6, mav: 12, mrv: 20 },
  glutes: { mev: 6, mav: 12, mrv: 20 },
  calves: { mev: 8, mav: 14, mrv: 22 },
  abs: { mev: 8, mav: 16, mrv: 28 },
  // Aliases for compatibility
  front_delts: { mev: 4, mav: 8, mrv: 14 },
  side_delts: { mev: 8, mav: 16, mrv: 26 },
  rear_delts: { mev: 8, mav: 14, mrv: 22 },
};

/**
 * Valid muscle group names for validation
 */
export const VALID_MUSCLE_GROUPS = [
  'chest',
  'back',
  'lats',
  'mid_back',
  'rear_delts',
  'front_delts',
  'side_delts',
  'triceps',
  'biceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'obliques',
] as const;

/**
 * Bcrypt cost factor (constitutional requirement: cost >= 12)
 */
export const BCRYPT_COST = 12;

/**
 * JWT expiration time (30 days - justified violation for home server use case)
 */
export const JWT_EXPIRATION = '30d';

/**
 * Body weight validation ranges (kg)
 */
export const WEIGHT_RANGE = {
  MIN: 30,
  MAX: 300,
} as const;

/**
 * Set logging validation ranges
 */
export const SET_VALIDATION = {
  WEIGHT_KG: { MIN: 0, MAX: 500 },
  REPS: { MIN: 1, MAX: 50 },
  RIR: { MIN: 0, MAX: 4 },
  NOTES_MAX_LENGTH: 500,
} as const;

/**
 * Recovery assessment validation ranges (1-5 scale)
 */
export const RECOVERY_VALIDATION = {
  MIN: 1,
  MAX: 5,
} as const;
