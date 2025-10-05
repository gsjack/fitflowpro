/**
 * Validation Utilities
 *
 * Centralized validation functions to eliminate duplication and ensure
 * consistent error messages across services.
 */

import { WEIGHT_RANGE, SET_VALIDATION, RECOVERY_VALIDATION } from './constants.js';

/**
 * ISO 8601 date format regex (YYYY-MM-DD)
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates ISO 8601 date format (YYYY-MM-DD)
 *
 * @param date - Date string to validate
 * @throws Error if date format is invalid
 */
export function validateDateFormat(date: string): void {
  if (!ISO_DATE_REGEX.test(date)) {
    throw new Error('Date must be in ISO format (YYYY-MM-DD)');
  }
}

/**
 * Validates and formats date to ISO 8601 (YYYY-MM-DD)
 * Returns today's date if no date provided
 *
 * @param date - Optional date string
 * @returns Formatted date string (YYYY-MM-DD)
 * @throws Error if date is invalid or in the future
 */
export function validateAndFormatDate(date: string | undefined): string {
  if (date === undefined || date === '') {
    // Default to today
    return new Date().toISOString().split('T')[0]!;
  }

  // Validate format
  validateDateFormat(date);

  // Validate date is not in the future
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inputDate > today) {
    throw new Error('Date cannot be in the future');
  }

  return date;
}

/**
 * Validates body weight is within physiological range (30-300kg)
 *
 * @param weight_kg - Weight in kilograms
 * @throws Error if weight is outside valid range
 */
export function validateBodyWeight(weight_kg: number): void {
  if (weight_kg < WEIGHT_RANGE.MIN || weight_kg > WEIGHT_RANGE.MAX) {
    throw new Error(`Weight must be between ${WEIGHT_RANGE.MIN}kg and ${WEIGHT_RANGE.MAX}kg`);
  }
}

/**
 * Validates set logging parameters (weight, reps, RIR)
 *
 * @param weightKg - Weight lifted in kilograms (0-500)
 * @param reps - Number of repetitions (1-50)
 * @param rir - Reps in Reserve (0-4)
 * @throws Error if any parameter is outside valid range
 */
export function validateSetParameters(weightKg: number, reps: number, rir: number): void {
  if (weightKg < SET_VALIDATION.WEIGHT_KG.MIN || weightKg > SET_VALIDATION.WEIGHT_KG.MAX) {
    throw new Error(
      `Weight must be between ${SET_VALIDATION.WEIGHT_KG.MIN} and ${SET_VALIDATION.WEIGHT_KG.MAX} kg`
    );
  }
  if (reps < SET_VALIDATION.REPS.MIN || reps > SET_VALIDATION.REPS.MAX) {
    throw new Error(
      `Reps must be between ${SET_VALIDATION.REPS.MIN} and ${SET_VALIDATION.REPS.MAX}`
    );
  }
  if (rir < SET_VALIDATION.RIR.MIN || rir > SET_VALIDATION.RIR.MAX) {
    throw new Error(`RIR must be between ${SET_VALIDATION.RIR.MIN} and ${SET_VALIDATION.RIR.MAX}`);
  }
}

/**
 * Validates notes field length
 *
 * @param notes - Optional notes string
 * @throws Error if notes exceed maximum length
 */
export function validateNotes(notes: string | undefined): void {
  if (notes && notes.length > SET_VALIDATION.NOTES_MAX_LENGTH) {
    throw new Error(`Notes must be ${SET_VALIDATION.NOTES_MAX_LENGTH} characters or less`);
  }
}

/**
 * Validates recovery assessment score (1-5 scale)
 *
 * @param score - Recovery subscore value
 * @param fieldName - Name of the field being validated (for error message)
 * @throws Error if score is outside valid range
 */
export function validateRecoveryScore(score: number, fieldName: string): void {
  if (score < RECOVERY_VALIDATION.MIN || score > RECOVERY_VALIDATION.MAX) {
    throw new Error(
      `${fieldName} must be between ${RECOVERY_VALIDATION.MIN} and ${RECOVERY_VALIDATION.MAX}`
    );
  }
}

/**
 * Validates numeric range
 *
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param fieldName - Name of the field being validated
 * @throws Error if value is outside range
 */
export function validateRange(value: number, min: number, max: number, fieldName: string): void {
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
}
