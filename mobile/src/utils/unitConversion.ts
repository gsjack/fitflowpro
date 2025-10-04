/**
 * Unit Conversion Utilities
 *
 * Weight conversion functions for kg/lbs unit preference.
 * US market compatibility: 1 kg = 2.20462 lbs (exact conversion factor)
 *
 * Architecture:
 * - Backend always stores kg (no API changes needed)
 * - Convert to lbs for display when user preference is lbs
 * - Convert lbs input to kg before sending to backend
 * - Display precision: 1 decimal place (rounded)
 */

import type { WeightUnit } from '../stores/settingsStore';

/** Conversion factor: 1 kg = 2.20462 lbs */
const KG_TO_LBS_FACTOR = 2.20462;

/**
 * Convert kilograms to pounds
 * @param kg - Weight in kilograms
 * @returns Weight in pounds (rounded to 1 decimal)
 */
export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS_FACTOR * 10) / 10;
}

/**
 * Convert pounds to kilograms
 * @param lbs - Weight in pounds
 * @returns Weight in kilograms (rounded to 1 decimal)
 */
export function lbsToKg(lbs: number): number {
  return Math.round((lbs / KG_TO_LBS_FACTOR) * 10) / 10;
}

/**
 * Format weight for display with appropriate unit label
 * @param kg - Weight in kilograms (backend format)
 * @param unit - User's preferred unit
 * @returns Formatted string with unit (e.g., "100.0 kg" or "220.5 lbs")
 */
export function formatWeight(kg: number, unit: WeightUnit): string {
  if (unit === 'lbs') {
    return `${kgToLbs(kg).toFixed(1)} lbs`;
  }
  return `${kg.toFixed(1)} kg`;
}

/**
 * Convert weight from display unit to backend format (kg)
 * @param weight - Weight in user's preferred unit
 * @param unit - User's preferred unit
 * @returns Weight in kilograms (backend format)
 */
export function toBackendWeight(weight: number, unit: WeightUnit): number {
  if (unit === 'lbs') {
    return lbsToKg(weight);
  }
  return weight;
}

/**
 * Convert weight from backend format (kg) to display unit
 * @param kg - Weight in kilograms (backend format)
 * @param unit - User's preferred unit
 * @returns Weight in user's preferred unit
 */
export function fromBackendWeight(kg: number, unit: WeightUnit): number {
  if (unit === 'lbs') {
    return kgToLbs(kg);
  }
  return kg;
}

/**
 * Get unit label for display
 * @param unit - User's preferred unit
 * @returns Unit label (e.g., "kg" or "lbs")
 */
export function getUnitLabel(unit: WeightUnit): string {
  return unit === 'lbs' ? 'lbs' : 'kg';
}

/**
 * Get default weight increment for user's unit
 * @param unit - User's preferred unit
 * @returns Default increment (2.5 kg or 5 lbs)
 */
export function getWeightIncrement(unit: WeightUnit): number {
  return unit === 'lbs' ? 5 : 2.5;
}
