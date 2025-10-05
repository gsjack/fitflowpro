/**
 * Tests for useWorkoutSession hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-native';
import { useWorkoutSession } from '../useWorkoutSession';
import * as workoutStore from '../../stores/workoutStore';
import * as settingsStore from '../../stores/settingsStore';

// Mock dependencies
vi.mock('../../stores/workoutStore');
vi.mock('../../stores/settingsStore');
vi.mock('../../services/database/workoutDb');
vi.mock('../../services/timer/timerService');
vi.mock('../../utils/unitConversion', () => ({
  getUnitLabel: vi.fn(() => 'kg'),
}));

// Mock React Native modules
vi.mock('react-native', () => ({
  AccessibilityInfo: {
    announceForAccessibility: vi.fn(),
    setAccessibilityFocus: vi.fn(),
  },
  findNodeHandle: vi.fn(() => 123),
  Platform: { OS: 'ios' },
}));

describe('useWorkoutSession', () => {
  const mockWorkout = {
    id: 1,
    user_id: 1,
    program_day_id: 1,
    date: '2025-10-05',
    status: 'in_progress',
  };

  const _mockExercise = {
    id: 1,
    exercise_id: 10,
    exercise_name: 'Bench Press',
    sets: 3,
    reps: 10,
    rir: 2,
  };

  const mockLogSet = vi.fn();
  const mockNextExercise = vi.fn();
  const mockCompleteWorkout = vi.fn();
  const mockCancelWorkout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(workoutStore.useWorkoutStore).mockReturnValue({
      currentWorkout: mockWorkout,
      exerciseIndex: 0,
      completedSets: [],
      logSet: mockLogSet,
      nextExercise: mockNextExercise,
      completeWorkout: mockCompleteWorkout,
      cancelWorkout: mockCancelWorkout,
    } as any);

    vi.mocked(settingsStore.useSettingsStore).mockReturnValue({
      weightUnit: 'kg',
    } as any);
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useWorkoutSession());

    expect(result.current.exercises).toEqual([]);
    expect(result.current.currentExercise).toBeNull();
    expect(result.current.currentSetNumber).toBe(1);
    expect(result.current.isTimerActive).toBe(false);
    expect(result.current.previousSet).toBeNull();
    expect(result.current.videoModalVisible).toBe(false);
    expect(result.current.historyExpanded).toBe(false);
  });

  it('provides all necessary actions', () => {
    const { result } = renderHook(() => useWorkoutSession());

    expect(typeof result.current.handleLogSet).toBe('function');
    expect(typeof result.current.handleCompleteWorkout).toBe('function');
    expect(typeof result.current.handleCancelWorkout).toBe('function');
    expect(typeof result.current.confirmCancelWorkout).toBe('function');
    expect(typeof result.current.handleTimerComplete).toBe('function');
    expect(typeof result.current.setVideoModalVisible).toBe('function');
    expect(typeof result.current.setHistoryExpanded).toBe('function');
  });

  it('handles workout completion', async () => {
    const { result } = renderHook(() => useWorkoutSession());

    await act(async () => {
      await result.current.handleCompleteWorkout();
    });

    expect(mockCompleteWorkout).toHaveBeenCalledTimes(1);
  });

  it('handles workout cancellation', async () => {
    const { result } = renderHook(() => useWorkoutSession());

    await act(async () => {
      await result.current.confirmCancelWorkout();
    });

    expect(mockCancelWorkout).toHaveBeenCalledTimes(1);
  });

  it('handles timer completion', () => {
    const { result } = renderHook(() => useWorkoutSession());

    act(() => {
      result.current.handleTimerComplete();
    });

    expect(result.current.isTimerActive).toBe(false);
  });

  it('toggles video modal visibility', () => {
    const { result } = renderHook(() => useWorkoutSession());

    expect(result.current.videoModalVisible).toBe(false);

    act(() => {
      result.current.setVideoModalVisible(true);
    });

    expect(result.current.videoModalVisible).toBe(true);

    act(() => {
      result.current.setVideoModalVisible(false);
    });

    expect(result.current.videoModalVisible).toBe(false);
  });

  it('toggles history expansion', () => {
    const { result } = renderHook(() => useWorkoutSession());

    expect(result.current.historyExpanded).toBe(false);

    act(() => {
      result.current.setHistoryExpanded(true);
    });

    expect(result.current.historyExpanded).toBe(true);

    act(() => {
      result.current.setHistoryExpanded(false);
    });

    expect(result.current.historyExpanded).toBe(false);
  });

  it('provides setLogCardRef for accessibility', () => {
    const { result } = renderHook(() => useWorkoutSession());

    expect(result.current.setLogCardRef).toBeDefined();
    expect(result.current.setLogCardRef.current).toBeNull();
  });

  it('calculates current set number based on completed sets', () => {
    vi.mocked(workoutStore.useWorkoutStore).mockReturnValue({
      currentWorkout: mockWorkout,
      exerciseIndex: 0,
      completedSets: [
        { exerciseId: 10, weightKg: 100, reps: 10, rir: 2 },
        { exerciseId: 10, weightKg: 100, reps: 9, rir: 2 },
      ],
      logSet: mockLogSet,
      nextExercise: mockNextExercise,
      completeWorkout: mockCompleteWorkout,
      cancelWorkout: mockCancelWorkout,
    } as any);

    const { result } = renderHook(() => useWorkoutSession());

    // Should be next set number (3rd set)
    expect(result.current.currentSetNumber).toBe(3);
  });
});
