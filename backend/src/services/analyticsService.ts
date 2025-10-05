/**
 * Analytics Service (T047-T049)
 *
 * Provides analytics data for 1RM progression, volume trends, and consistency metrics.
 * Uses prepared statements from db.ts for optimal performance.
 */

import { stmt1RMProgression, stmtVolumeTrends, stmtConsistencyMetrics } from '../database/db.js';
import { VOLUME_LANDMARKS } from '../utils/constants.js';
import { roundToDecimals } from '../utils/calculations.js';

/**
 * 1RM Progression Data Point
 */
export interface OneRMProgressionPoint {
  date: string;
  estimated_1rm: number;
}

/**
 * Volume Trends Data Point
 */
export interface VolumeTrendsPoint {
  week: string;
  total_sets: number;
  mev: number;
  mav: number;
  mrv: number;
}

/**
 * Consistency Metrics
 */
export interface ConsistencyMetrics {
  adherence_rate: number;
  avg_session_duration: number;
  total_workouts: number;
}

/**
 * Get 1RM progression for a specific exercise over time (T047)
 *
 * Calculates estimated 1RM using Epley formula with RIR adjustment:
 * 1RM = weight * (1 + (reps - rir) / 30)
 *
 * @param userId User ID
 * @param exerciseId Exercise ID
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Array of {date, estimated_1rm} sorted by date
 */
export function get1RMProgression(
  userId: number,
  exerciseId: number,
  startDate: string,
  endDate: string
): OneRMProgressionPoint[] {
  const results = stmt1RMProgression.all(userId, exerciseId, startDate, endDate) as Array<{
    date: string;
    estimated_1rm: number;
  }>;

  return results.map((row) => ({
    date: row.date,
    estimated_1rm: roundToDecimals(row.estimated_1rm, 1),
  }));
}

/**
 * Get volume trends for a muscle group over time (T048)
 *
 * Groups sets by ISO week and includes MEV/MAV/MRV landmarks.
 *
 * @param userId User ID
 * @param muscleGroup Muscle group name (e.g., 'chest', 'back_lats')
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Array of {week, total_sets, mev, mav, mrv} sorted by week
 */
export function getVolumeTrends(
  userId: number,
  muscleGroup: string,
  startDate: string,
  endDate: string
): VolumeTrendsPoint[] {
  const results = stmtVolumeTrends.all(userId, startDate, endDate, muscleGroup) as Array<{
    week: string;
    total_sets: number;
  }>;

  // Get volume landmarks for this muscle group
  const landmarks = VOLUME_LANDMARKS[muscleGroup] || { mev: 0, mav: 0, mrv: 0 };

  return results.map((row) => ({
    week: row.week,
    total_sets: row.total_sets,
    mev: landmarks.mev,
    mav: landmarks.mav,
    mrv: landmarks.mrv,
  }));
}

/**
 * Get consistency metrics for a user (T049)
 *
 * Calculates:
 * - adherence_rate: completed_workouts / total_workouts (scheduled)
 * - avg_session_duration: mean duration in seconds
 * - total_workouts: count of all workouts
 *
 * @param userId User ID
 * @returns Consistency metrics object
 */
export function getConsistencyMetrics(userId: number): ConsistencyMetrics {
  const result = stmtConsistencyMetrics.get(userId) as {
    completed_workouts: number;
    total_workouts: number;
    avg_session_duration: number | null;
  };

  // Calculate adherence rate (avoid division by zero)
  const adherenceRate =
    result.total_workouts > 0 ? result.completed_workouts / result.total_workouts : 0;

  return {
    adherence_rate: roundToDecimals(adherenceRate, 3),
    avg_session_duration: result.avg_session_duration || 0,
    total_workouts: result.total_workouts,
  };
}
