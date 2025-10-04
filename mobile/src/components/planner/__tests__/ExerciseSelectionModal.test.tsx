/**
 * ExerciseSelectionModal Component Tests
 *
 * Tests exercise selection with filtering and search functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import ExerciseSelectionModal from '../ExerciseSelectionModal';
import * as exerciseApi from '../../../services/api/exerciseApi';

// Mock exerciseApi
vi.mock('../../../services/api/exerciseApi', () => ({
  getExercises: vi.fn(),
}));

const mockExercises = [
  {
    id: 1,
    name: 'Barbell Bench Press',
    primary_muscle_group: 'chest',
    secondary_muscle_groups: ['shoulders', 'triceps'],
    equipment: 'barbell',
    movement_pattern: 'compound' as const,
    difficulty: 'intermediate',
    default_sets: 4,
    default_reps: '8-12',
    default_rir: 2,
    description: 'Primary chest exercise',
  },
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
    name: 'Barbell Row',
    primary_muscle_group: 'back',
    secondary_muscle_groups: ['biceps'],
    equipment: 'barbell',
    movement_pattern: 'compound' as const,
    difficulty: 'intermediate',
    default_sets: 4,
    default_reps: '8-12',
    default_rir: 2,
  },
];

describe('ExerciseSelectionModal', () => {
  const mockOnDismiss = vi.fn();
  const mockOnSelectExercise = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exerciseApi.getExercises).mockResolvedValue({
      exercises: mockExercises,
      count: mockExercises.length,
    });
  });

  interface TestProps {
    visible?: boolean;
    onDismiss?: () => void;
    onSelect?: (exerciseId: number) => void;
    currentExerciseId?: number;
    muscleGroup?: string;
  }

  const renderWithProvider = (props: TestProps) => {
    return render(
      <PaperProvider>
        <ExerciseSelectionModal {...props} />
      </PaperProvider>
    );
  };

  it('should render modal when visible', async () => {
    renderWithProvider({
      visible: true,
      onDismiss: mockOnDismiss,
      onSelectExercise: mockOnSelectExercise,
    });

    await waitFor(() => {
      expect(screen.getByText('Select Exercise')).toBeTruthy();
    });
  });

  it('should fetch exercises on open', async () => {
    renderWithProvider({
      visible: true,
      onDismiss: mockOnDismiss,
      onSelectExercise: mockOnSelectExercise,
    });

    await waitFor(() => {
      expect(exerciseApi.getExercises).toHaveBeenCalledWith({});
    });
  });

  it('should display exercises after loading', async () => {
    renderWithProvider({
      visible: true,
      onDismiss: mockOnDismiss,
      onSelectExercise: mockOnSelectExercise,
    });

    await waitFor(() => {
      expect(screen.getByText('Barbell Bench Press')).toBeTruthy();
      expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy();
      expect(screen.getByText('Barbell Row')).toBeTruthy();
    });
  });

  it('should filter exercises by muscle group', async () => {
    renderWithProvider({
      visible: true,
      onDismiss: mockOnDismiss,
      onSelectExercise: mockOnSelectExercise,
      muscleGroupFilter: 'chest',
    });

    await waitFor(() => {
      expect(exerciseApi.getExercises).toHaveBeenCalledWith({
        muscle_group: 'chest',
      });
    });
  });

  it('should exclude specified exercises', async () => {
    renderWithProvider({
      visible: true,
      onDismiss: mockOnDismiss,
      onSelectExercise: mockOnSelectExercise,
      excludeExercises: [1],
    });

    await waitFor(() => {
      expect(screen.queryByText('Barbell Bench Press')).toBeNull();
      expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy();
    });
  });

  it('should call onSelectExercise when exercise is selected', async () => {
    renderWithProvider({
      visible: true,
      onDismiss: mockOnDismiss,
      onSelectExercise: mockOnSelectExercise,
    });

    await waitFor(() => {
      expect(screen.getByText('Barbell Bench Press')).toBeTruthy();
    });

    // Find and press first "Select" button
    const selectButtons = screen.getAllByText('Select');
    fireEvent.press(selectButtons[0]);

    expect(mockOnSelectExercise).toHaveBeenCalledWith(mockExercises[0]);
    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('should show loading state while fetching', async () => {
    vi.mocked(exerciseApi.getExercises).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderWithProvider({
      visible: true,
      onDismiss: mockOnDismiss,
      onSelectExercise: mockOnSelectExercise,
    });

    expect(screen.getByText('Loading exercises...')).toBeTruthy();
  });

  it('should show error state on API failure', async () => {
    vi.mocked(exerciseApi.getExercises).mockRejectedValue(new Error('API Error'));

    renderWithProvider({
      visible: true,
      onDismiss: mockOnDismiss,
      onSelectExercise: mockOnSelectExercise,
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to load exercises/)).toBeTruthy();
    });
  });

  it('should display results count', async () => {
    renderWithProvider({
      visible: true,
      onDismiss: mockOnDismiss,
      onSelectExercise: mockOnSelectExercise,
    });

    await waitFor(() => {
      expect(screen.getByText('3 exercises found')).toBeTruthy();
    });
  });
});
