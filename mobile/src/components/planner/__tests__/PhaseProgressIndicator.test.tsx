/**
 * PhaseProgressIndicator Component Tests
 *
 * Tests mesocycle phase progression and volume adjustment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import PhaseProgressIndicator from '../PhaseProgressIndicator';
import * as programApi from '../../../services/api/programApi';

// Mock programApi
vi.mock('../../../services/api/programApi', () => ({
  advancePhase: vi.fn(),
}));

describe('PhaseProgressIndicator', () => {
  const mockOnAdvancePhase = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (props: any) => {
    return render(
      <PaperProvider>
        <PhaseProgressIndicator {...props} />
      </PaperProvider>
    );
  };

  describe('Phase Display', () => {
    it('should display MEV phase correctly', () => {
      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 1,
        programId: 1,
      });

      expect(screen.getByText('Minimum Effective Volume')).toBeTruthy();
      expect(screen.getByText('Week 1 of Mesocycle')).toBeTruthy();
      expect(screen.getByText('MEV')).toBeTruthy();
    });

    it('should display MAV phase correctly', () => {
      renderWithProvider({
        currentPhase: 'mav',
        currentWeek: 3,
        programId: 1,
      });

      expect(screen.getByText('Maximum Adaptive Volume')).toBeTruthy();
      expect(screen.getByText('Week 3 of Mesocycle')).toBeTruthy();
      expect(screen.getByText('MAV')).toBeTruthy();
    });

    it('should display MRV phase correctly', () => {
      renderWithProvider({
        currentPhase: 'mrv',
        currentWeek: 6,
        programId: 1,
      });

      expect(screen.getByText('Maximum Recoverable Volume')).toBeTruthy();
      expect(screen.getByText('Week 6 of Mesocycle')).toBeTruthy();
      expect(screen.getByText('MRV')).toBeTruthy();
    });

    it('should display Deload phase correctly', () => {
      renderWithProvider({
        currentPhase: 'deload',
        currentWeek: 8,
        programId: 1,
      });

      expect(screen.getByText('Recovery Week')).toBeTruthy();
      expect(screen.getByText('Week 8 of Mesocycle')).toBeTruthy();
      expect(screen.getByText('Deload')).toBeTruthy();
    });
  });

  describe('Timeline Display', () => {
    it('should show all four phases in timeline', () => {
      renderWithProvider({
        currentPhase: 'mav',
        currentWeek: 3,
        programId: 1,
      });

      // All phase labels should be visible
      expect(screen.getAllByText('MEV').length).toBeGreaterThan(0);
      expect(screen.getAllByText('MAV').length).toBeGreaterThan(0);
      expect(screen.getAllByText('MRV').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Deload').length).toBeGreaterThan(0);
    });

    it('should show week ranges for each phase', () => {
      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 1,
        programId: 1,
      });

      expect(screen.getByText('W1-2')).toBeTruthy(); // MEV
      expect(screen.getByText('W3-5')).toBeTruthy(); // MAV
      expect(screen.getByText('W6-7')).toBeTruthy(); // MRV
      expect(screen.getByText('W8')).toBeTruthy(); // Deload
    });
  });

  describe('Progress Bar', () => {
    it('should show 50% progress at week 1 of MEV (week 1 of 2)', () => {
      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 1,
        programId: 1,
      });

      expect(screen.getByText('50%')).toBeTruthy();
      expect(screen.getByText('Week 1 of 2')).toBeTruthy();
    });

    it('should show 100% progress at week 2 of MEV (week 2 of 2)', () => {
      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 2,
        programId: 1,
      });

      expect(screen.getByText('100%')).toBeTruthy();
      expect(screen.getByText('Week 2 of 2')).toBeTruthy();
    });

    it('should show 33% progress at week 3 of MAV (week 1 of 3)', () => {
      renderWithProvider({
        currentPhase: 'mav',
        currentWeek: 3,
        programId: 1,
      });

      expect(screen.getByText('33%')).toBeTruthy();
      expect(screen.getByText('Week 1 of 3')).toBeTruthy();
    });

    it('should show 100% progress at week 5 of MAV (week 3 of 3)', () => {
      renderWithProvider({
        currentPhase: 'mav',
        currentWeek: 5,
        programId: 1,
      });

      expect(screen.getByText('100%')).toBeTruthy();
      expect(screen.getByText('Week 3 of 3')).toBeTruthy();
    });
  });

  describe('Advance Button', () => {
    it('should enable advance button when at max week of phase', () => {
      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 2, // Max week for MEV
        programId: 1,
      });

      const advanceButton = screen.getByText('Advance to MAV');
      expect(advanceButton).toBeTruthy();
    });

    it('should disable advance button when not at max week', () => {
      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 1, // Not at max week
        programId: 1,
      });

      const buttonText = screen.getByText('Complete Week 2 to Advance');
      expect(buttonText).toBeTruthy();
    });

    it('should show correct next phase in button text', () => {
      renderWithProvider({
        currentPhase: 'mav',
        currentWeek: 5,
        programId: 1,
      });

      expect(screen.getByText('Advance to MRV')).toBeTruthy();
    });

    it('should show volume adjustment hint', () => {
      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 2,
        programId: 1,
      });

      expect(screen.getByText(/\+20% volume/)).toBeTruthy();
    });
  });

  describe('Confirmation Dialog', () => {
    it('should open confirmation dialog on advance press', async () => {
      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 2,
        programId: 1,
      });

      const advanceButton = screen.getByText('Advance to MAV');
      fireEvent.press(advanceButton);

      await waitFor(() => {
        expect(screen.getByText('Advance to MAV Phase?')).toBeTruthy();
      });
    });

    it('should display volume adjustment in dialog', async () => {
      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 2,
        programId: 1,
      });

      const advanceButton = screen.getByText('Advance to MAV');
      fireEvent.press(advanceButton);

      await waitFor(() => {
        expect(screen.getByText(/\+20% volume/)).toBeTruthy();
      });
    });

    it('should execute advance on confirmation', async () => {
      vi.mocked(programApi.advancePhase).mockResolvedValue({
        previous_phase: 'mev',
        new_phase: 'mav',
        volume_multiplier: 1.2,
        exercises_updated: 24,
      });

      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 2,
        programId: 1,
        onAdvancePhase: mockOnAdvancePhase,
      });

      // Open dialog
      const advanceButton = screen.getByText('Advance to MAV');
      fireEvent.press(advanceButton);

      await waitFor(() => {
        expect(screen.getByText('Advance to MAV Phase?')).toBeTruthy();
      });

      // Confirm advance
      const confirmButtons = screen.getAllByText('Advance Phase');
      fireEvent.press(confirmButtons[confirmButtons.length - 1]); // Last button in dialog

      await waitFor(() => {
        expect(programApi.advancePhase).toHaveBeenCalledWith(1);
        expect(mockOnAdvancePhase).toHaveBeenCalledWith('mav', 1.2);
      });
    });

    it('should cancel advance when cancel is pressed', async () => {
      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 2,
        programId: 1,
      });

      // Open dialog
      const advanceButton = screen.getByText('Advance to MAV');
      fireEvent.press(advanceButton);

      await waitFor(() => {
        expect(screen.getByText('Advance to MAV Phase?')).toBeTruthy();
      });

      // Cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Advance to MAV Phase?')).toBeNull();
      });

      expect(programApi.advancePhase).not.toHaveBeenCalled();
    });

    it('should show error on advance failure', async () => {
      vi.mocked(programApi.advancePhase).mockRejectedValue(new Error('API Error'));

      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 2,
        programId: 1,
      });

      // Open dialog and confirm
      const advanceButton = screen.getByText('Advance to MAV');
      fireEvent.press(advanceButton);

      await waitFor(() => {
        expect(screen.getByText('Advance to MAV Phase?')).toBeTruthy();
      });

      const confirmButtons = screen.getAllByText('Advance Phase');
      fireEvent.press(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText(/Failed to advance phase/)).toBeTruthy();
      });
    });
  });

  describe('Phase Transitions', () => {
    it('should transition MEV to MAV with +20% volume', async () => {
      vi.mocked(programApi.advancePhase).mockResolvedValue({
        previous_phase: 'mev',
        new_phase: 'mav',
        volume_multiplier: 1.2,
        exercises_updated: 24,
      });

      renderWithProvider({
        currentPhase: 'mev',
        currentWeek: 2,
        programId: 1,
        onAdvancePhase: mockOnAdvancePhase,
      });

      const advanceButton = screen.getByText('Advance to MAV');
      fireEvent.press(advanceButton);

      await waitFor(() => {
        const confirmButtons = screen.getAllByText('Advance Phase');
        fireEvent.press(confirmButtons[confirmButtons.length - 1]);
      });

      await waitFor(() => {
        expect(mockOnAdvancePhase).toHaveBeenCalledWith('mav', 1.2);
      });
    });

    it('should transition MAV to MRV with +15% volume', async () => {
      vi.mocked(programApi.advancePhase).mockResolvedValue({
        previous_phase: 'mav',
        new_phase: 'mrv',
        volume_multiplier: 1.15,
        exercises_updated: 24,
      });

      renderWithProvider({
        currentPhase: 'mav',
        currentWeek: 5,
        programId: 1,
        onAdvancePhase: mockOnAdvancePhase,
      });

      const advanceButton = screen.getByText('Advance to MRV');
      fireEvent.press(advanceButton);

      await waitFor(() => {
        const confirmButtons = screen.getAllByText('Advance Phase');
        fireEvent.press(confirmButtons[confirmButtons.length - 1]);
      });

      await waitFor(() => {
        expect(mockOnAdvancePhase).toHaveBeenCalledWith('mrv', 1.15);
      });
    });

    it('should transition MRV to Deload with -50% volume', async () => {
      vi.mocked(programApi.advancePhase).mockResolvedValue({
        previous_phase: 'mrv',
        new_phase: 'deload',
        volume_multiplier: 0.5,
        exercises_updated: 24,
      });

      renderWithProvider({
        currentPhase: 'mrv',
        currentWeek: 7,
        programId: 1,
        onAdvancePhase: mockOnAdvancePhase,
      });

      const advanceButton = screen.getByText('Advance to Deload');
      fireEvent.press(advanceButton);

      await waitFor(() => {
        const confirmButtons = screen.getAllByText('Advance Phase');
        fireEvent.press(confirmButtons[confirmButtons.length - 1]);
      });

      await waitFor(() => {
        expect(mockOnAdvancePhase).toHaveBeenCalledWith('deload', 0.5);
      });
    });
  });
});
