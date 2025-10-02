/**
 * Unit Tests for CSV Export Service (T085)
 *
 * Validates CSV format correctness for workout, analytics, and recovery exports.
 * Tests special character escaping (commas, quotes, newlines).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Mock expo modules
vi.mock('expo-file-system', () => ({
  cacheDirectory: '/mock/cache/',
  EncodingType: {
    UTF8: 'utf8',
  },
  writeAsStringAsync: vi.fn(),
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn(),
  shareAsync: vi.fn(),
}));

// Mock database queries
vi.mock('../../src/database/db', () => ({
  getAllAsync: vi.fn(),
}));

// Mock analytics API
vi.mock('../../src/services/api/analyticsApi', () => ({
  get1RMProgression: vi.fn(),
  getVolumeTrends: vi.fn(),
}));

import { getAllAsync } from '../../src/database/db';
import { get1RMProgression, getVolumeTrends } from '../../src/services/api/analyticsApi';
import {
  exportWorkoutsCsv,
  exportAnalyticsCsv,
  exportRecoveryCsv,
  shareCsvFile,
} from '../../src/services/export/csvExporter';

describe('CSV Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportWorkoutsCsv', () => {
    it('should export workouts with correct CSV format', async () => {
      // Mock workout data
      const mockWorkouts = [
        {
          date: '2025-10-01',
          exercise_name: 'Barbell Bench Press',
          set_number: 1,
          reps: 8,
          weight_kg: 100,
          rir: 2,
          volume_kg: 800,
        },
        {
          date: '2025-10-01',
          exercise_name: 'Barbell Bench Press',
          set_number: 2,
          reps: 7,
          weight_kg: 100,
          rir: 1,
          volume_kg: 700,
        },
      ];

      vi.mocked(getAllAsync).mockResolvedValue(mockWorkouts);

      const fileUri = await exportWorkoutsCsv(1, '2025-10-01', '2025-10-01');

      // Verify file write
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('fitflow_workouts_'),
        expect.stringContaining('Date,Exercise,Set,Reps,Weight (kg),RIR,Volume (kg)'),
        { encoding: 'utf8' }
      );

      // Verify CSV content
      const csvContent = vi.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];
      expect(csvContent).toContain('2025-10-01,Barbell Bench Press,1,8,100,2,800');
      expect(csvContent).toContain('2025-10-01,Barbell Bench Press,2,7,100,1,700');

      expect(fileUri).toContain('/mock/cache/fitflow_workouts_');
    });

    it('should handle exercise names with commas', async () => {
      const mockWorkouts = [
        {
          date: '2025-10-01',
          exercise_name: 'Cable Flyes, High to Low',
          set_number: 1,
          reps: 12,
          weight_kg: 20,
          rir: 3,
          volume_kg: 240,
        },
      ];

      vi.mocked(getAllAsync).mockResolvedValue(mockWorkouts);

      await exportWorkoutsCsv(1);

      const csvContent = vi.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];

      // Exercise name with comma should be quoted
      expect(csvContent).toContain('"Cable Flyes, High to Low"');
    });

    it('should handle exercise names with quotes', async () => {
      const mockWorkouts = [
        {
          date: '2025-10-01',
          exercise_name: 'Romanian "RDL" Deadlift',
          set_number: 1,
          reps: 10,
          weight_kg: 80,
          rir: 2,
          volume_kg: 800,
        },
      ];

      vi.mocked(getAllAsync).mockResolvedValue(mockWorkouts);

      await exportWorkoutsCsv(1);

      const csvContent = vi.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];

      // Quotes should be escaped as double quotes
      expect(csvContent).toContain('"Romanian ""RDL"" Deadlift"');
    });

    it('should handle empty results', async () => {
      vi.mocked(getAllAsync).mockResolvedValue([]);

      await exportWorkoutsCsv(1);

      const csvContent = vi.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];

      // Should have headers but no data rows
      expect(csvContent).toBe('Date,Exercise,Set,Reps,Weight (kg),RIR,Volume (kg)\n');
    });
  });

  describe('exportAnalyticsCsv', () => {
    it('should export analytics with correct CSV format', async () => {
      const mock1RMData = [
        { date: '2025-10-01', estimated_1rm: 120 },
        { date: '2025-10-08', estimated_1rm: 125 },
      ];

      const mockVolumeData = [
        { week: '2025-W40', total_sets: 14, mev: 8, mav: 14, mrv: 22 },
        { week: '2025-W41', total_sets: 16, mev: 8, mav: 14, mrv: 22 },
      ];

      vi.mocked(get1RMProgression).mockResolvedValue(mock1RMData);
      vi.mocked(getVolumeTrends).mockResolvedValue(mockVolumeData);

      const fileUri = await exportAnalyticsCsv(1, 'chest', '2025-10-01', '2025-10-15');

      // Verify API calls
      expect(get1RMProgression).toHaveBeenCalledWith(1, '2025-10-01', '2025-10-15');
      expect(getVolumeTrends).toHaveBeenCalledWith('chest', '2025-10-01', '2025-10-15');

      // Verify CSV content
      const csvContent = vi.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];
      expect(csvContent).toContain('Date,Exercise,Estimated 1RM (kg),Weekly Volume (sets)');
      expect(csvContent).toContain('2025-10-01,Exercise 1,120,');
      expect(csvContent).toContain('2025-W40,chest,,14');

      expect(fileUri).toContain('/mock/cache/fitflow_analytics_');
    });
  });

  describe('exportRecoveryCsv', () => {
    it('should export recovery assessments with correct CSV format', async () => {
      const mockRecovery = [
        {
          date: '2025-10-01',
          sleep_quality: 4,
          muscle_soreness: 3,
          mental_motivation: 5,
          total_score: 12,
          volume_adjustment: 'none',
        },
        {
          date: '2025-10-02',
          sleep_quality: 2,
          muscle_soreness: 4,
          mental_motivation: 2,
          total_score: 8,
          volume_adjustment: 'reduce_2_sets',
        },
      ];

      vi.mocked(getAllAsync).mockResolvedValue(mockRecovery);

      const fileUri = await exportRecoveryCsv(1, '2025-10-01', '2025-10-02');

      // Verify CSV content
      const csvContent = vi.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];
      expect(csvContent).toContain(
        'Date,Sleep Quality (1-5),Muscle Soreness (1-5),Mental Motivation (1-5),Total Score,Volume Adjustment'
      );
      expect(csvContent).toContain('2025-10-01,4,3,5,12,none');
      expect(csvContent).toContain('2025-10-02,2,4,2,8,reduce_2_sets');

      expect(fileUri).toContain('/mock/cache/fitflow_recovery_');
    });

    it('should handle null volume_adjustment', async () => {
      const mockRecovery = [
        {
          date: '2025-10-01',
          sleep_quality: 3,
          muscle_soreness: 3,
          mental_motivation: 3,
          total_score: 9,
          volume_adjustment: null,
        },
      ];

      vi.mocked(getAllAsync).mockResolvedValue(mockRecovery);

      await exportRecoveryCsv(1);

      const csvContent = vi.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];

      // Null volume_adjustment should default to "none"
      expect(csvContent).toContain('2025-10-01,3,3,3,9,none');
    });
  });

  describe('shareCsvFile', () => {
    it('should share CSV file when sharing is available', async () => {
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);

      await shareCsvFile('/mock/cache/test.csv');

      expect(Sharing.shareAsync).toHaveBeenCalledWith('/mock/cache/test.csv', {
        mimeType: 'text/csv',
        dialogTitle: 'Export FitFlow Data',
        UTI: 'public.comma-separated-values-text',
      });
    });

    it('should throw error when sharing is not available', async () => {
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);

      await expect(shareCsvFile('/mock/cache/test.csv')).rejects.toThrow(
        'Sharing is not available on this device'
      );
    });

    it('should use custom MIME type', async () => {
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);

      await shareCsvFile('/mock/cache/test.csv', 'application/octet-stream');

      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        '/mock/cache/test.csv',
        expect.objectContaining({
          mimeType: 'application/octet-stream',
        })
      );
    });
  });

  describe('CSV field escaping', () => {
    it('should escape newlines in exercise notes', async () => {
      const mockWorkouts = [
        {
          date: '2025-10-01',
          exercise_name: 'Test Exercise\nWith Newline',
          set_number: 1,
          reps: 8,
          weight_kg: 100,
          rir: 2,
          volume_kg: 800,
        },
      ];

      vi.mocked(getAllAsync).mockResolvedValue(mockWorkouts);

      await exportWorkoutsCsv(1);

      const csvContent = vi.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];

      // Fields with newlines should be quoted
      expect(csvContent).toContain('"Test Exercise\nWith Newline"');
    });

    it('should handle null and undefined values', async () => {
      const mockWorkouts = [
        {
          date: '2025-10-01',
          exercise_name: 'Test',
          set_number: 1,
          reps: 8,
          weight_kg: null,
          rir: undefined,
          volume_kg: 0,
        },
      ];

      vi.mocked(getAllAsync).mockResolvedValue(mockWorkouts);

      await exportWorkoutsCsv(1);

      const csvContent = vi.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];

      // Null/undefined should become empty strings
      expect(csvContent).toMatch(/2025-10-01,Test,1,8,,,0/);
    });
  });
});
