/**
 * Scientific Calculation Utilities
 *
 * Centralized formulas for 1RM estimation, VO2max calculation, and other
 * scientific computations used across multiple services.
 */

/**
 * Calculate estimated 1RM using Epley formula with RIR adjustment
 *
 * Formula: 1RM = weight × (1 + (reps - rir) / 30)
 *
 * @param weight_kg - Weight lifted in kilograms
 * @param reps - Number of repetitions completed
 * @param rir - Reps in Reserve (0-4)
 * @returns Estimated 1RM in kilograms
 *
 * @example
 * calculateOneRepMax(100, 8, 2) // 100kg × 8 reps @ RIR 2
 * // = 100 × (1 + (8-2)/30) = 100 × 1.2 = 120kg
 */
export function calculateOneRepMax(weight_kg: number, reps: number, rir: number): number {
  return weight_kg * (1 + (reps - rir) / 30);
}

/**
 * Round number to specified decimal places
 *
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 1)
 * @returns Rounded number
 */
export function roundToDecimals(value: number, decimals: number = 1): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Calculate VO2max using Cooper formula
 *
 * Formula: VO2max = 15.3 × (max_hr / resting_hr)
 * Where: max_hr = 220 - age
 *
 * @param age - User age in years
 * @param resting_hr - Resting heart rate (default: 60 bpm)
 * @returns Estimated VO2max in ml/kg/min
 */
export function calculateVO2max(age: number, resting_hr: number = 60): number {
  const max_hr = 220 - age;
  return 15.3 * (max_hr / resting_hr);
}

/**
 * Clamp value between min and max
 *
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
