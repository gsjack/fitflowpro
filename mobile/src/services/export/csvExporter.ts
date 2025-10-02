/**
 * CSV Export Service (T054)
 *
 * Exports workout data, analytics, and recovery assessments to CSV format.
 * Uses React Native Share API for file sharing.
 *
 * CSV Format:
 * - Workouts: date, exercise, sets, reps, weight, rir, volume
 * - Analytics: date, lift, estimated_1rm, weekly_volume_by_muscle
 * - Recovery: date, sleep, soreness, motivation, total_score, adjustment
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAllAsync } from '../../database/db';
import type { RecoveryAssessment } from '../../database/db';
import { get1RMProgression, getVolumeTrends } from '../api/analyticsApi';

/**
 * Escape CSV field value (handle commas, quotes, newlines)
 * @param value Field value
 * @returns Escaped CSV field
 */
function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert array of objects to CSV string
 * @param headers Column headers
 * @param rows Data rows
 * @returns CSV string
 */
function arrayToCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerRow = headers.map(escapeCsvField).join(',');
  const dataRows = rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');

  return `${headerRow}\n${dataRows}`;
}

/**
 * Export workouts to CSV
 * Columns: date, exercise, sets, reps, weight, rir, volume
 *
 * @param userId User ID
 * @param startDate Optional start date (ISO format YYYY-MM-DD)
 * @param endDate Optional end date (ISO format YYYY-MM-DD)
 * @returns Promise resolving to CSV file URI
 */
export async function exportWorkoutsCsv(
  userId: number,
  startDate?: string,
  endDate?: string
): Promise<string> {
  // Get workouts with date filters
  let query = `
    SELECT
      w.date,
      e.name as exercise_name,
      s.set_number,
      s.reps,
      s.weight_kg,
      s.rir,
      (s.weight_kg * s.reps) as volume_kg
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    JOIN exercises e ON s.exercise_id = e.id
    WHERE w.user_id = ?
  `;

  const params: (number | string)[] = [userId];

  if (startDate) {
    query += ' AND w.date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND w.date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY w.date ASC, s.workout_id, s.set_number';

  const results = await getAllAsync<{
    date: string;
    exercise_name: string;
    set_number: number;
    reps: number;
    weight_kg: number;
    rir: number;
    volume_kg: number;
  }>(query, params);

  // Convert to CSV format
  const headers = ['Date', 'Exercise', 'Set', 'Reps', 'Weight (kg)', 'RIR', 'Volume (kg)'];
  const rows = results.map((row) => [
    row.date,
    row.exercise_name,
    row.set_number,
    row.reps,
    row.weight_kg,
    row.rir,
    row.volume_kg,
  ]);

  const csvContent = arrayToCsv(headers, rows);

  // Write to temporary file
  const filename = `fitflow_workouts_${new Date().toISOString().split('T')[0]}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  console.log('[CSVExporter] Workouts exported:', { fileUri, rows: results.length });

  return fileUri;
}

/**
 * Export analytics to CSV
 * Columns: date, lift, estimated_1rm, weekly_volume_by_muscle
 *
 * @param exerciseId Exercise ID for 1RM progression
 * @param muscleGroup Muscle group for volume trends
 * @param startDate Start date (ISO format YYYY-MM-DD)
 * @param endDate End date (ISO format YYYY-MM-DD)
 * @returns Promise resolving to CSV file URI
 */
export async function exportAnalyticsCsv(
  exerciseId: number,
  muscleGroup: string,
  startDate: string,
  endDate: string
): Promise<string> {
  // Fetch analytics data from API
  const [oneRMData, volumeData] = await Promise.all([
    get1RMProgression(exerciseId, startDate, endDate),
    getVolumeTrends(muscleGroup, startDate, endDate),
  ]);

  // Merge data by date/week (simplified - assuming weekly alignment)
  const headers = ['Date', 'Exercise', 'Estimated 1RM (kg)', 'Weekly Volume (sets)'];
  const rows: (string | number | null)[][] = [];

  // Add 1RM data
  oneRMData.forEach((point) => {
    rows.push([point.date, `Exercise ${exerciseId}`, point.estimated_1rm, null]);
  });

  // Add volume data (weekly)
  volumeData.forEach((point) => {
    rows.push([point.week, muscleGroup, null, point.total_sets]);
  });

  const csvContent = arrayToCsv(headers, rows);

  // Write to temporary file
  const filename = `fitflow_analytics_${new Date().toISOString().split('T')[0]}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  console.log('[CSVExporter] Analytics exported:', {
    fileUri,
    oneRMPoints: oneRMData.length,
    volumePoints: volumeData.length,
  });

  return fileUri;
}

/**
 * Export recovery assessments to CSV
 * Columns: date, sleep, soreness, motivation, total_score, adjustment
 *
 * @param userId User ID
 * @param startDate Optional start date (ISO format YYYY-MM-DD)
 * @param endDate Optional end date (ISO format YYYY-MM-DD)
 * @returns Promise resolving to CSV file URI
 */
export async function exportRecoveryCsv(
  userId: number,
  startDate?: string,
  endDate?: string
): Promise<string> {
  // Get recovery assessments with date filters
  let query = `
    SELECT
      date,
      sleep_quality,
      muscle_soreness,
      mental_motivation,
      total_score,
      volume_adjustment
    FROM recovery_assessments
    WHERE user_id = ?
  `;

  const params: (number | string)[] = [userId];

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY date ASC';

  const results = await getAllAsync<RecoveryAssessment>(query, params);

  // Convert to CSV format
  const headers = [
    'Date',
    'Sleep Quality (1-5)',
    'Muscle Soreness (1-5)',
    'Mental Motivation (1-5)',
    'Total Score',
    'Volume Adjustment',
  ];

  const rows = results.map((row) => [
    row.date,
    row.sleep_quality,
    row.muscle_soreness,
    row.mental_motivation,
    row.total_score,
    row.volume_adjustment || 'none',
  ]);

  const csvContent = arrayToCsv(headers, rows);

  // Write to temporary file
  const filename = `fitflow_recovery_${new Date().toISOString().split('T')[0]}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  console.log('[CSVExporter] Recovery exported:', { fileUri, rows: results.length });

  return fileUri;
}

/**
 * Share CSV file using device share dialog
 *
 * @param fileUri File URI to share
 * @param mimeType MIME type (default: text/csv)
 * @returns Promise resolving when share completes
 */
export async function shareCsvFile(fileUri: string, mimeType: string = 'text/csv'): Promise<void> {
  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle: 'Export FitFlow Data',
    UTI: 'public.comma-separated-values-text', // iOS UTI for CSV
  });

  console.log('[CSVExporter] File shared successfully:', fileUri);
}

/**
 * Export all workout data and share (convenience method)
 *
 * @param userId User ID
 * @param startDate Optional start date
 * @param endDate Optional end date
 * @returns Promise resolving when export completes
 */
export async function exportAndShareWorkouts(
  userId: number,
  startDate?: string,
  endDate?: string
): Promise<void> {
  const fileUri = await exportWorkoutsCsv(userId, startDate, endDate);
  await shareCsvFile(fileUri);
}

/**
 * Export all recovery data and share (convenience method)
 *
 * @param userId User ID
 * @param startDate Optional start date
 * @param endDate Optional end date
 * @returns Promise resolving when export completes
 */
export async function exportAndShareRecovery(
  userId: number,
  startDate?: string,
  endDate?: string
): Promise<void> {
  const fileUri = await exportRecoveryCsv(userId, startDate, endDate);
  await shareCsvFile(fileUri);
}
