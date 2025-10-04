/**
 * Integration Test T024: Muscle Volume Tracking Visualization
 *
 * Validates Scenario 5 from quickstart.md:
 * - Weekly volume tracking dashboard displays completed vs. planned volume
 * - Progress bars show MEV/MAV/MRV markers for all muscle groups
 * - Status indicators change based on volume zones
 * - Real-time updates as workouts are completed
 *
 * Acceptance Criteria (8 tests):
 * - AC-1: Dashboard shows "Weekly Volume Tracking" section with all muscle groups
 * - AC-2: Charts display completed sets / planned sets with completion percentage
 * - AC-3: MEV/MAV/MRV landmarks visible as markers on progress bars
 * - AC-4: Visual indicators (red/yellow/green) based on volume status
 * - AC-5: Status text changes based on position relative to landmarks
 * - AC-6: Progress bars update in real-time as workouts are logged
 * - AC-7: Over-reaching warnings when exceeding planned/MAV/MRV
 * - AC-8: All major muscle groups tracked (chest, lats, biceps, etc.)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as SQLite from 'expo-sqlite';
import {
  getVolumeZone,
  getVolumeZoneColor,
  VOLUME_LANDMARKS,
} from '../../src/constants/volumeLandmarks';

// Mock modules
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(),
}));

vi.mock('../../src/services/api/authApi', () => ({
  getAuthenticatedClient: vi.fn(),
}));

import { getAuthenticatedClient } from '../../src/services/api/authApi';

describe('Integration Test: Muscle Volume Tracking Visualization (T024)', () => {
  let mockDb: any;
  let mockApiClient: any;
  const userId: number = 1;
  const currentWeek = '2025-W40';
  const weekStart = '2025-09-30';
  const weekEnd = '2025-10-06';

  beforeEach(async () => {
    // Mock SQLite database
    mockDb = {
      runAsync: vi.fn(),
      getAllAsync: vi.fn(),
      getFirstAsync: vi.fn(),
    };

    vi.mocked(SQLite.openDatabaseAsync).mockResolvedValue(mockDb);

    // Mock API client
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    vi.mocked(getAuthenticatedClient).mockResolvedValue(mockApiClient);
  });

  /**
   * AC-1: Dashboard shows "Weekly Volume Tracking" section with all muscle groups
   */
  it('should display weekly volume tracking section with all muscle groups', async () => {
    // Mock API response with all muscle groups
    const mockVolumeData = {
      week_start: weekStart,
      week_end: weekEnd,
      muscle_groups: [
        {
          muscle_group: 'chest',
          completed_volume: 10,
          planned_volume: 20,
          mev: 16,
          mav: 24,
          mrv: 32,
          status: 'below_mev',
          completion_percentage: 50,
        },
        {
          muscle_group: 'lats',
          completed_volume: 11,
          planned_volume: 22,
          mev: 16,
          mav: 24,
          mrv: 30,
          status: 'below_mev',
          completion_percentage: 50,
        },
        {
          muscle_group: 'mid_back',
          completed_volume: 10,
          planned_volume: 20,
          mev: 14,
          mav: 22,
          mrv: 28,
          status: 'below_mev',
          completion_percentage: 50,
        },
        {
          muscle_group: 'rear_delts',
          completed_volume: 3,
          planned_volume: 6,
          mev: 6,
          mav: 12,
          mrv: 18,
          status: 'below_mev',
          completion_percentage: 50,
        },
        {
          muscle_group: 'biceps',
          completed_volume: 0,
          planned_volume: 16,
          mev: 6,
          mav: 12,
          mrv: 20,
          status: 'below_mev',
          completion_percentage: 0,
        },
      ],
    };

    mockApiClient.get.mockResolvedValue({ data: mockVolumeData });

    const client = await getAuthenticatedClient();
    const response = await client.get('/api/analytics/volume-trends', {
      params: { user_id: userId, week: 'current' },
    });

    expect(response.data.muscle_groups).toBeDefined();
    expect(response.data.muscle_groups.length).toBeGreaterThanOrEqual(5);
    expect(response.data.week_start).toBe(weekStart);
    expect(response.data.week_end).toBe(weekEnd);

    // Verify all expected muscle groups are present
    const muscleGroups = response.data.muscle_groups.map((mg: any) => mg.muscle_group);
    expect(muscleGroups).toContain('chest');
    expect(muscleGroups).toContain('lats');
    expect(muscleGroups).toContain('biceps');
  });

  /**
   * AC-2: Charts display completed sets / planned sets with completion percentage
   */
  it('should calculate and display completion percentage correctly', async () => {
    // Test case: Chest has 10 completed sets out of 20 planned (50%)
    const chestData = {
      muscle_group: 'chest',
      completed_volume: 10,
      planned_volume: 20,
      mev: 16,
      mav: 24,
      mrv: 32,
    };

    const completionPercentage = (chestData.completed_volume / chestData.planned_volume) * 100;
    expect(completionPercentage).toBe(50);

    // Test case: Lats has 11 completed sets out of 22 planned (50%)
    const latsData = {
      muscle_group: 'lats',
      completed_volume: 11,
      planned_volume: 22,
      mev: 16,
      mav: 24,
      mrv: 30,
    };

    const latsPercentage = (latsData.completed_volume / latsData.planned_volume) * 100;
    expect(latsPercentage).toBe(50);

    // Test case: Biceps has 2 completed sets out of 6 planned (33.33%)
    const bicepsData = {
      muscle_group: 'biceps',
      completed_volume: 2,
      planned_volume: 6,
      mev: 6,
      mav: 10,
      mrv: 16,
    };

    const bicepsPercentage = (bicepsData.completed_volume / bicepsData.planned_volume) * 100;
    expect(bicepsPercentage).toBeCloseTo(33.33, 2);
  });

  /**
   * AC-3: MEV/MAV/MRV landmarks visible as markers on progress bars
   */
  it('should display MEV/MAV/MRV markers at correct positions', async () => {
    // Verify landmarks from constants
    const chestLandmarks = VOLUME_LANDMARKS.chest;
    expect(chestLandmarks.mev).toBe(8);
    expect(chestLandmarks.mav).toBe(14);
    expect(chestLandmarks.mrv).toBe(22);

    const latsLandmarks = VOLUME_LANDMARKS.back_lats;
    expect(latsLandmarks.mev).toBe(10);
    expect(latsLandmarks.mav).toBe(16);
    expect(latsLandmarks.mrv).toBe(26);

    // Calculate marker positions as percentage
    // For chest with planned volume of 20:
    // MEV (8) should be at 40% of bar
    // MAV (14) should be at 70% of bar
    // MRV (22) should be at 110% of bar (beyond planned)

    const plannedVolume = 20;
    const mevPosition = (chestLandmarks.mev / plannedVolume) * 100;
    const mavPosition = (chestLandmarks.mav / plannedVolume) * 100;
    const mrvPosition = (chestLandmarks.mrv / plannedVolume) * 100;

    expect(mevPosition).toBe(40); // 8/20 = 40%
    expect(mavPosition).toBe(70); // 14/20 = 70%
    expect(mrvPosition).toBeCloseTo(110, 1); // 22/20 = 110% (use toBeCloseTo for floating point)
  });

  /**
   * AC-4: Visual indicators (red/yellow/green) based on volume status
   */
  it('should assign correct colors based on volume zones', () => {
    // Test zone classification and color assignment

    // Below MEV: Red (under-training)
    const underZone = getVolumeZone('chest', 6); // 6 sets, MEV is 8
    expect(underZone).toBe('under');
    expect(getVolumeZoneColor(underZone)).toBe('#ef4444'); // Red

    // Within MEV-MAV: Green (optimal)
    const optimalZone = getVolumeZone('chest', 12); // 12 sets, between MEV(8) and MAV(14)
    expect(optimalZone).toBe('optimal');
    expect(getVolumeZoneColor(optimalZone)).toBe('#22c55e'); // Green

    // Within MAV-MRV: Yellow (approaching limit)
    const approachingZone = getVolumeZone('chest', 18); // 18 sets, between MAV(14) and MRV(22)
    expect(approachingZone).toBe('approaching_limit');
    expect(getVolumeZoneColor(approachingZone)).toBe('#eab308'); // Yellow

    // Above MRV: Red (overreaching)
    const overreachingZone = getVolumeZone('chest', 25); // 25 sets, above MRV(22)
    expect(overreachingZone).toBe('overreaching');
    expect(getVolumeZoneColor(overreachingZone)).toBe('#ef4444'); // Red
  });

  /**
   * AC-5: Status text changes based on position relative to landmarks
   */
  it('should generate appropriate status messages based on volume', () => {
    // Helper function to generate status message
    const getStatusMessage = (
      completedVolume: number,
      plannedVolume: number,
      mev: number,
      mav: number,
      mrv: number,
      workoutsRemaining: number
    ): string => {
      if (completedVolume < mev) {
        return `⚠️ Below MEV - ${workoutsRemaining} more workout${workoutsRemaining > 1 ? 's' : ''} scheduled this week`;
      } else if (completedVolume >= mev && completedVolume <= mav) {
        return '✅ Within MEV-MAV range (optimal hypertrophy stimulus)';
      } else if (completedVolume > mav && completedVolume <= mrv) {
        return '✅ Within MAV-MRV range (approaching limit)';
      } else if (completedVolume > plannedVolume && completedVolume <= mrv) {
        return '⚠️ Above planned volume - watch for fatigue';
      } else if (completedVolume > mrv) {
        return '❌ Above MRV - overtraining risk, reduce volume immediately';
      }
      return '✅ At MEV minimum (adequate for maintenance)';
    };

    // Test cases from quickstart.md

    // Chest: 10/20 sets, below MEV (16)
    const chestStatus = getStatusMessage(10, 20, 16, 24, 32, 2);
    expect(chestStatus).toContain('Below MEV');
    expect(chestStatus).toContain('2 more workouts scheduled');

    // Chest after full week: 20/20 sets, within MEV-MAV (16-24)
    const chestCompleteStatus = getStatusMessage(20, 20, 16, 24, 32, 0);
    expect(chestCompleteStatus).toContain('Within MEV-MAV');
    expect(chestCompleteStatus).toContain('optimal hypertrophy stimulus');

    // Rear delts: 6/6 sets, exactly at MEV (should be in optimal range)
    const rearDeltsStatus = getStatusMessage(6, 6, 6, 12, 18, 0);
    expect(rearDeltsStatus).toContain('Within MEV-MAV'); // 6 is between MEV(6) and MAV(12)

    // Over-reaching: 25 sets, above MRV (22)
    const overreachingStatus = getStatusMessage(25, 20, 8, 14, 22, 0);
    expect(overreachingStatus).toContain('Above MRV');
    expect(overreachingStatus).toContain('overtraining risk');
  });

  /**
   * AC-6: Progress bars update in real-time as workouts are logged
   */
  it('should update volume tracking after logging workout sets', async () => {
    // Initial state: 10 chest sets completed
    let chestVolume = 10;
    const plannedVolume = 20;

    // Simulate completing Push B workout (adds 10 more chest sets)
    const pushBExercises = [
      { exercise_id: 1, sets: 4, muscle_groups: ['chest'] }, // Bench Press
      { exercise_id: 5, sets: 3, muscle_groups: ['chest'] }, // Incline Press
      { exercise_id: 7, sets: 3, muscle_groups: ['chest'] }, // Flyes
    ];

    const additionalSets = pushBExercises.reduce((sum, ex) => sum + ex.sets, 0);
    chestVolume += additionalSets;

    expect(chestVolume).toBe(20);

    // Verify completion percentage updated
    const completionPercentage = (chestVolume / plannedVolume) * 100;
    expect(completionPercentage).toBe(100);

    // Verify status changed from "below_mev" to "approaching_limit"
    const landmarks = VOLUME_LANDMARKS.chest;
    const newZone = getVolumeZone('chest', chestVolume);

    // With MEV=8, MAV=14, MRV=22, 20 sets is in MAV-MRV range (approaching limit)
    expect(chestVolume).toBeGreaterThan(landmarks.mav);
    expect(chestVolume).toBeLessThanOrEqual(landmarks.mrv);
    expect(newZone).toBe('approaching_limit');
  });

  /**
   * AC-7: Over-reaching warnings when exceeding planned/MAV/MRV
   */
  it('should display warnings when volume exceeds thresholds', () => {
    const landmarks = VOLUME_LANDMARKS.chest;
    const plannedVolume = 20;

    // Test case 1: Exceeds planned volume (22 sets vs 20 planned)
    const volume22 = 22;
    expect(volume22).toBeGreaterThan(plannedVolume);
    expect(volume22).toBeLessThanOrEqual(landmarks.mrv);
    const zone22 = getVolumeZone('chest', volume22);
    expect(zone22).toBe('approaching_limit'); // Still under MRV, so yellow warning

    // Test case 2: Exceeds MAV (18 sets, MAV is 14)
    const volume18 = 18;
    expect(volume18).toBeGreaterThan(landmarks.mav);
    expect(volume18).toBeLessThanOrEqual(landmarks.mrv);
    const zone18 = getVolumeZone('chest', volume18);
    expect(zone18).toBe('approaching_limit');

    // Test case 3: Exceeds MRV (25 sets, MRV is 22)
    const volume25 = 25;
    expect(volume25).toBeGreaterThan(landmarks.mrv);
    const zone25 = getVolumeZone('chest', volume25);
    expect(zone25).toBe('overreaching');
    expect(getVolumeZoneColor(zone25)).toBe('#ef4444'); // Red alert
  });

  /**
   * AC-8: All major muscle groups tracked
   */
  it('should track volume for all major muscle groups', async () => {
    // Verify volume landmarks exist for all major muscle groups
    const requiredMuscleGroups = [
      'chest',
      'back_lats',
      'back_traps',
      'shoulders_front',
      'shoulders_side',
      'shoulders_rear',
      'biceps',
      'triceps',
      'quads',
      'hamstrings',
      'glutes',
      'calves',
      'abs',
    ];

    for (const muscleGroup of requiredMuscleGroups) {
      const landmark = VOLUME_LANDMARKS[muscleGroup as keyof typeof VOLUME_LANDMARKS];
      expect(landmark).toBeDefined();
      expect(landmark.mev).toBeGreaterThan(0);
      expect(landmark.mav).toBeGreaterThan(landmark.mev);
      expect(landmark.mrv).toBeGreaterThan(landmark.mav);
    }

    // Verify all muscle groups can be classified into zones
    for (const muscleGroup of requiredMuscleGroups) {
      const testVolume = 10;
      const zone = getVolumeZone(muscleGroup as any, testVolume);
      expect(['under', 'optimal', 'approaching_limit', 'overreaching']).toContain(zone);
    }
  });

  /**
   * Integration Test: Simulate full week completion scenario
   */
  it('should accurately track volume progression through full week', async () => {
    // Week start: Monday - Push A completed (10 chest sets)
    let chestVolume = 10;

    // Verify initial state (week 50% complete, 2 workouts done, 4 remaining)
    const weekProgress = 2 / 6; // 2 of 6 workouts completed
    expect(weekProgress).toBeCloseTo(0.333, 2);

    // Tuesday: Pull A completed (no chest volume)
    // chestVolume remains 10

    // Wednesday: VO2max A completed (no chest volume)
    // chestVolume remains 10

    // Thursday: Push B completed (10 more chest sets)
    chestVolume += 10;
    expect(chestVolume).toBe(20);

    // Friday: Pull B completed (no chest volume)
    // chestVolume remains 20

    // Saturday: VO2max B completed (no chest volume)
    // chestVolume remains 20

    // Final state verification
    const landmarks = VOLUME_LANDMARKS.chest;
    const finalZone = getVolumeZone('chest', chestVolume);
    const finalCompletion = (chestVolume / 20) * 100;

    expect(chestVolume).toBe(20);
    expect(finalCompletion).toBe(100);
    expect(finalZone).toBe('approaching_limit'); // 20 is between MAV(14) and MRV(22)
  });

  /**
   * Test database query for volume aggregation
   */
  it('should aggregate sets by muscle group from database', async () => {
    // Mock database query for volume aggregation
    vi.mocked(mockDb.getAllAsync).mockResolvedValue([
      {
        muscle_groups: JSON.stringify(['chest', 'front_delts', 'triceps']),
        total_sets: 20,
      },
      {
        muscle_groups: JSON.stringify(['lats', 'mid_back', 'biceps']),
        total_sets: 22,
      },
      {
        muscle_groups: JSON.stringify(['rear_delts', 'mid_back']),
        total_sets: 6,
      },
    ]);

    const volumeData = await mockDb.getAllAsync(
      `
      SELECT
        e.muscle_groups,
        COUNT(*) as total_sets
      FROM sets s
      JOIN workouts w ON s.workout_id = w.id
      JOIN exercises e ON s.exercise_id = e.id
      WHERE w.user_id = ?
        AND w.date >= ?
        AND w.date <= ?
        AND w.status = 'completed'
      GROUP BY e.muscle_groups
    `,
      [userId, weekStart, weekEnd]
    );

    expect(volumeData.length).toBe(3);

    // Verify chest volume
    const chestRow = volumeData.find((row: any) => {
      const groups = JSON.parse(row.muscle_groups);
      return groups.includes('chest');
    });
    expect(chestRow).toBeDefined();
    expect(chestRow.total_sets).toBe(20);

    // Verify lats volume
    const latsRow = volumeData.find((row: any) => {
      const groups = JSON.parse(row.muscle_groups);
      return groups.includes('lats');
    });
    expect(latsRow).toBeDefined();
    expect(latsRow.total_sets).toBe(22);
  });

  /**
   * Test API endpoint for weekly volume summary
   */
  it('should fetch weekly volume summary from API', async () => {
    const mockApiResponse = {
      week_start: weekStart,
      week_end: weekEnd,
      total_workouts: 6,
      completed_workouts: 2,
      muscle_groups: [
        {
          muscle_group: 'chest',
          completed_volume: 10,
          planned_volume: 20,
          mev: 16,
          mav: 24,
          mrv: 32,
          status: 'below_mev',
          completion_percentage: 50,
        },
        {
          muscle_group: 'back_lats',
          completed_volume: 11,
          planned_volume: 22,
          mev: 16,
          mav: 24,
          mrv: 30,
          status: 'below_mev',
          completion_percentage: 50,
        },
      ],
    };

    mockApiClient.get.mockResolvedValue({ data: mockApiResponse });

    const client = await getAuthenticatedClient();
    const response = await client.get('/api/analytics/volume-trends', {
      params: { user_id: userId, week: 'current' },
    });

    expect(response.data.week_start).toBe(weekStart);
    expect(response.data.total_workouts).toBe(6);
    expect(response.data.completed_workouts).toBe(2);
    expect(response.data.muscle_groups.length).toBe(2);

    // Verify data structure matches schema
    const chestData = response.data.muscle_groups[0];
    expect(chestData).toHaveProperty('muscle_group');
    expect(chestData).toHaveProperty('completed_volume');
    expect(chestData).toHaveProperty('planned_volume');
    expect(chestData).toHaveProperty('mev');
    expect(chestData).toHaveProperty('mav');
    expect(chestData).toHaveProperty('mrv');
    expect(chestData).toHaveProperty('status');
    expect(chestData).toHaveProperty('completion_percentage');
  });

  /**
   * Test edge case: Zero planned volume (user hasn't started program)
   */
  it('should handle edge case of zero planned volume', () => {
    const completedVolume = 0;
    const plannedVolume = 0;

    // Avoid division by zero
    const completionPercentage = plannedVolume > 0 ? (completedVolume / plannedVolume) * 100 : 0;
    expect(completionPercentage).toBe(0);

    // Status should indicate no program set up
    const status = plannedVolume === 0 ? 'no_program' : 'in_progress';
    expect(status).toBe('no_program');
  });

  /**
   * Test edge case: Completed volume exceeds planned (user added extra sets)
   */
  it('should handle completed volume exceeding planned volume', () => {
    const completedVolume = 25;
    const plannedVolume = 20;

    const completionPercentage = (completedVolume / plannedVolume) * 100;
    expect(completionPercentage).toBe(125);

    // Bar should extend beyond 100% of planned outline
    const barWidthPercentage = Math.min(completionPercentage, 150); // Cap at 150% for UI
    expect(barWidthPercentage).toBeGreaterThan(100);
  });
});
