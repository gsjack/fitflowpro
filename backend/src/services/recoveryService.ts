/**
 * Recovery Assessment Service
 *
 * Business logic for daily recovery check-in and auto-regulation:
 * - 3-question assessment (sleep, soreness, motivation) on 1-5 scale
 * - Total score calculation (3-15 range)
 * - Volume adjustment logic per FR-009
 */

import { stmtCreateRecoveryAssessment, calculateVolumeAdjustment, db } from '../database/db.js';

/**
 * Recovery assessment response interface
 */
export interface RecoveryAssessmentResponse {
  total_score: number;
  volume_adjustment: 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day';
}

/**
 * Create a new recovery assessment
 *
 * Calculates total recovery score from 3 subscores (sleep quality,
 * muscle soreness, mental motivation) and determines volume adjustment
 * based on auto-regulation logic per FR-008 and FR-009.
 *
 * Auto-Regulation Logic (FR-009):
 * - Score 12-15: No adjustment (good recovery)
 * - Score 9-11: Reduce by 1 set per exercise
 * - Score 6-8: Reduce by 2 sets per exercise
 * - Score 3-5: Rest day recommended
 *
 * @param userId - ID of the user submitting assessment
 * @param date - Assessment date in ISO format (YYYY-MM-DD)
 * @param sleepQuality - Sleep quality rating (1-5 scale)
 * @param muscleSoreness - Muscle soreness rating (1-5 scale, inverted)
 * @param mentalMotivation - Mental motivation rating (1-5 scale)
 * @returns RecoveryAssessmentResponse with total_score and volume_adjustment
 */
export function createAssessment(
  userId: number,
  date: string,
  sleepQuality: number,
  muscleSoreness: number,
  mentalMotivation: number
): RecoveryAssessmentResponse {
  // Validate input ranges (1-5 per FR-008)
  if (sleepQuality < 1 || sleepQuality > 5) {
    throw new Error('Sleep quality must be between 1 and 5');
  }
  if (muscleSoreness < 1 || muscleSoreness > 5) {
    throw new Error('Muscle soreness must be between 1 and 5');
  }
  if (mentalMotivation < 1 || mentalMotivation > 5) {
    throw new Error('Mental motivation must be between 1 and 5');
  }

  // Validate date format (ISO YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error('Date must be in ISO format (YYYY-MM-DD)');
  }

  // Calculate total score (sum of 3 subscores, range 3-15)
  const totalScore = sleepQuality + muscleSoreness + mentalMotivation;

  // Determine volume adjustment based on total score (FR-009)
  const volumeAdjustment = calculateVolumeAdjustment(totalScore);

  // Check if assessment already exists for this user and date
  const existing = db
    .prepare('SELECT id FROM recovery_assessments WHERE user_id = ? AND date = ?')
    .get(userId, date) as { id: number } | undefined;

  const timestamp = Date.now();

  if (existing) {
    // Update existing assessment
    db.prepare(
      `
      UPDATE recovery_assessments
      SET sleep_quality = ?,
          muscle_soreness = ?,
          mental_motivation = ?,
          total_score = ?,
          volume_adjustment = ?,
          timestamp = ?
      WHERE id = ?
    `
    ).run(
      sleepQuality,
      muscleSoreness,
      mentalMotivation,
      totalScore,
      volumeAdjustment,
      timestamp,
      existing.id
    );
    console.log(`Recovery assessment updated: id=${existing.id}, user=${userId}, date=${date}`);
  } else {
    // Insert new recovery assessment
    stmtCreateRecoveryAssessment.run(
      userId,
      date,
      sleepQuality,
      muscleSoreness,
      mentalMotivation,
      totalScore,
      volumeAdjustment,
      timestamp
    );
    console.log(`Recovery assessment created: user=${userId}, date=${date}`);
  }

  // Log assessment for monitoring
  console.log(
    `Recovery assessment created: user=${userId}, date=${date}, ` +
      `score=${totalScore} (sleep=${sleepQuality}, soreness=${muscleSoreness}, ` +
      `motivation=${mentalMotivation}), adjustment=${volumeAdjustment}`
  );

  return {
    total_score: totalScore,
    volume_adjustment: volumeAdjustment,
  };
}
