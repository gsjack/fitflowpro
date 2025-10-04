/**
 * AlternativeExerciseSuggestions Component Tests
 *
 * Tests alternative exercise display and swap functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import AlternativeExerciseSuggestions from '../AlternativeExerciseSuggestions';
import * as exerciseApi from '../../../services/api/exerciseApi';
import * as programExerciseApi from '../../../services/api/programExerciseApi';

// Mock APIs
vi.mock('../../../services/api/exerciseApi', () => ({
  getExercises: vi.fn(),
}));

vi.mock('../../../services/api/programExerciseApi', () => ({
  swapExercise: vi.fn(),
}));

const mockAlternatives = [
  {
    id: 2,
    name: 'Dumbbell Bench Press',
    primary_muscle_group: 'chest',
    secondary_muscle_groups: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    movement_pattern: 'compound' as const,
    difficulty: 'beginner',
    default_sets: 4,
    default_reps: '8-12',
    default_rir: 2,
  },
  {
    id: 3,
    name: 'Incline Barbell Bench Press',
    primary_muscle_group: 'chest',
    secondary_muscle_groups: ['shoulders', 'triceps'],
    equipment: 'barbell',
    movement_pattern: 'compound' as const,
    difficulty: 'intermediate',
    default_sets: 4,
    default_reps: '8-12',
    default_rir: 2,
  },
];

describe('AlternativeExerciseSuggestions', () => {
  const mockOnSwapExercise = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exerciseApi.getExercises).mockResolvedValue({
      exercises: mockAlternatives,
      count: mockAlternatives.length,
    });
  });

  const defaultProps = {
    currentExerciseId: 1,
    currentExerciseName: 'Barbell Bench Press',
    currentMuscleGroup: 'chest',
    currentEquipment: 'barbell',
    programExerciseId: 42,
    onSwapExercise: mockOnSwapExercise,
    onCancel: mockOnCancel,
  };

  const renderWithProvider = (props = defaultProps) => {
    return render(
      <PaperProvider>
        <AlternativeExerciseSuggestions {...props} />
      </PaperProvider>
    );
  };

  it('should render alternative exercises', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText('Alternative Exercises')).toBeTruthy();
      expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy();
      expect(screen.getByText('Incline Barbell Bench Press')).toBeTruthy();
    });
  });

  it('should fetch alternatives with same muscle group', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(exerciseApi.getExercises).toHaveBeenCalledWith({
        muscle_group: 'chest',
      });
    });
  });

  it('should show current exercise name in header', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText(/Barbell Bench Press/)).toBeTruthy();
    });
  });

  it('should highlight same equipment exercises', async () => {
    renderWithProvider();

    await waitFor(() => {
      // Incline Barbell Bench Press should have "Same Equipment" chip
      expect(screen.getByText('Same Equipment')).toBeTruthy();
    });
  });

  it('should show equipment difference warning', async () => {
    renderWithProvider();

    await waitFor(() => {
      // Dumbbell variant should show equipment difference
      expect(screen.getByText(/Different equipment:/)).toBeTruthy();
    });
  });

  it('should open confirmation dialog on swap press', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy();
    });

    // Press first "Swap" button
    const swapButtons = screen.getAllByText('Swap');
    fireEvent.press(swapButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Exercise Swap')).toBeTruthy();
    });
  });

  it('should execute swap on confirmation', async () => {
    vi.mocked(programExerciseApi.swapExercise).mockResolvedValue({
      swapped: true,
      old_exercise_name: 'Barbell Bench Press',
      new_exercise_name: 'Dumbbell Bench Press',
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy();
    });

    // Press "Swap" button
    const swapButtons = screen.getAllByText('Swap');
    fireEvent.press(swapButtons[0]);

    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm Exercise Swap')).toBeTruthy();
    });

    const confirmButtons = screen.getAllByText('Swap');
    fireEvent.press(confirmButtons[confirmButtons.length - 1]); // Last "Swap" button in dialog

    await waitFor(() => {
      expect(programExerciseApi.swapExercise).toHaveBeenCalledWith(42, 2);
      expect(mockOnSwapExercise).toHaveBeenCalledWith(2, 'Dumbbell Bench Press');
    });
  });

  it('should display volume warning after swap', async () => {
    vi.mocked(programExerciseApi.swapExercise).mockResolvedValue({
      swapped: true,
      old_exercise_name: 'Barbell Bench Press',
      new_exercise_name: 'Dumbbell Bench Press',
      volume_warning: 'Chest volume now above MRV (24 sets > 22)',
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy();
    });

    // Execute swap
    const swapButtons = screen.getAllByText('Swap');
    fireEvent.press(swapButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Exercise Swap')).toBeTruthy();
    });

    const confirmButtons = screen.getAllByText('Swap');
    fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/Chest volume now above MRV/)).toBeTruthy();
    });
  });

  it('should show error on swap failure', async () => {
    vi.mocked(programExerciseApi.swapExercise).mockRejectedValue(
      new Error('Incompatible exercise')
    );

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy();
    });

    // Execute swap
    const swapButtons = screen.getAllByText('Swap');
    fireEvent.press(swapButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Exercise Swap')).toBeTruthy();
    });

    const confirmButtons = screen.getAllByText('Swap');
    fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/Incompatible exercise/)).toBeTruthy();
    });
  });

  it('should show loading state while fetching', async () => {
    vi.mocked(exerciseApi.getExercises).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderWithProvider();

    expect(screen.getByText('Finding alternative exercises...')).toBeTruthy();
  });

  it('should call onCancel when cancel button is pressed', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText('Alternative Exercises')).toBeTruthy();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
