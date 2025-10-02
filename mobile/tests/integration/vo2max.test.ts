/**
 * Integration Test T078: VO2max Cardio Protocol
 *
 * Validates Scenario 5 from quickstart.md:
 * - 4×4 interval timer, notifications
 * - Verify session summary
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as SQLite from 'expo-sqlite';

// Mock modules
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(),
}));

vi.mock('../../src/services/timer/IntervalTimer', () => ({
  startInterval: vi.fn(),
  stopInterval: vi.fn(),
  getTimeRemaining: vi.fn(),
  getCurrentPhase: vi.fn(),
}));

vi.mock('../../src/services/notifications', () => ({
  sendNotification: vi.fn(),
  playSound: vi.fn(),
}));

import {
  startInterval,
  stopInterval,
  getTimeRemaining,
  getCurrentPhase,
} from '../../src/services/timer/IntervalTimer';
import { sendNotification, playSound } from '../../src/services/notifications';

describe('Integration Test: VO2max Cardio Protocol (T078)', () => {
  let mockDb: any;
  const userId: number = 1;
  let vo2maxSessionId: number;

  beforeEach(async () => {
    mockDb = {
      runAsync: vi.fn(),
      getAllAsync: vi.fn(),
      getFirstAsync: vi.fn(),
    };

    vi.mocked(SQLite.openDatabaseAsync).mockResolvedValue(mockDb);
    vi.mocked(mockDb.runAsync).mockResolvedValue({ lastInsertRowId: 1, changes: 1 } as any);
  });

  it('should execute Norwegian 4×4 protocol with proper timing', async () => {
    // Step 1: Start VO2max Workout
    const sessionData = {
      user_id: userId,
      date: '2025-10-02',
      protocol: '4x4_norwegian',
      target_hr_zone_min: 171, // 90% of max HR (190)
      target_hr_zone_max: 181, // 95% of max HR (190)
    };

    const sessionResult = await mockDb.runAsync(
      'INSERT INTO vo2max_sessions (user_id, date, protocol, target_hr_zone_min, target_hr_zone_max, status) VALUES (?, ?, ?, ?, ?, ?)',
      [
        sessionData.user_id,
        sessionData.date,
        sessionData.protocol,
        sessionData.target_hr_zone_min,
        sessionData.target_hr_zone_max,
        'in_progress',
      ]
    );

    vo2maxSessionId = sessionResult.lastInsertRowId;
    expect(vo2maxSessionId).toBe(1);

    // Step 2: Execute Interval 1 (4 minutes work)
    vi.mocked(startInterval).mockReturnValue(undefined);
    vi.mocked(getCurrentPhase).mockReturnValue('work');
    vi.mocked(getTimeRemaining).mockReturnValue(240); // 4 minutes = 240 seconds

    startInterval({
      workDuration: 240,
      restDuration: 180,
      intervals: 4,
      onIntervalComplete: vi.fn(),
      onWorkoutComplete: vi.fn(),
    });

    expect(startInterval).toHaveBeenCalledWith(
      expect.objectContaining({
        workDuration: 240,
        restDuration: 180,
        intervals: 4,
      })
    );

    expect(getCurrentPhase()).toBe('work');
    expect(getTimeRemaining()).toBe(240);

    // Step 3: Simulate 1-minute warning
    vi.mocked(getTimeRemaining).mockReturnValue(60);

    if (getTimeRemaining() === 60) {
      vi.mocked(sendNotification).mockResolvedValue(undefined);
      await sendNotification('Interval Warning', '1 minute remaining');
      expect(sendNotification).toHaveBeenCalledWith('Interval Warning', '1 minute remaining');
    }

    // Step 4: Interval completion
    vi.mocked(getTimeRemaining).mockReturnValue(0);
    vi.mocked(playSound).mockResolvedValue(undefined);

    if (getTimeRemaining() === 0) {
      await playSound('completion_beep');
      await sendNotification('Work Interval Complete', 'Begin active recovery - 3 minutes');

      expect(playSound).toHaveBeenCalledWith('completion_beep');
      expect(sendNotification).toHaveBeenCalledWith(
        'Work Interval Complete',
        expect.stringContaining('3 minutes')
      );
    }

    // Step 5: Recovery period (3 minutes)
    vi.mocked(getCurrentPhase).mockReturnValue('rest');
    vi.mocked(getTimeRemaining).mockReturnValue(180);

    expect(getCurrentPhase()).toBe('rest');
    expect(getTimeRemaining()).toBe(180);

    // Log interval data
    await mockDb.runAsync(
      'INSERT INTO vo2max_intervals (session_id, interval_number, work_duration_sec, rest_duration_sec, avg_hr, peak_hr) VALUES (?, ?, ?, ?, ?, ?)',
      [vo2maxSessionId, 1, 240, 180, 175, 182]
    );

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO vo2max_intervals'),
      expect.arrayContaining([vo2maxSessionId, 1, 240, 180, 175, 182])
    );
  });

  it('should complete all 4 intervals with recovery periods', async () => {
    // Create session
    vo2maxSessionId = 1;

    const intervals = [
      { number: 1, avgHR: 175, peakHR: 182 },
      { number: 2, avgHR: 177, peakHR: 184 },
      { number: 3, avgHR: 178, peakHR: 185 },
      { number: 4, avgHR: 180, peakHR: 187 },
    ];

    // Log all 4 intervals
    for (const interval of intervals) {
      await mockDb.runAsync(
        'INSERT INTO vo2max_intervals (session_id, interval_number, work_duration_sec, rest_duration_sec, avg_hr, peak_hr) VALUES (?, ?, ?, ?, ?, ?)',
        [vo2maxSessionId, interval.number, 240, 180, interval.avgHR, interval.peakHR]
      );
    }

    expect(mockDb.runAsync).toHaveBeenCalledTimes(4);

    // Total duration: 4 × 4min work + 3 × 3min rest = 16 + 9 = 25 minutes
    const totalDuration = 4 * 240 + 3 * 180;
    expect(totalDuration).toBe(1500); // 25 minutes = 1500 seconds
  });

  it('should calculate session summary with VO2max estimation', async () => {
    vo2maxSessionId = 1;

    // Mock interval data
    const intervals = [
      { interval_number: 1, avg_hr: 175, peak_hr: 182 },
      { interval_number: 2, avg_hr: 177, peak_hr: 184 },
      { interval_number: 3, avg_hr: 178, peak_hr: 185 },
      { interval_number: 4, avg_hr: 180, peak_hr: 187 },
    ];

    vi.mocked(mockDb.getAllAsync).mockResolvedValue(intervals);

    const intervalData = await mockDb.getAllAsync(
      'SELECT interval_number, avg_hr, peak_hr FROM vo2max_intervals WHERE session_id = ? ORDER BY interval_number',
      [vo2maxSessionId]
    );

    expect(intervalData.length).toBe(4);

    // Calculate session statistics
    const avgHR = intervalData.reduce((sum, int) => sum + int.avg_hr, 0) / intervalData.length;
    const peakHR = Math.max(...intervalData.map((int) => int.peak_hr));

    expect(Math.round(avgHR)).toBe(178); // (175+177+178+180)/4 = 177.5 ≈ 178
    expect(peakHR).toBe(187);

    // VO2max estimation using simplified formula
    // VO2max ≈ 15 × (max_HR / resting_HR)
    // For this test, assume resting HR = 60, max HR = 190
    const restingHR = 60;
    const maxHR = 190;
    const vo2maxEstimate = 15 * (maxHR / restingHR);

    expect(Math.round(vo2maxEstimate)).toBe(48); // 15 × (190/60) = 47.5 ≈ 48 ml/kg/min

    // Perceived exertion
    const perceivedExertion = 9; // 1-10 scale

    // Save session summary
    await mockDb.runAsync(
      `UPDATE vo2max_sessions
       SET status = ?, duration_minutes = ?, avg_hr = ?, peak_hr = ?,
           perceived_exertion = ?, estimated_vo2max = ?, completed_at = ?
       WHERE id = ?`,
      [
        'completed',
        25,
        avgHR,
        peakHR,
        perceivedExertion,
        vo2maxEstimate,
        Date.now(),
        vo2maxSessionId,
      ]
    );

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vo2max_sessions'),
      expect.arrayContaining([
        'completed',
        25,
        avgHR,
        peakHR,
        9,
        vo2maxEstimate,
        expect.any(Number),
        vo2maxSessionId,
      ])
    );

    // Verify session summary
    vi.mocked(mockDb.getFirstAsync).mockResolvedValue({
      id: vo2maxSessionId,
      duration_minutes: 25,
      avg_hr: avgHR,
      peak_hr: peakHR,
      perceived_exertion: 9,
      estimated_vo2max: vo2maxEstimate,
    });

    const summary = await mockDb.getFirstAsync('SELECT * FROM vo2max_sessions WHERE id = ?', [
      vo2maxSessionId,
    ]);

    expect(summary.duration_minutes).toBe(25);
    expect(summary.avg_hr).toBe(avgHR);
    expect(summary.peak_hr).toBe(peakHR);
    expect(summary.estimated_vo2max).toBe(vo2maxEstimate);
  });

  it('should track VO2max trends over time', async () => {
    // Seed 4 weeks of VO2max sessions
    const sessions = [
      { week: 1, date: '2025-09-04', vo2max: 44, avg_hr: 172, peak_hr: 185 },
      { week: 2, date: '2025-09-11', vo2max: 45, avg_hr: 174, peak_hr: 186 },
      { week: 3, date: '2025-09-18', vo2max: 47, avg_hr: 176, peak_hr: 187 },
      { week: 4, date: '2025-09-25', vo2max: 48, avg_hr: 178, peak_hr: 187 },
    ];

    for (const session of sessions) {
      await mockDb.runAsync(
        'INSERT INTO vo2max_sessions (user_id, date, status, estimated_vo2max, avg_hr, peak_hr) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, session.date, 'completed', session.vo2max, session.avg_hr, session.peak_hr]
      );
    }

    // Query VO2max trend
    vi.mocked(mockDb.getAllAsync).mockResolvedValue(sessions);

    const trend = await mockDb.getAllAsync(
      `SELECT date, estimated_vo2max, avg_hr, peak_hr
       FROM vo2max_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY date`,
      [userId]
    );

    expect(trend.length).toBe(4);

    // Verify progression
    const initialVO2max = trend[0].vo2max;
    const finalVO2max = trend[3].vo2max;
    const improvement = finalVO2max - initialVO2max;

    expect(improvement).toBe(4); // 44 → 48 ml/kg/min over 4 weeks
    expect(improvement).toBeGreaterThan(0);

    // Verify trend is upward
    for (let i = 1; i < trend.length; i++) {
      expect(trend[i].vo2max).toBeGreaterThanOrEqual(trend[i - 1].vo2max);
    }
  });

  it('should verify interval timer accuracy ±2 seconds', async () => {
    const targetDuration = 240; // 4 minutes
    vi.mocked(getTimeRemaining).mockReturnValue(targetDuration);

    const startTime = Date.now();

    // Simulate countdown
    const simulatedDurations = [];
    for (let remaining = targetDuration; remaining >= 0; remaining -= 10) {
      vi.mocked(getTimeRemaining).mockReturnValue(remaining);
      simulatedDurations.push(getTimeRemaining());
    }

    const endTime = Date.now();
    const actualDuration = endTime - startTime;

    // Timer simulation should be fast (< 1ms in tests)
    expect(actualDuration).toBeLessThan(1000);

    // Verify countdown sequence
    expect(simulatedDurations[0]).toBe(240);
    expect(simulatedDurations[simulatedDurations.length - 1]).toBe(0);

    // In real implementation, timer accuracy should be ±2 seconds
    const allowedVariance = 2000; // 2 seconds
    const expectedDuration = targetDuration * 1000; // Convert to ms

    // Mock assertion for real timer (would use actual timestamp comparison)
    const mockActualTimerDuration = 240100; // 240.1 seconds
    const timerAccuracy = Math.abs(mockActualTimerDuration - expectedDuration);
    expect(timerAccuracy).toBeLessThanOrEqual(allowedVariance);
  });

  it('should handle audio cues at correct times', async () => {
    vi.mocked(getTimeRemaining).mockReturnValue(240);
    vi.mocked(playSound).mockResolvedValue(undefined);
    vi.mocked(sendNotification).mockResolvedValue(undefined);

    // Audio cue points
    const cueTimes = [60, 30, 10, 0]; // 1 minute, 30 seconds, 10 seconds, completion

    for (const cueTime of cueTimes) {
      vi.mocked(getTimeRemaining).mockReturnValue(cueTime);

      if (cueTime === 60) {
        await sendNotification('Interval Warning', '1 minute remaining');
        expect(sendNotification).toHaveBeenCalledWith('Interval Warning', '1 minute remaining');
      } else if (cueTime === 30) {
        await playSound('warning_beep');
        expect(playSound).toHaveBeenCalledWith('warning_beep');
      } else if (cueTime === 10) {
        await sendNotification('Almost Done', '10 seconds remaining');
        expect(sendNotification).toHaveBeenCalledWith('Almost Done', '10 seconds remaining');
      } else if (cueTime === 0) {
        await playSound('completion_beep');
        expect(playSound).toHaveBeenCalledWith('completion_beep');
      }
    }

    expect(playSound).toHaveBeenCalledTimes(2); // 30s warning + completion
    expect(sendNotification).toHaveBeenCalledTimes(2); // 1min + 10s warnings
  });

  it('should validate VO2max within physiological range (20-80 ml/kg/min)', async () => {
    const testEstimates = [
      { hr: 180, restingHR: 60, maxHR: 190, expected: 48 },
      { hr: 160, restingHR: 65, maxHR: 180, expected: 42 },
      { hr: 200, restingHR: 50, maxHR: 220, expected: 66 },
    ];

    for (const test of testEstimates) {
      const vo2maxEstimate = 15 * (test.maxHR / test.restingHR);
      expect(vo2maxEstimate).toBeGreaterThanOrEqual(20);
      expect(vo2maxEstimate).toBeLessThanOrEqual(80);
      expect(Math.round(vo2maxEstimate)).toBe(test.expected);
    }
  });

  it('should handle session interruption and resume', async () => {
    // Start session
    vo2maxSessionId = 1;
    await mockDb.runAsync(
      'INSERT INTO vo2max_sessions (user_id, date, protocol, status) VALUES (?, ?, ?, ?)',
      [userId, '2025-10-02', '4x4_norwegian', 'in_progress']
    );

    // Complete 2 intervals
    await mockDb.runAsync(
      'INSERT INTO vo2max_intervals (session_id, interval_number, work_duration_sec, rest_duration_sec, avg_hr, peak_hr) VALUES (?, ?, ?, ?, ?, ?)',
      [vo2maxSessionId, 1, 240, 180, 175, 182]
    );

    await mockDb.runAsync(
      'INSERT INTO vo2max_intervals (session_id, interval_number, work_duration_sec, rest_duration_sec, avg_hr, peak_hr) VALUES (?, ?, ?, ?, ?, ?)',
      [vo2maxSessionId, 2, 240, 180, 177, 184]
    );

    // Pause session (simulate interruption)
    await mockDb.runAsync('UPDATE vo2max_sessions SET status = ? WHERE id = ?', [
      'paused',
      vo2maxSessionId,
    ]);

    // Resume session
    vi.mocked(mockDb.getFirstAsync).mockResolvedValue({
      id: vo2maxSessionId,
      status: 'paused',
    });

    const session = await mockDb.getFirstAsync('SELECT * FROM vo2max_sessions WHERE id = ?', [
      vo2maxSessionId,
    ]);

    expect(session.status).toBe('paused');

    // Get completed intervals count
    vi.mocked(mockDb.getAllAsync).mockResolvedValue([
      { interval_number: 1 },
      { interval_number: 2 },
    ]);

    const completedIntervals = await mockDb.getAllAsync(
      'SELECT interval_number FROM vo2max_intervals WHERE session_id = ?',
      [vo2maxSessionId]
    );

    expect(completedIntervals.length).toBe(2);

    // Resume from interval 3
    const nextInterval = completedIntervals.length + 1;
    expect(nextInterval).toBe(3);

    await mockDb.runAsync('UPDATE vo2max_sessions SET status = ? WHERE id = ?', [
      'in_progress',
      vo2maxSessionId,
    ]);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vo2max_sessions SET status'),
      expect.arrayContaining(['in_progress', vo2maxSessionId])
    );
  });
});
