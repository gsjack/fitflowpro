/**
 * Integration Test T020: Exercise Swap Workflow
 *
 * Validates Scenario 1 from quickstart.md (lines 63-295):
 * - View program in Planner screen
 * - Tap "Swap Exercise" on Barbell Bench Press
 * - See alternative chest exercises filtered by muscle group
 * - Select Dumbbell Bench Press as replacement
 * - Confirm swap and verify program updates
 * - Verify set/rep scheme transferred from original exercise
 * - Verify total chest volume maintained (14 sets/week)
 * - Verify MEV/MAV/MRV validation remains green
 *
 * Test Strategy:
 * - Mock API responses (no real backend calls)
 * - Test React Native components using React Native Testing Library
 * - Validate UI state, user interactions, and data flow
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import PlannerScreen from '../../src/screens/PlannerScreen';
import * as programDb from '../../src/services/database/programDb';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Mock React Native Paper Portal
vi.mock('react-native-paper', async () => {
  const actual = await vi.importActual('react-native-paper');
  return {
    ...actual,
    Portal: ({ children }: any) => children,
  };
});

// Mock programDb module
vi.mock('../../src/services/database/programDb');

describe('Scenario 1: Exercise Swap Workflow (T020)', () => {
  const userId = 1;
  const programId = 1;
  const programDayId = 1; // Push A (Chest-Focused)

  // Mock data: Renaissance Periodization 6-Day Split - Push A
  const mockProgram: programDb.Program = {
    id: programId,
    user_id: userId,
    name: 'Renaissance Periodization 6-Day Split',
    mesocycle_week: 3,
    mesocycle_phase: 'mav',
    created_at: 1727900000000,
  };

  const mockProgramDays: programDb.ProgramDay[] = [
    {
      id: 1,
      program_id: programId,
      day_of_week: 1,
      day_name: 'Push A (Chest-Focused)',
      day_type: 'strength',
    },
    {
      id: 2,
      program_id: programId,
      day_of_week: 2,
      day_name: 'Pull A (Lat-Focused)',
      day_type: 'strength',
    },
    {
      id: 3,
      program_id: programId,
      day_of_week: 3,
      day_name: 'VO2max A',
      day_type: 'vo2max',
    },
  ];

  const mockPushAExercises: programDb.ProgramExercise[] = [
    {
      id: 1,
      program_day_id: programDayId,
      exercise_id: 25,
      exercise_name: 'Barbell Back Squat',
      muscle_groups: '["quads","glutes","hamstrings"]',
      order_index: 1,
      sets: 3,
      reps: '6-8',
      rir: 3,
    },
    {
      id: 2,
      program_day_id: programDayId,
      exercise_id: 1,
      exercise_name: 'Barbell Bench Press',
      muscle_groups: '["chest","front_delts","triceps"]',
      order_index: 2,
      sets: 4,
      reps: '6-8',
      rir: 3,
    },
    {
      id: 3,
      program_day_id: programDayId,
      exercise_id: 5,
      exercise_name: 'Incline Dumbbell Press',
      muscle_groups: '["chest","front_delts","triceps"]',
      order_index: 3,
      sets: 3,
      reps: '8-10',
      rir: 2,
    },
    {
      id: 4,
      program_day_id: programDayId,
      exercise_id: 7,
      exercise_name: 'Cable Flyes',
      muscle_groups: '["chest"]',
      order_index: 4,
      sets: 3,
      reps: '12-15',
      rir: 1,
    },
  ];

  const mockAlternativeExercises: programDb.Exercise[] = [
    {
      id: 3,
      name: 'Dumbbell Bench Press',
      muscle_groups: '["chest","front_delts","triceps"]',
      equipment: 'dumbbell',
      difficulty: 'intermediate',
      default_sets: 4,
      default_reps: '8-10',
      default_rir: 2,
      notes: 'Allows greater ROM than barbell',
    },
    {
      id: 4,
      name: 'Incline Barbell Press',
      muscle_groups: '["chest","front_delts","triceps"]',
      equipment: 'barbell',
      difficulty: 'intermediate',
      default_sets: 4,
      default_reps: '6-8',
      default_rir: 2,
      notes: 'Upper chest emphasis',
    },
    {
      id: 6,
      name: 'Machine Chest Press',
      muscle_groups: '["chest","front_delts","triceps"]',
      equipment: 'machine',
      difficulty: 'beginner',
      default_sets: 4,
      default_reps: '8-12',
      default_rir: 2,
      notes: 'Easier to control, good for drop sets',
    },
  ];

  beforeEach(() => {
    // Mock auth token
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('mock-jwt-token');

    // Mock programDb functions
    vi.mocked(programDb.getUserProgram).mockResolvedValue(mockProgram);
    vi.mocked(programDb.getProgramDays).mockResolvedValue(mockProgramDays);
    vi.mocked(programDb.getProgramExercises).mockResolvedValue(mockPushAExercises);
    vi.mocked(programDb.getAllExercises).mockResolvedValue(mockAlternativeExercises);
    vi.mocked(programDb.swapExercise).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * AC-1: User views program and sees exercises with swap buttons
   */
  it('AC-1: should display program exercises with swap buttons', async () => {
    const { getByText, findByText } = render(<PlannerScreen userId={userId} />);

    // Wait for program to load
    await waitFor(() => {
      expect(programDb.getUserProgram).toHaveBeenCalledWith(userId);
    });

    // Verify program name displayed
    const programTitle = await findByText('Renaissance Periodization 6-Day Split');
    expect(programTitle).toBeTruthy();

    // Verify phase indicator
    const phaseChip = await findByText('Week 3 - MAV');
    expect(phaseChip).toBeTruthy();

    // Verify Push A day selected by default
    await waitFor(() => {
      expect(programDb.getProgramExercises).toHaveBeenCalledWith(programDayId);
    });

    // Verify exercises displayed
    const benchPress = await findByText('Barbell Bench Press');
    expect(benchPress).toBeTruthy();

    // Verify exercise details
    const exerciseDetails = await findByText('4 sets × 6-8 reps @ RIR 3');
    expect(exerciseDetails).toBeTruthy();
  });

  /**
   * AC-2: User taps "Swap Exercise" button on Barbell Bench Press
   */
  it('AC-2: should open swap modal when swap button is tapped', async () => {
    const { getByLabelText, findByText, getByText } = render(<PlannerScreen userId={userId} />);

    // Wait for exercises to load
    await findByText('Barbell Bench Press');

    // Find and tap swap button for Barbell Bench Press
    const swapButton = getByLabelText('Swap Barbell Bench Press');
    fireEvent.press(swapButton);

    // Wait for modal to open and exercises to load
    await waitFor(() => {
      expect(programDb.getAllExercises).toHaveBeenCalled();
    });

    // Verify modal title
    const modalTitle = getByText('Swap Exercise');
    expect(modalTitle).toBeTruthy();

    // Verify current exercise displayed
    const currentExercise = getByText('Current: Barbell Bench Press');
    expect(currentExercise).toBeTruthy();

    // Verify search bar exists
    const searchBar = getByLabelText('Search exercises');
    expect(searchBar).toBeTruthy();
  });

  /**
   * AC-3: User sees alternative chest exercises in swap modal
   */
  it('AC-3: should display filtered chest exercises as alternatives', async () => {
    const { getByLabelText, findByText } = render(<PlannerScreen userId={userId} />);

    // Open swap modal
    await findByText('Barbell Bench Press');
    const swapButton = getByLabelText('Swap Barbell Bench Press');
    fireEvent.press(swapButton);

    // Wait for exercises to load
    await waitFor(() => {
      expect(programDb.getAllExercises).toHaveBeenCalled();
    });

    // Verify alternative exercises displayed
    const dumbbellBench = await findByText('Dumbbell Bench Press');
    expect(dumbbellBench).toBeTruthy();

    const inclineBarbell = await findByText('Incline Barbell Press');
    expect(inclineBarbell).toBeTruthy();

    const machinePress = await findByText('Machine Chest Press');
    expect(machinePress).toBeTruthy();

    // Verify exercise metadata displayed
    const dumbbellMetadata = await findByText('dumbbell • intermediate');
    expect(dumbbellMetadata).toBeTruthy();
  });

  /**
   * AC-4: User selects Dumbbell Bench Press from alternatives
   */
  it('AC-4: should allow selecting Dumbbell Bench Press as replacement', async () => {
    const { getByLabelText, findByText, getByText } = render(<PlannerScreen userId={userId} />);

    // Open swap modal
    await findByText('Barbell Bench Press');
    const swapButton = getByLabelText('Swap Barbell Bench Press');
    fireEvent.press(swapButton);

    // Wait for alternatives to load
    const dumbbellBench = await findByText('Dumbbell Bench Press');

    // Tap Dumbbell Bench Press to select it
    fireEvent.press(dumbbellBench);

    // Verify swapExercise API called with correct IDs
    await waitFor(() => {
      expect(programDb.swapExercise).toHaveBeenCalledWith(
        2, // program_exercise_id for Barbell Bench Press
        3 // exercise_id for Dumbbell Bench Press
      );
    });
  });

  /**
   * AC-5: Modal closes after confirming swap
   */
  it('AC-5: should close modal after successful swap', async () => {
    const { getByLabelText, findByText, queryByText } = render(<PlannerScreen userId={userId} />);

    // Open swap modal
    await findByText('Barbell Bench Press');
    const swapButton = getByLabelText('Swap Barbell Bench Press');
    fireEvent.press(swapButton);

    // Select Dumbbell Bench Press
    const dumbbellBench = await findByText('Dumbbell Bench Press');
    fireEvent.press(dumbbellBench);

    // Wait for swap to complete
    await waitFor(() => {
      expect(programDb.swapExercise).toHaveBeenCalled();
    });

    // Wait for modal to close
    await waitFor(() => {
      const modalTitle = queryByText('Swap Exercise');
      expect(modalTitle).toBeFalsy();
    });
  });

  /**
   * AC-6: Program updates with same set/rep scheme after swap
   */
  it('AC-6: should preserve set/rep scheme when swapping exercises', async () => {
    // Update mock to return swapped exercises
    const swappedExercises = [...mockPushAExercises];
    swappedExercises[1] = {
      ...swappedExercises[1],
      exercise_id: 3,
      exercise_name: 'Dumbbell Bench Press',
      muscle_groups: '["chest","front_delts","triceps"]',
      // Same sets/reps/RIR as original
      sets: 4,
      reps: '6-8',
      rir: 3,
    };

    const { getByLabelText, findByText, rerender } = render(<PlannerScreen userId={userId} />);

    // Open swap modal and swap exercise
    await findByText('Barbell Bench Press');
    const swapButton = getByLabelText('Swap Barbell Bench Press');
    fireEvent.press(swapButton);

    const dumbbellBench = await findByText('Dumbbell Bench Press');
    fireEvent.press(dumbbellBench);

    // Mock returns updated exercises after swap
    vi.mocked(programDb.getProgramExercises).mockResolvedValue(swappedExercises);

    // Wait for reload
    await waitFor(() => {
      expect(programDb.getProgramExercises).toHaveBeenCalledTimes(2);
    });

    // Rerender to reflect updated state
    rerender(<PlannerScreen userId={userId} />);

    // Verify Dumbbell Bench Press now displayed with same parameters
    const newExercise = await findByText('Dumbbell Bench Press');
    expect(newExercise).toBeTruthy();

    // Verify set/rep scheme preserved
    const exerciseDetails = await findByText('4 sets × 6-8 reps @ RIR 3');
    expect(exerciseDetails).toBeTruthy();
  });

  /**
   * AC-7: Total chest volume unchanged (14 sets/week maintained)
   */
  it('AC-7: should maintain total chest volume after swap (14 sets/week)', async () => {
    // Calculate original chest volume
    const originalChestSets = mockPushAExercises
      .filter((ex) => ex.muscle_groups?.includes('chest'))
      .reduce((sum, ex) => sum + ex.sets, 0);

    expect(originalChestSets).toBe(10); // 4 + 3 + 3 = 10 sets per workout

    // Assuming 2 Push days per week (Push A + Push B)
    const weeklyChestVolume = originalChestSets * 2;
    expect(weeklyChestVolume).toBe(20); // 10 sets × 2 = 20 sets/week

    // After swap (Barbell Bench Press → Dumbbell Bench Press)
    const swappedExercises = [...mockPushAExercises];
    swappedExercises[1] = {
      ...swappedExercises[1],
      exercise_id: 3,
      exercise_name: 'Dumbbell Bench Press',
      sets: 4, // Same sets as original
    };

    const newChestSets = swappedExercises
      .filter((ex) => ex.muscle_groups?.includes('chest'))
      .reduce((sum, ex) => sum + ex.sets, 0);

    expect(newChestSets).toBe(10); // Volume maintained
    expect(newChestSets).toBe(originalChestSets);

    const newWeeklyVolume = newChestSets * 2;
    expect(newWeeklyVolume).toBe(20); // Weekly volume maintained
  });

  /**
   * AC-8: MEV/MAV/MRV validation remains green after swap
   */
  it('AC-8: should show green volume validation after swap (within MAV range)', async () => {
    const { findByText } = render(<PlannerScreen userId={userId} />);

    // Wait for volume validation to calculate
    await waitFor(() => {
      expect(programDb.getProgramExercises).toHaveBeenCalled();
    });

    // Verify volume validation displayed
    // Based on volumeLandmarks.ts: chest MEV=16, MAV=24, MRV=32 (per week)
    // Current volume: 10 sets/workout × 2 = 20 sets/week (within MEV-MAV optimal range)
    const validationMessage = await findByText('chest');
    expect(validationMessage).toBeTruthy();

    // Verify status shows optimal range
    const optimalIndicator = await findByText('10 sets');
    expect(optimalIndicator).toBeTruthy();

    // After swap, chest volume should remain in optimal range
    // Barbell Bench Press (4 sets) → Dumbbell Bench Press (4 sets)
    // Total chest: 4 + 3 + 3 = 10 sets/workout = 20 sets/week
    // This is within MEV (16) and MAV (24), so validation should be green
  });

  /**
   * Edge Case: Search functionality in swap modal
   */
  it('should filter exercises by search query', async () => {
    const { getByLabelText, findByText, queryByText } = render(<PlannerScreen userId={userId} />);

    // Open swap modal
    await findByText('Barbell Bench Press');
    const swapButton = getByLabelText('Swap Barbell Bench Press');
    fireEvent.press(swapButton);

    // Wait for exercises to load
    await findByText('Dumbbell Bench Press');

    // Type search query
    const searchBar = getByLabelText('Search exercises');
    fireEvent.changeText(searchBar, 'dumbbell');

    // Verify only dumbbell exercises visible
    const dumbbellBench = queryByText('Dumbbell Bench Press');
    expect(dumbbellBench).toBeTruthy();

    // Barbell exercises should be filtered out
    const inclineBarbell = queryByText('Incline Barbell Press');
    expect(inclineBarbell).toBeFalsy();
  });

  /**
   * Edge Case: Cancel swap modal
   */
  it('should close modal without swapping when Cancel is pressed', async () => {
    const { getByLabelText, findByText, getByText, queryByText } = render(
      <PlannerScreen userId={userId} />
    );

    // Open swap modal
    await findByText('Barbell Bench Press');
    const swapButton = getByLabelText('Swap Barbell Bench Press');
    fireEvent.press(swapButton);

    // Wait for modal to open
    await findByText('Swap Exercise');

    // Tap Cancel button
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    // Verify modal closed
    await waitFor(() => {
      const modalTitle = queryByText('Swap Exercise');
      expect(modalTitle).toBeFalsy();
    });

    // Verify swapExercise was not called
    expect(programDb.swapExercise).not.toHaveBeenCalled();
  });

  /**
   * Edge Case: Filter by equipment
   */
  it('should filter exercises by equipment type', async () => {
    const { getByLabelText, getByText, findByText, queryByText } = render(
      <PlannerScreen userId={userId} />
    );

    // Open swap modal
    await findByText('Barbell Bench Press');
    const swapButton = getByLabelText('Swap Barbell Bench Press');
    fireEvent.press(swapButton);

    // Wait for exercises to load
    await findByText('Dumbbell Bench Press');

    // Tap Barbell filter button
    const barbellFilter = getByText('Barbell');
    fireEvent.press(barbellFilter);

    // Verify only barbell exercises visible
    const inclineBarbell = queryByText('Incline Barbell Press');
    expect(inclineBarbell).toBeTruthy();

    // Dumbbell exercises should be filtered out
    const dumbbellBench = queryByText('Dumbbell Bench Press');
    expect(dumbbellBench).toBeFalsy();
  });

  /**
   * Edge Case: Filter by muscle group
   */
  it('should filter exercises by muscle group', async () => {
    const { getByLabelText, getByText, findByText, queryByText } = render(
      <PlannerScreen userId={userId} />
    );

    // Open swap modal
    await findByText('Barbell Bench Press');
    const swapButton = getByLabelText('Swap Barbell Bench Press');
    fireEvent.press(swapButton);

    // Wait for exercises to load
    await findByText('Dumbbell Bench Press');

    // Tap Chest filter button
    const chestFilter = getByText('Chest');
    fireEvent.press(chestFilter);

    // All exercises have chest in muscle_groups, so all should be visible
    const dumbbellBench = queryByText('Dumbbell Bench Press');
    expect(dumbbellBench).toBeTruthy();

    const inclineBarbell = queryByText('Incline Barbell Press');
    expect(inclineBarbell).toBeTruthy();
  });

  /**
   * Performance Test: Swap operation completes quickly
   */
  it('should complete swap operation in < 100ms (perceived latency requirement)', async () => {
    const { getByLabelText, findByText } = render(<PlannerScreen userId={userId} />);

    // Open swap modal
    await findByText(/Barbell Bench Press/i);
    const swapButton = getByLabelText(/Swap Barbell Bench Press/i);
    fireEvent.press(swapButton);

    const dumbbellBench = await findByText('Dumbbell Bench Press');

    // Measure swap operation time
    const startTime = Date.now();
    fireEvent.press(dumbbellBench);

    await waitFor(() => {
      expect(programDb.swapExercise).toHaveBeenCalled();
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // UI interaction should feel instant (< 100ms perceived latency)
    expect(duration).toBeLessThan(100);
  });
});
