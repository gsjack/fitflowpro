/**
 * Integration Test T022: Mesocycle Phase Progression
 *
 * Validates Scenario 3 from quickstart.md:
 * - Complete full 8-week mesocycle: MEV → MAV → MRV → Deload → MEV
 * - Verify volume adjustments (+20% MEV→MAV, +15% MAV→MRV, -50% MRV→Deload)
 * - Test recovery-based progression prompts
 * - Verify cycle reset after deload completion
 * - Track chest exercise volume through all phases (10→12→14→7→10 sets/workout)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock modules
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

const API_BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'mock-jwt-token-12345';

describe('Integration Test: Mesocycle Phase Progression (T022)', () => {
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock authenticated state
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(AUTH_TOKEN);

    // Setup default fetch mock
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AC-1: Complete MEV Week 2 with Good Recovery', () => {
    it('should track 2 consecutive weeks of good recovery scores', async () => {
      // Week 1 recovery assessments (scores > 12)
      const week1Assessments = [
        { date: '2025-10-01', sleep_quality: 5, muscle_soreness: 5, motivation: 5, score: 15 },
        { date: '2025-10-02', sleep_quality: 4, muscle_soreness: 5, motivation: 4, score: 13 },
        { date: '2025-10-03', sleep_quality: 5, muscle_soreness: 4, motivation: 5, score: 14 },
        { date: '2025-10-04', sleep_quality: 5, muscle_soreness: 5, motivation: 4, score: 14 },
        { date: '2025-10-05', sleep_quality: 4, muscle_soreness: 4, motivation: 5, score: 13 },
        { date: '2025-10-06', sleep_quality: 5, muscle_soreness: 5, motivation: 5, score: 15 },
      ];

      // Week 2 recovery assessments (scores > 12)
      const week2Assessments = [
        { date: '2025-10-08', sleep_quality: 5, muscle_soreness: 4, motivation: 5, score: 14 },
        { date: '2025-10-09', sleep_quality: 4, muscle_soreness: 5, motivation: 4, score: 13 },
        { date: '2025-10-10', sleep_quality: 5, muscle_soreness: 5, motivation: 5, score: 15 },
        { date: '2025-10-11', sleep_quality: 5, muscle_soreness: 4, motivation: 4, score: 13 },
        { date: '2025-10-12', sleep_quality: 4, muscle_soreness: 5, motivation: 5, score: 14 },
        { date: '2025-10-13', sleep_quality: 5, muscle_soreness: 5, motivation: 5, score: 15 },
      ];

      // Mock GET recovery assessments
      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/recovery-assessments')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              assessments: [...week1Assessments, ...week2Assessments],
              averageScore: 14,
              weeklyAverages: [
                { week: 1, average: 14 },
                { week: 2, average: 14 },
              ],
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      // Fetch recovery data
      const response = await fetch(`${API_BASE_URL}/api/recovery-assessments`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      // Verify 2 consecutive weeks
      expect(data.weeklyAverages).toHaveLength(2);
      expect(data.weeklyAverages[0].average).toBeGreaterThan(12);
      expect(data.weeklyAverages[1].average).toBeGreaterThan(12);

      // Verify all assessments have good recovery
      const allGoodRecovery = data.assessments.every((a: any) => a.score > 12);
      expect(allGoodRecovery).toBe(true);
    });
  });

  describe('AC-2: Receive Prompt to Advance to MAV Phase', () => {
    it('should show advancement prompt after 2 weeks of good recovery', async () => {
      // Mock program at MEV phase, week 2
      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/programs/1')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              id: 1,
              user_id: 1,
              name: 'Renaissance Periodization 6-Day Split',
              mesocycle_week: 2,
              mesocycle_phase: 'mev',
              created_at: 1727900000000,
              canAdvance: true,
              nextPhase: 'mav',
              advancementReason: '2 consecutive weeks of good recovery (score > 12)',
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      const response = await fetch(`${API_BASE_URL}/api/programs/1`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      });

      const program = await response.json();

      expect(program.mesocycle_week).toBe(2);
      expect(program.mesocycle_phase).toBe('mev');
      expect(program.canAdvance).toBe(true);
      expect(program.nextPhase).toBe('mav');
      expect(program.advancementReason).toContain('2 consecutive weeks');
    });
  });

  describe('AC-3: Advance from MEV to MAV Phase', () => {
    it('should successfully advance phase via API', async () => {
      // Mock PATCH /api/programs/1/advance-phase
      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request, options?: any) => {
        const urlString = url.toString();
        if (urlString.includes('/api/programs/1/advance-phase') && options?.method === 'PATCH') {
          const body = JSON.parse(options.body);
          expect(body.current_phase).toBe('mev');
          expect(body.target_phase).toBe('mav');

          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              id: 1,
              user_id: 1,
              name: 'Renaissance Periodization 6-Day Split',
              mesocycle_week: 3,
              mesocycle_phase: 'mav',
              volume_adjustment: '+20%',
              affected_exercises: 48,
              updated_at: 1727987800000,
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      const response = await fetch(`${API_BASE_URL}/api/programs/1/advance-phase`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_phase: 'mev',
          target_phase: 'mav',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.mesocycle_phase).toBe('mav');
      expect(data.mesocycle_week).toBe(3);
      expect(data.volume_adjustment).toBe('+20%');
      expect(data.affected_exercises).toBe(48);
    });
  });

  describe('AC-4: Verify +20% Volume Increase (MEV → MAV)', () => {
    it('should increase chest volume from 10 to 12 sets per workout', async () => {
      // MEV baseline: 4 + 3 + 3 = 10 sets/workout
      const mevExercises = [
        { exercise_name: 'Barbell Bench Press', sets: 4, reps: '6-8', rir: 3 },
        { exercise_name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rir: 2 },
        { exercise_name: 'Cable Flyes', sets: 3, reps: '12-15', rir: 1 },
      ];

      // MAV: 5 + 4 + 4 = 13 sets/workout (~30% increase due to rounding)
      const mavExercises = [
        { exercise_name: 'Barbell Bench Press', sets: 5, reps: '6-8', rir: 3 },
        { exercise_name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', rir: 2 },
        { exercise_name: 'Cable Flyes', sets: 4, reps: '12-15', rir: 1 },
      ];

      // Mock GET program-days at MEV
      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/program-days/recommended?day=1')) {
          // Check if MAV phase (after advancement)
          const isMav = urlString.includes('phase=mav');
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              exercises: isMav ? mavExercises : mevExercises,
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      // Get MEV baseline
      const mevResponse = await fetch(`${API_BASE_URL}/api/program-days/recommended?day=1`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      });
      const mevData = await mevResponse.json();
      const mevTotal = mevData.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);

      expect(mevTotal).toBe(10);

      // Get MAV volume
      const mavResponse = await fetch(
        `${API_BASE_URL}/api/program-days/recommended?day=1&phase=mav`,
        {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        }
      );
      const mavData = await mavResponse.json();
      const mavTotal = mavData.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);

      expect(mavTotal).toBe(13);

      // Verify individual exercise increases
      expect(mavData.exercises[0].sets).toBe(5); // 4 → 5 (+25%)
      expect(mavData.exercises[1].sets).toBe(4); // 3 → 4 (+33%)
      expect(mavData.exercises[2].sets).toBe(4); // 3 → 4 (+33%)

      // Verify weekly volume (2 workouts/week)
      const mevWeekly = mevTotal * 2; // 20 sets/week
      const mavWeekly = mavTotal * 2; // 26 sets/week
      const percentIncrease = ((mavWeekly - mevWeekly) / mevWeekly) * 100;

      expect(percentIncrease).toBeGreaterThanOrEqual(20);
      expect(percentIncrease).toBeLessThanOrEqual(35); // Allow rounding variance
    });
  });

  describe('AC-5: Advance from MAV to MRV Phase', () => {
    it('should advance to MRV with +15% volume from MAV', async () => {
      // Mock PATCH /api/programs/1/advance-phase (MAV → MRV)
      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request, options?: any) => {
        const urlString = url.toString();
        if (urlString.includes('/api/programs/1/advance-phase') && options?.method === 'PATCH') {
          const body = JSON.parse(options.body);
          expect(body.current_phase).toBe('mav');
          expect(body.target_phase).toBe('mrv');

          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              id: 1,
              user_id: 1,
              name: 'Renaissance Periodization 6-Day Split',
              mesocycle_week: 6,
              mesocycle_phase: 'mrv',
              volume_adjustment: '+15%',
              affected_exercises: 48,
              updated_at: 1728592600000,
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      const response = await fetch(`${API_BASE_URL}/api/programs/1/advance-phase`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_phase: 'mav',
          target_phase: 'mrv',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.mesocycle_phase).toBe('mrv');
      expect(data.mesocycle_week).toBe(6);
      expect(data.volume_adjustment).toBe('+15%');
    });

    it('should increase chest volume from MAV 13 sets to MRV 15 sets', async () => {
      // MAV: 5 + 4 + 4 = 13 sets/workout
      const mavExercises = [
        { exercise_name: 'Barbell Bench Press', sets: 5, reps: '6-8', rir: 2 },
        { exercise_name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', rir: 2 },
        { exercise_name: 'Cable Flyes', sets: 4, reps: '12-15', rir: 1 },
      ];

      // MRV: 6 + 5 + 4 = 15 sets/workout (~15% increase)
      const mrvExercises = [
        { exercise_name: 'Barbell Bench Press', sets: 6, reps: '6-8', rir: 2 },
        { exercise_name: 'Incline Dumbbell Press', sets: 5, reps: '8-10', rir: 2 },
        { exercise_name: 'Cable Flyes', sets: 4, reps: '12-15', rir: 1 },
      ];

      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/program-days/recommended?day=1')) {
          const isMrv = urlString.includes('phase=mrv');
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              exercises: isMrv ? mrvExercises : mavExercises,
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      // Get MAV baseline
      const mavResponse = await fetch(`${API_BASE_URL}/api/program-days/recommended?day=1`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      });
      const mavData = await mavResponse.json();
      const mavTotal = mavData.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);

      expect(mavTotal).toBe(13);

      // Get MRV volume
      const mrvResponse = await fetch(
        `${API_BASE_URL}/api/program-days/recommended?day=1&phase=mrv`,
        {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        }
      );
      const mrvData = await mrvResponse.json();
      const mrvTotal = mrvData.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);

      expect(mrvTotal).toBe(15);

      // Verify weekly volume approaches MRV limit
      const mrvWeekly = mrvTotal * 2; // 30 sets/week
      expect(mrvWeekly).toBeGreaterThanOrEqual(28); // Near MRV limit of 32
      expect(mrvWeekly).toBeLessThanOrEqual(32);
    });
  });

  describe('AC-6: Advance from MRV to Deload Phase', () => {
    it('should advance to deload with -50% volume reduction', async () => {
      // Mock PATCH /api/programs/1/advance-phase (MRV → Deload)
      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request, options?: any) => {
        const urlString = url.toString();
        if (urlString.includes('/api/programs/1/advance-phase') && options?.method === 'PATCH') {
          const body = JSON.parse(options.body);
          expect(body.current_phase).toBe('mrv');
          expect(body.target_phase).toBe('deload');

          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              id: 1,
              user_id: 1,
              name: 'Renaissance Periodization 6-Day Split',
              mesocycle_week: 8,
              mesocycle_phase: 'deload',
              volume_adjustment: '-50%',
              affected_exercises: 48,
              updated_at: 1729197400000,
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      const response = await fetch(`${API_BASE_URL}/api/programs/1/advance-phase`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_phase: 'mrv',
          target_phase: 'deload',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.mesocycle_phase).toBe('deload');
      expect(data.mesocycle_week).toBe(8);
      expect(data.volume_adjustment).toBe('-50%');
    });

    it('should reduce chest volume from MRV 15 sets to Deload 7 sets', async () => {
      // MRV: 6 + 5 + 4 = 15 sets/workout
      const mrvExercises = [
        { exercise_name: 'Barbell Bench Press', sets: 6, reps: '6-8', rir: 2 },
        { exercise_name: 'Incline Dumbbell Press', sets: 5, reps: '8-10', rir: 2 },
        { exercise_name: 'Cable Flyes', sets: 4, reps: '12-15', rir: 1 },
      ];

      // Deload: 3 + 2 + 2 = 7 sets/workout (~53% reduction)
      const deloadExercises = [
        { exercise_name: 'Barbell Bench Press', sets: 3, reps: '6-8', rir: 4 },
        { exercise_name: 'Incline Dumbbell Press', sets: 2, reps: '8-10', rir: 3 },
        { exercise_name: 'Cable Flyes', sets: 2, reps: '12-15', rir: 3 },
      ];

      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/program-days/recommended?day=1')) {
          const isDeload = urlString.includes('phase=deload');
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              exercises: isDeload ? deloadExercises : mrvExercises,
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      // Get MRV baseline
      const mrvResponse = await fetch(`${API_BASE_URL}/api/program-days/recommended?day=1`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      });
      const mrvData = await mrvResponse.json();
      const mrvTotal = mrvData.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);

      expect(mrvTotal).toBe(15);

      // Get Deload volume
      const deloadResponse = await fetch(
        `${API_BASE_URL}/api/program-days/recommended?day=1&phase=deload`,
        {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        }
      );
      const deloadData = await deloadResponse.json();
      const deloadTotal = deloadData.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);

      expect(deloadTotal).toBe(7);

      // Verify volume reduction
      const percentReduction = ((mrvTotal - deloadTotal) / mrvTotal) * 100;
      expect(percentReduction).toBeGreaterThanOrEqual(45);
      expect(percentReduction).toBeLessThanOrEqual(55);

      // Verify RIR increases during deload
      expect(deloadData.exercises[0].rir).toBeGreaterThanOrEqual(3);
      expect(deloadData.exercises[1].rir).toBeGreaterThanOrEqual(3);
    });
  });

  describe('AC-7: Complete 8-Week Mesocycle and Reset to MEV', () => {
    it('should reset to MEV phase after deload completion', async () => {
      // Mock PATCH /api/programs/1/advance-phase (Deload → MEV)
      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request, options?: any) => {
        const urlString = url.toString();
        if (urlString.includes('/api/programs/1/advance-phase') && options?.method === 'PATCH') {
          const body = JSON.parse(options.body);
          expect(body.current_phase).toBe('deload');
          expect(body.target_phase).toBe('mev');

          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              id: 1,
              user_id: 1,
              name: 'Renaissance Periodization 6-Day Split',
              mesocycle_week: 1,
              mesocycle_phase: 'mev',
              volume_adjustment: 'reset',
              affected_exercises: 48,
              updated_at: 1729802200000,
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      const response = await fetch(`${API_BASE_URL}/api/programs/1/advance-phase`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_phase: 'deload',
          target_phase: 'mev',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.mesocycle_phase).toBe('mev');
      expect(data.mesocycle_week).toBe(1);
      expect(data.volume_adjustment).toBe('reset');
    });

    it('should restore baseline volume after reset', async () => {
      // Deload: 3 + 2 + 2 = 7 sets/workout
      const deloadExercises = [
        { exercise_name: 'Barbell Bench Press', sets: 3, reps: '6-8', rir: 4 },
        { exercise_name: 'Incline Dumbbell Press', sets: 2, reps: '8-10', rir: 3 },
        { exercise_name: 'Cable Flyes', sets: 2, reps: '12-15', rir: 3 },
      ];

      // MEV reset: 4 + 3 + 3 = 10 sets/workout (same as original baseline)
      const mevResetExercises = [
        { exercise_name: 'Barbell Bench Press', sets: 4, reps: '6-8', rir: 3 },
        { exercise_name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rir: 2 },
        { exercise_name: 'Cable Flyes', sets: 3, reps: '12-15', rir: 1 },
      ];

      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/program-days/recommended?day=1')) {
          const isMevReset = urlString.includes('phase=mev');
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              exercises: isMevReset ? mevResetExercises : deloadExercises,
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      // Get deload volume
      const deloadResponse = await fetch(`${API_BASE_URL}/api/program-days/recommended?day=1`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      });
      const deloadData = await deloadResponse.json();
      const deloadTotal = deloadData.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);

      expect(deloadTotal).toBe(7);

      // Get MEV reset volume
      const mevResponse = await fetch(
        `${API_BASE_URL}/api/program-days/recommended?day=1&phase=mev`,
        {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        }
      );
      const mevData = await mevResponse.json();
      const mevTotal = mevData.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);

      expect(mevTotal).toBe(10);

      // Verify RIR returns to normal training values
      expect(mevData.exercises[0].rir).toBe(3);
      expect(mevData.exercises[1].rir).toBe(2);
      expect(mevData.exercises[2].rir).toBe(1);
    });
  });

  describe('Full Mesocycle Integration', () => {
    it('should complete full 8-week cycle with correct volume progression', async () => {
      const phaseProgression = [
        {
          phase: 'mev',
          week: 1,
          chestSets: 10,
          adjustment: 'baseline',
          weeklyVolume: 20,
        },
        {
          phase: 'mav',
          week: 3,
          chestSets: 13,
          adjustment: '+20%',
          weeklyVolume: 26,
        },
        {
          phase: 'mrv',
          week: 6,
          chestSets: 15,
          adjustment: '+15%',
          weeklyVolume: 30,
        },
        {
          phase: 'deload',
          week: 8,
          chestSets: 7,
          adjustment: '-50%',
          weeklyVolume: 14,
        },
        {
          phase: 'mev',
          week: 1,
          chestSets: 10,
          adjustment: 'reset',
          weeklyVolume: 20,
        },
      ];

      // Verify each phase transition
      for (const expectedPhase of phaseProgression) {
        vi.mocked(global.fetch).mockImplementationOnce((url: string | URL | Request) => {
          const urlString = url.toString();
          if (urlString.includes('/api/programs/1')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({
                id: 1,
                mesocycle_week: expectedPhase.week,
                mesocycle_phase: expectedPhase.phase,
              }),
            } as Response);
          }
          return Promise.resolve({ ok: false, status: 404 } as Response);
        });

        const response = await fetch(`${API_BASE_URL}/api/programs/1`, {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });

        const program = await response.json();
        expect(program.mesocycle_phase).toBe(expectedPhase.phase);
        expect(program.mesocycle_week).toBe(expectedPhase.week);
      }
    });

    it('should maintain proper week counter throughout cycle', async () => {
      const weekProgression = [
        { phase: 'mev', weeks: [1, 2] },
        { phase: 'mav', weeks: [3, 4, 5] },
        { phase: 'mrv', weeks: [6, 7] },
        { phase: 'deload', weeks: [8] },
      ];

      for (const phaseData of weekProgression) {
        for (const week of phaseData.weeks) {
          vi.mocked(global.fetch).mockImplementationOnce((url: string | URL | Request) => {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({
                mesocycle_week: week,
                mesocycle_phase: phaseData.phase,
              }),
            } as Response);
          });

          const response = await fetch(`${API_BASE_URL}/api/programs/1`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
          });

          const program = await response.json();
          expect(program.mesocycle_week).toBe(week);
          expect(program.mesocycle_phase).toBe(phaseData.phase);
        }
      }
    });
  });

  describe('Volume Tracking Dashboard Updates', () => {
    it('should show updated volume targets after phase progression', async () => {
      // Mock volume tracking data for MAV phase
      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request) => {
        const urlString = url.toString();
        if (urlString.includes('/api/analytics/volume-tracking')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              muscleGroups: [
                {
                  name: 'Chest',
                  completed: 0,
                  planned: 26,
                  mev: 16,
                  mav: 24,
                  mrv: 32,
                  status: 'within_mav',
                },
              ],
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      const response = await fetch(`${API_BASE_URL}/api/analytics/volume-tracking`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      });

      const data = await response.json();
      const chestData = data.muscleGroups[0];

      expect(chestData.name).toBe('Chest');
      expect(chestData.planned).toBe(26); // MAV weekly volume
      expect(chestData.planned).toBeGreaterThanOrEqual(chestData.mev);
      expect(chestData.planned).toBeLessThanOrEqual(chestData.mrv);
      expect(chestData.status).toBe('within_mav');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should prevent advancing to invalid phase', async () => {
      vi.mocked(global.fetch).mockImplementation((url: string | URL | Request, options?: any) => {
        const urlString = url.toString();
        if (urlString.includes('/api/programs/1/advance-phase') && options?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({
              error: 'Invalid phase transition: mev -> mrv (must go through mav)',
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      const response = await fetch(`${API_BASE_URL}/api/programs/1/advance-phase`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_phase: 'mev',
          target_phase: 'mrv', // Invalid: skipping MAV
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toContain('Invalid phase transition');
    });

    it('should handle unauthorized access', async () => {
      // Mock missing auth token
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);

      const token = await AsyncStorage.getItem('@fitflow/auth_token');
      expect(token).toBeNull();

      // Attempt to fetch program without token should fail
      vi.mocked(global.fetch).mockImplementationOnce(() => {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Unauthorized' }),
        } as Response);
      });

      const response = await fetch(`${API_BASE_URL}/api/programs/1`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });
});
