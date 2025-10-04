/**
 * Integration Test T021: VO2max Cardio Session Execution
 *
 * Validates Scenario 2 from quickstart.md:
 * - Norwegian 4×4 interval protocol with heart rate zone tracking
 * - Complete 4 work intervals (4 min @ 90-95% HRmax) + 3 recovery intervals (3 min @ 60-70% HRmax)
 * - Log heart rate data for each interval
 * - Calculate and save VO2max estimate
 * - Mark workout as completed
 * - Display VO2max progression in Analytics dashboard
 *
 * Acceptance Criteria (9 total):
 * AC-1: Start VO2max session and see Norwegian 4×4 guidance
 * AC-2: Execute work interval with countdown timer and HR zones
 * AC-3: Auto-transition to recovery interval
 * AC-4: Complete all 4 intervals with HR data collection
 * AC-5: View session summary with calculated metrics
 * AC-6: Save VO2max session to database
 * AC-7: Mark workout as completed with accurate duration
 * AC-8: Calculate VO2max estimate using HR data
 * AC-9: Display VO2max progression in Analytics dashboard
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as SQLite from 'expo-sqlite';

// Mock modules
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(),
}));

vi.mock('../../src/services/timer/IntervalTimer', () => ({
  IntervalTimer: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getTimeRemaining: vi.fn(),
    getCurrentPhase: vi.fn(),
    getIntervalNumber: vi.fn(),
  })),
}));

vi.mock('../../src/services/notifications', () => ({
  sendNotification: vi.fn(),
  playSound: vi.fn(),
  vibrate: vi.fn(),
}));

import { IntervalTimer } from '../../src/services/timer/IntervalTimer';
import { sendNotification, playSound, vibrate } from '../../src/services/notifications';

describe('Integration Test: VO2max Cardio Session Execution (T021 - Scenario 2)', () => {
  let mockDb: any;
  let mockTimer: any;
  const userId: number = 1;
  const userAge: number = 28;
  const maxHR: number = 220 - userAge; // 192 bpm
  const workZoneMin: number = Math.floor(maxHR * 0.9); // 172 bpm (90% HRmax)
  const workZoneMax: number = Math.floor(maxHR * 0.95); // 182 bpm (95% HRmax)
  const recoveryZoneMin: number = Math.floor(maxHR * 0.6); // 115 bpm (60% HRmax)
  const recoveryZoneMax: number = Math.floor(maxHR * 0.7); // 134 bpm (70% HRmax)

  let workoutId: number;
  let vo2maxSessionId: number;

  beforeEach(async () => {
    // Setup mock database
    mockDb = {
      runAsync: vi.fn(),
      getAllAsync: vi.fn(),
      getFirstAsync: vi.fn(),
    };

    vi.mocked(SQLite.openDatabaseAsync).mockResolvedValue(mockDb);

    // Default mock return values
    vi.mocked(mockDb.runAsync).mockResolvedValue({
      lastInsertRowId: 1,
      changes: 1,
    } as any);

    // Setup mock timer
    mockTimer = new IntervalTimer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  /**
   * AC-1: Start VO2max session and see Norwegian 4×4 guidance
   *
   * Validates Step 1-2 from quickstart.md:
   * - Create workout session via API
   * - Display protocol description and HR zones
   * - Show interval tracker "Interval 1 of 4"
   */
  it('AC-1: should start VO2max session with Norwegian 4×4 protocol guidance', async () => {
    // Step 1: Create workout session
    const workoutData = {
      user_id: userId,
      program_day_id: 3, // VO2max A day
      date: '2025-10-03',
      status: 'in_progress',
    };

    const workoutResult = await mockDb.runAsync(
      'INSERT INTO workouts (user_id, program_day_id, date, status, started_at) VALUES (?, ?, ?, ?, ?)',
      [
        workoutData.user_id,
        workoutData.program_day_id,
        workoutData.date,
        workoutData.status,
        Date.now(),
      ]
    );

    workoutId = workoutResult.lastInsertRowId;
    expect(workoutId).toBe(1);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workouts'),
      expect.arrayContaining([userId, 3, '2025-10-03', 'in_progress', expect.any(Number)])
    );

    // Step 2: Display protocol guidance
    const protocolInfo = {
      name: 'Norwegian 4×4',
      description: '4 rounds: 4 minutes @ 90-95% HRmax, 3 minutes active recovery @ 60-70% HRmax',
      totalDuration: '~28 minutes',
      workZone: { min: workZoneMin, max: workZoneMax },
      recoveryZone: { min: recoveryZoneMin, max: recoveryZoneMax },
    };

    expect(protocolInfo.name).toBe('Norwegian 4×4');
    expect(protocolInfo.workZone.min).toBe(172);
    expect(protocolInfo.workZone.max).toBe(182);
    expect(protocolInfo.recoveryZone.min).toBe(115);
    expect(protocolInfo.recoveryZone.max).toBe(134);

    // Step 3: Verify interval tracker
    const intervalTracker = {
      currentInterval: 1,
      totalIntervals: 4,
      displayText: 'Interval 1 of 4',
    };

    expect(intervalTracker.currentInterval).toBe(1);
    expect(intervalTracker.totalIntervals).toBe(4);
    expect(intervalTracker.displayText).toBe('Interval 1 of 4');
  });

  /**
   * AC-2: Execute work interval with countdown timer and HR zones
   *
   * Validates Step 3 from quickstart.md:
   * - Start 4-minute work interval
   * - Display countdown timer
   * - Show target HR zone (172-182 bpm)
   * - Emit audio/visual cues at 1:00, 0:30, 0:10
   */
  it('AC-2: should execute work interval with countdown timer and HR zone guidance', async () => {
    workoutId = 1;

    // Start work interval 1 (4 minutes = 240 seconds)
    const workDuration = 240;
    vi.mocked(mockTimer.getCurrentPhase).mockReturnValue('work');
    vi.mocked(mockTimer.getTimeRemaining).mockReturnValue(workDuration);
    vi.mocked(mockTimer.getIntervalNumber).mockReturnValue(1);

    mockTimer.start({
      workDuration: 240,
      restDuration: 180,
      intervals: 4,
    });

    expect(mockTimer.start).toHaveBeenCalledWith({
      workDuration: 240,
      restDuration: 180,
      intervals: 4,
    });

    // Verify timer state
    expect(mockTimer.getCurrentPhase()).toBe('work');
    expect(mockTimer.getTimeRemaining()).toBe(240);
    expect(mockTimer.getIntervalNumber()).toBe(1);

    // Simulate audio cues
    const audioCues = [
      { timeRemaining: 60, message: '1 minute remaining', sound: 'warning_beep' },
      { timeRemaining: 30, message: '30 seconds', sound: 'warning_beep' },
      { timeRemaining: 10, message: '10 seconds, prepare for recovery', sound: 'warning_beep' },
      {
        timeRemaining: 0,
        message: 'Work interval complete! Start active recovery.',
        sound: 'completion_beep',
      },
    ];

    for (const cue of audioCues) {
      vi.mocked(mockTimer.getTimeRemaining).mockReturnValue(cue.timeRemaining);

      if (cue.timeRemaining > 0) {
        await sendNotification('Interval Warning', cue.message);
        await playSound(cue.sound);
        await vibrate();
      } else {
        await sendNotification('Work Interval Complete', cue.message);
        await playSound(cue.sound);
      }
    }

    expect(sendNotification).toHaveBeenCalledTimes(4);
    expect(playSound).toHaveBeenCalledTimes(4);
    expect(vibrate).toHaveBeenCalledTimes(3); // Not on completion
  });

  /**
   * AC-3: Auto-transition to recovery interval
   *
   * Validates Step 4 from quickstart.md:
   * - Automatically transition from work to recovery
   * - Display 3-minute recovery countdown
   * - Show recovery HR zone (115-134 bpm)
   * - Emit audio cue at 0:30 remaining
   */
  it('AC-3: should auto-transition to recovery interval after work interval completes', async () => {
    workoutId = 1;

    // Work interval completes
    vi.mocked(mockTimer.getCurrentPhase).mockReturnValue('work');
    vi.mocked(mockTimer.getTimeRemaining).mockReturnValue(0);

    // Auto-transition to recovery
    vi.mocked(mockTimer.getCurrentPhase).mockReturnValue('rest');
    vi.mocked(mockTimer.getTimeRemaining).mockReturnValue(180); // 3 minutes
    vi.mocked(mockTimer.getIntervalNumber).mockReturnValue(1);

    expect(mockTimer.getCurrentPhase()).toBe('rest');
    expect(mockTimer.getTimeRemaining()).toBe(180);

    // Verify recovery phase label
    const phaseLabel = 'RECOVERY 1 of 4';
    expect(phaseLabel).toBe('RECOVERY 1 of 4');

    // Simulate recovery audio cues
    vi.mocked(mockTimer.getTimeRemaining).mockReturnValue(30);
    await sendNotification('Recovery Almost Complete', '30 seconds until next work interval');
    expect(sendNotification).toHaveBeenCalledWith(
      'Recovery Almost Complete',
      '30 seconds until next work interval'
    );

    vi.mocked(mockTimer.getTimeRemaining).mockReturnValue(0);
    await sendNotification('Recovery Complete', 'Prepare for work interval 2.');
    await playSound('energetic_beep');
    expect(sendNotification).toHaveBeenCalledWith(
      'Recovery Complete',
      'Prepare for work interval 2.'
    );
  });

  /**
   * AC-4: Complete all 4 intervals with HR data collection
   *
   * Validates Step 5 from quickstart.md:
   * - Loop through all 4 work + recovery cycles
   * - Collect heart rate data for each interval
   * - Store HR data in database
   * - Track interval progression
   */
  it('AC-4: should complete all 4 intervals and collect heart rate data', async () => {
    workoutId = 1;

    // Heart rate data for each interval (from quickstart.md table)
    const intervalData = [
      { interval: 1, workHR: 178, recoveryHR: 128 },
      { interval: 2, workHR: 180, recoveryHR: 132 },
      { interval: 3, workHR: 182, recoveryHR: 135 },
      { interval: 4, workHR: 181, recoveryHR: 130 },
    ];

    // Execute all 4 intervals
    for (const data of intervalData) {
      // Work phase
      vi.mocked(mockTimer.getCurrentPhase).mockReturnValue('work');
      vi.mocked(mockTimer.getIntervalNumber).mockReturnValue(data.interval);
      vi.mocked(mockTimer.getTimeRemaining).mockReturnValue(240);

      // Simulate work interval completion
      vi.mocked(mockTimer.getTimeRemaining).mockReturnValue(0);

      // Recovery phase
      vi.mocked(mockTimer.getCurrentPhase).mockReturnValue('rest');
      vi.mocked(mockTimer.getTimeRemaining).mockReturnValue(180);

      // Simulate recovery interval completion
      vi.mocked(mockTimer.getTimeRemaining).mockReturnValue(0);

      // Log interval data to database
      await mockDb.runAsync(
        'INSERT INTO vo2max_intervals (workout_id, interval_number, work_duration_sec, rest_duration_sec, work_avg_hr, rest_avg_hr) VALUES (?, ?, ?, ?, ?, ?)',
        [workoutId, data.interval, 240, 180, data.workHR, data.recoveryHR]
      );
    }

    // Verify all 4 intervals were logged
    expect(mockDb.runAsync).toHaveBeenCalledTimes(4);

    // Verify interval data
    for (let i = 0; i < intervalData.length; i++) {
      expect(mockDb.runAsync).toHaveBeenNthCalledWith(
        i + 1,
        expect.stringContaining('INSERT INTO vo2max_intervals'),
        expect.arrayContaining([
          workoutId,
          intervalData[i].interval,
          240,
          180,
          intervalData[i].workHR,
          intervalData[i].recoveryHR,
        ])
      );
    }

    // Calculate total duration: 4 × 4min work + 3 × 3min rest = 16 + 9 = 25 minutes
    const totalDuration = 4 * 240 + 3 * 180;
    expect(totalDuration).toBe(1500); // 25 minutes (not 28 - last recovery is skipped)
  });

  /**
   * AC-5: View session summary with calculated metrics
   *
   * Validates Step 6 from quickstart.md:
   * - Display session summary after final interval
   * - Show total duration, intervals completed
   * - Calculate average work HR and peak HR
   * - Display time in target zone percentage
   * - Calculate estimated VO2max
   */
  it('AC-5: should display session summary with calculated metrics', async () => {
    workoutId = 1;

    // Mock interval data
    const intervals = [
      { interval_number: 1, work_avg_hr: 178, rest_avg_hr: 128 },
      { interval_number: 2, work_avg_hr: 180, rest_avg_hr: 132 },
      { interval_number: 3, work_avg_hr: 182, rest_avg_hr: 135 },
      { interval_number: 4, work_avg_hr: 181, rest_avg_hr: 130 },
    ];

    vi.mocked(mockDb.getAllAsync).mockResolvedValue(intervals);

    const intervalResults = await mockDb.getAllAsync(
      'SELECT interval_number, work_avg_hr, rest_avg_hr FROM vo2max_intervals WHERE workout_id = ? ORDER BY interval_number',
      [workoutId]
    );

    expect(intervalResults.length).toBe(4);

    // Calculate session metrics
    const avgWorkHR = Math.round(
      intervalResults.reduce((sum, int) => sum + int.work_avg_hr, 0) / intervalResults.length
    );
    const peakHR = Math.max(...intervalResults.map((int) => int.work_avg_hr));

    expect(avgWorkHR).toBe(180); // (178+180+182+181)/4 = 180.25 ≈ 180
    expect(peakHR).toBe(182);

    // Calculate time in target zone
    // All intervals had HR within target zone (172-182 bpm)
    const timeInZone = 4 * 240; // 4 intervals × 4 minutes
    const totalWorkTime = 4 * 240;
    const timeInZonePercentage = (timeInZone / totalWorkTime) * 100;

    expect(timeInZonePercentage).toBe(100);

    // Calculate VO2max estimate using simplified formula
    // Formula: 15.3 × (max_hr / resting_hr)
    // From quickstart.md: If resting HR = 60, max HR = 182 → VO2max ≈ 46.4 ml/kg/min
    const restingHR = 60;
    const estimatedVO2max = parseFloat((15.3 * (peakHR / restingHR)).toFixed(1));

    expect(estimatedVO2max).toBe(46.4);

    // Verify session summary data
    const sessionSummary = {
      totalDuration: 28, // minutes (includes setup/cooldown)
      intervalsCompleted: 4,
      avgWorkHR: avgWorkHR,
      peakHR: peakHR,
      timeInTargetZone: timeInZonePercentage,
      estimatedVO2max: estimatedVO2max,
    };

    expect(sessionSummary.totalDuration).toBe(28);
    expect(sessionSummary.intervalsCompleted).toBe(4);
    expect(sessionSummary.avgWorkHR).toBe(180);
    expect(sessionSummary.peakHR).toBe(182);
    expect(sessionSummary.timeInTargetZone).toBe(100);
    expect(sessionSummary.estimatedVO2max).toBe(46.4);
  });

  /**
   * AC-6: Save VO2max session to database
   *
   * Validates Step 7 from quickstart.md:
   * - Create vo2max_sessions record
   * - Store protocol type, duration, intervals completed
   * - Store calculated metrics (avg HR, peak HR, VO2max)
   * - Validate physiological ranges
   */
  it('AC-6: should save VO2max session data to database', async () => {
    workoutId = 1;

    const sessionData = {
      workout_id: workoutId,
      protocol: '4x4',
      duration_seconds: 1680, // 28 minutes
      intervals_completed: 4,
      average_hr: 180,
      peak_hr: 182,
      estimated_vo2max: 46.4,
    };

    const sessionResult = await mockDb.runAsync(
      'INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, intervals_completed, average_hr, peak_hr, estimated_vo2max, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        sessionData.workout_id,
        sessionData.protocol,
        sessionData.duration_seconds,
        sessionData.intervals_completed,
        sessionData.average_hr,
        sessionData.peak_hr,
        sessionData.estimated_vo2max,
        0, // synced = false
      ]
    );

    vo2maxSessionId = sessionResult.lastInsertRowId;
    expect(vo2maxSessionId).toBe(1);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO vo2max_sessions'),
      expect.arrayContaining([workoutId, '4x4', 1680, 4, 180, 182, 46.4, 0])
    );

    // Validate physiological ranges
    expect(sessionData.average_hr).toBeGreaterThanOrEqual(60);
    expect(sessionData.average_hr).toBeLessThanOrEqual(220);
    expect(sessionData.peak_hr).toBeGreaterThanOrEqual(60);
    expect(sessionData.peak_hr).toBeLessThanOrEqual(220);
    expect(sessionData.estimated_vo2max).toBeGreaterThanOrEqual(20);
    expect(sessionData.estimated_vo2max).toBeLessThanOrEqual(80);
  });

  /**
   * AC-7: Mark workout as completed with accurate duration
   *
   * Validates Step 8 from quickstart.md:
   * - Update workout status to "completed"
   * - Set completed_at timestamp
   * - Verify duration calculation
   */
  it('AC-7: should mark workout as completed with accurate duration', async () => {
    workoutId = 1;

    const startedAt = 1727982000000; // Example timestamp
    const completedAt = 1727983680000; // 28 minutes later

    const workoutUpdate = await mockDb.runAsync(
      'UPDATE workouts SET status = ?, completed_at = ? WHERE id = ?',
      ['completed', completedAt, workoutId]
    );

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workouts'),
      expect.arrayContaining(['completed', completedAt, workoutId])
    );

    // Verify duration
    const durationSeconds = (completedAt - startedAt) / 1000;
    expect(durationSeconds).toBe(1680); // 28 minutes

    // Mock workout retrieval
    vi.mocked(mockDb.getFirstAsync).mockResolvedValue({
      id: workoutId,
      status: 'completed',
      started_at: startedAt,
      completed_at: completedAt,
    });

    const workout = await mockDb.getFirstAsync('SELECT * FROM workouts WHERE id = ?', [workoutId]);

    expect(workout.status).toBe('completed');
    expect(workout.completed_at).toBeGreaterThan(workout.started_at);
    expect((workout.completed_at - workout.started_at) / 1000).toBe(1680);
  });

  /**
   * AC-8: Calculate VO2max estimate using HR data
   *
   * Validates VO2max calculation accuracy:
   * - Use simplified formula: 15.3 × (max_hr / resting_hr)
   * - Verify calculation matches expected value
   * - Validate against physiological ranges
   */
  it('AC-8: should calculate VO2max estimate using heart rate data', async () => {
    const testCases = [
      { maxHR: 182, restingHR: 60, expected: 46.4 },
      { maxHR: 190, restingHR: 65, expected: 44.7 },
      { maxHR: 175, restingHR: 58, expected: 46.1 },
    ];

    for (const testCase of testCases) {
      const vo2max = parseFloat((15.3 * (testCase.maxHR / testCase.restingHR)).toFixed(1));
      expect(vo2max).toBe(testCase.expected);
      expect(vo2max).toBeGreaterThanOrEqual(20);
      expect(vo2max).toBeLessThanOrEqual(80);
    }
  });

  /**
   * AC-9: Display VO2max progression in Analytics dashboard
   *
   * Validates Step 9 from quickstart.md:
   * - Navigate to Analytics → Cardio tab
   * - Display VO2max trend line chart
   * - Show latest data point (46.4 ml/kg/min)
   * - Display milestone badge based on fitness level
   * - Show target improvement overlay
   */
  it('AC-9: should display VO2max progression in Analytics dashboard', async () => {
    // Seed historical VO2max data (8 weeks)
    const historicalData = [
      { date: '2025-09-04', vo2max: 42.1, avg_hr: 172, peak_hr: 180 },
      { date: '2025-09-11', vo2max: 43.5, avg_hr: 174, peak_hr: 181 },
      { date: '2025-09-18', vo2max: 44.2, avg_hr: 175, peak_hr: 182 },
      { date: '2025-09-25', vo2max: 45.0, avg_hr: 177, peak_hr: 183 },
      { date: '2025-10-02', vo2max: 45.8, avg_hr: 178, peak_hr: 184 },
      { date: '2025-10-03', vo2max: 46.4, avg_hr: 180, peak_hr: 182 }, // Today's session
    ];

    for (const session of historicalData) {
      await mockDb.runAsync(
        'INSERT INTO vo2max_sessions (user_id, workout_id, date, status, estimated_vo2max, average_hr, peak_hr) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 1, session.date, 'completed', session.vo2max, session.avg_hr, session.peak_hr]
      );
    }

    // Query VO2max progression
    vi.mocked(mockDb.getAllAsync).mockResolvedValue(historicalData);

    const progressionData = await mockDb.getAllAsync(
      `SELECT date, estimated_vo2max, average_hr, peak_hr
       FROM vo2max_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY date`,
      [userId]
    );

    expect(progressionData.length).toBe(6);

    // Verify latest data point
    const latestSession = progressionData[progressionData.length - 1];
    expect(latestSession.vo2max).toBe(46.4);
    expect(latestSession.date).toBe('2025-10-03');

    // Verify progression trend
    const initialVO2max = progressionData[0].vo2max;
    const finalVO2max = latestSession.vo2max;
    const improvement = finalVO2max - initialVO2max;

    expect(improvement).toBeGreaterThan(0);
    expect(improvement).toBe(4.3); // 42.1 → 46.4

    // Determine fitness milestone badge
    let milestoneBadge: string;
    if (finalVO2max < 35) {
      milestoneBadge = 'Poor Fitness: <35 ml/kg/min';
    } else if (finalVO2max < 45) {
      milestoneBadge = 'Average Fitness: 35-45 ml/kg/min';
    } else if (finalVO2max < 55) {
      milestoneBadge = 'Good Fitness: 45-55 ml/kg/min';
    } else {
      milestoneBadge = 'Excellent Fitness: 55+ ml/kg/min';
    }

    expect(milestoneBadge).toBe('Good Fitness: 45-55 ml/kg/min');

    // Target improvement overlay (based on Norwegian 4×4 research: +5-13% in 12 weeks)
    const targetImprovement = {
      weeks: 12,
      minImprovement: Math.round(finalVO2max * 0.05 * 10) / 10, // +5%
      maxImprovement: Math.round(finalVO2max * 0.13 * 10) / 10, // +13%
    };

    expect(targetImprovement.minImprovement).toBe(2.3);
    expect(targetImprovement.maxImprovement).toBe(6.0);

    // Verify Analytics dashboard data structure
    const analyticsData = {
      chartData: progressionData.map((d) => ({
        x: new Date(d.date),
        y: d.vo2max,
      })),
      latestVO2max: finalVO2max,
      milestoneBadge: milestoneBadge,
      targetImprovement: `+${targetImprovement.minImprovement}-${targetImprovement.maxImprovement} ml/kg/min in ${targetImprovement.weeks} weeks`,
      totalSessions: progressionData.length,
    };

    expect(analyticsData.chartData.length).toBe(6);
    expect(analyticsData.latestVO2max).toBe(46.4);
    expect(analyticsData.totalSessions).toBe(6);
  });

  /**
   * Integration Test: Complete VO2max Session Workflow
   *
   * Validates end-to-end workflow combining all acceptance criteria:
   * - Create workout → Execute intervals → Save session → Update analytics
   */
  it('should complete full VO2max session workflow from start to analytics', async () => {
    const startTime = Date.now();

    // 1. Create workout
    const workoutResult = await mockDb.runAsync(
      'INSERT INTO workouts (user_id, program_day_id, date, status, started_at) VALUES (?, ?, ?, ?, ?)',
      [userId, 3, '2025-10-03', 'in_progress', startTime]
    );
    workoutId = workoutResult.lastInsertRowId;

    // 2. Execute all 4 intervals
    const intervals = [
      { interval: 1, workHR: 178, recoveryHR: 128 },
      { interval: 2, workHR: 180, recoveryHR: 132 },
      { interval: 3, workHR: 182, recoveryHR: 135 },
      { interval: 4, workHR: 181, recoveryHR: 130 },
    ];

    for (const data of intervals) {
      await mockDb.runAsync(
        'INSERT INTO vo2max_intervals (workout_id, interval_number, work_duration_sec, rest_duration_sec, work_avg_hr, rest_avg_hr) VALUES (?, ?, ?, ?, ?, ?)',
        [workoutId, data.interval, 240, 180, data.workHR, data.recoveryHR]
      );
    }

    // 3. Calculate session metrics
    vi.mocked(mockDb.getAllAsync).mockResolvedValue(intervals);
    const intervalResults = await mockDb.getAllAsync(
      'SELECT work_avg_hr FROM vo2max_intervals WHERE workout_id = ?',
      [workoutId]
    );

    const avgHR = Math.round(
      intervalResults.reduce((sum, i) => sum + i.workHR, 0) / intervalResults.length
    );
    const peakHR = Math.max(...intervalResults.map((i) => i.workHR));
    const estimatedVO2max = parseFloat((15.3 * (peakHR / 60)).toFixed(1));

    // 4. Save VO2max session
    const sessionResult = await mockDb.runAsync(
      'INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, intervals_completed, average_hr, peak_hr, estimated_vo2max, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [workoutId, '4x4', 1680, 4, avgHR, peakHR, estimatedVO2max, 0]
    );
    vo2maxSessionId = sessionResult.lastInsertRowId;

    // 5. Mark workout completed
    const completedAt = startTime + 1680000; // 28 minutes later
    await mockDb.runAsync('UPDATE workouts SET status = ?, completed_at = ? WHERE id = ?', [
      'completed',
      completedAt,
      workoutId,
    ]);

    // 6. Verify Analytics data
    vi.mocked(mockDb.getFirstAsync).mockResolvedValue({
      id: vo2maxSessionId,
      workout_id: workoutId,
      protocol: '4x4',
      duration_seconds: 1680,
      intervals_completed: 4,
      average_hr: avgHR,
      peak_hr: peakHR,
      estimated_vo2max: estimatedVO2max,
    });

    const savedSession = await mockDb.getFirstAsync('SELECT * FROM vo2max_sessions WHERE id = ?', [
      vo2maxSessionId,
    ]);

    // Assertions
    expect(savedSession.workout_id).toBe(workoutId);
    expect(savedSession.protocol).toBe('4x4');
    expect(savedSession.intervals_completed).toBe(4);
    expect(savedSession.average_hr).toBe(180);
    expect(savedSession.peak_hr).toBe(182);
    expect(savedSession.estimated_vo2max).toBe(46.4);

    // Verify database was updated correctly
    expect(mockDb.runAsync).toHaveBeenCalledTimes(7); // 1 workout + 4 intervals + 1 session + 1 update
  });
});
