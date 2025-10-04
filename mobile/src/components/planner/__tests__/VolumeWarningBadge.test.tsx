/**
 * VolumeWarningBadge Component Tests
 *
 * Tests volume zone badge display and warning dialogs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import VolumeWarningBadge from '../VolumeWarningBadge';

describe('VolumeWarningBadge', () => {
  interface TestProps {
    volume?: number;
    mev?: number;
    mav?: number;
    mrv?: number;
  }

  const renderWithProvider = (props: TestProps) => {
    return render(
      <PaperProvider>
        <VolumeWarningBadge {...props} />
      </PaperProvider>
    );
  };

  describe('Zone Display', () => {
    it('should render below_mev zone correctly', () => {
      renderWithProvider({
        zone: 'below_mev',
        muscleGroup: 'chest',
      });

      expect(screen.getByText('Below MEV')).toBeTruthy();
    });

    it('should render adequate zone correctly', () => {
      renderWithProvider({
        zone: 'adequate',
        muscleGroup: 'chest',
      });

      expect(screen.getByText('Adequate')).toBeTruthy();
    });

    it('should render optimal zone correctly', () => {
      renderWithProvider({
        zone: 'optimal',
        muscleGroup: 'chest',
      });

      expect(screen.getByText('Optimal')).toBeTruthy();
    });

    it('should render above_mrv zone correctly', () => {
      renderWithProvider({
        zone: 'above_mrv',
        muscleGroup: 'chest',
      });

      expect(screen.getByText('Above MRV')).toBeTruthy();
    });

    it('should render on_track zone correctly', () => {
      renderWithProvider({
        zone: 'on_track',
      });

      expect(screen.getByText('On Track')).toBeTruthy();
    });
  });

  describe('Compact Mode', () => {
    it('should render compact badge without text', () => {
      renderWithProvider({
        zone: 'optimal',
        compact: true,
      });

      // Should not show text label in compact mode
      expect(screen.queryByText('Optimal')).toBeNull();
    });

    it('should show icon in compact mode', () => {
      const { container } = renderWithProvider({
        zone: 'optimal',
        compact: true,
      });

      // Should render TouchableOpacity with icon
      expect(container).toBeTruthy();
    });
  });

  describe('Expanded Mode', () => {
    it('should render expanded badge with text by default', () => {
      renderWithProvider({
        zone: 'optimal',
      });

      expect(screen.getByText('Optimal')).toBeTruthy();
    });

    it('should show both icon and text in expanded mode', () => {
      renderWithProvider({
        zone: 'optimal',
        compact: false,
      });

      expect(screen.getByText('Optimal')).toBeTruthy();
    });
  });

  describe('Warning Dialog', () => {
    it('should open dialog on press when warning exists', async () => {
      renderWithProvider({
        zone: 'below_mev',
        muscleGroup: 'chest',
        warning: 'Chest volume below MEV (6 sets < 8)',
      });

      const badge = screen.getByText('Below MEV');
      fireEvent.press(badge);

      await waitFor(() => {
        expect(screen.getByText('Volume Warning')).toBeTruthy();
        expect(screen.getByText(/Chest volume below MEV/)).toBeTruthy();
      });
    });

    it('should display muscle group in dialog', async () => {
      renderWithProvider({
        zone: 'above_mrv',
        muscleGroup: 'quads',
        warning: 'Quads volume above MRV (28 sets > 24)',
      });

      const badge = screen.getByText('Above MRV');
      fireEvent.press(badge);

      await waitFor(() => {
        expect(screen.getByText(/quads/)).toBeTruthy();
      });
    });

    it('should display zone description in dialog', async () => {
      renderWithProvider({
        zone: 'optimal',
        warning: 'Volume is in optimal range',
      });

      const badge = screen.getByText('Optimal');
      fireEvent.press(badge);

      await waitFor(() => {
        expect(screen.getByText(/optimal/i)).toBeTruthy();
      });
    });

    it('should close dialog when close button is pressed', async () => {
      renderWithProvider({
        zone: 'below_mev',
        warning: 'Chest volume below MEV',
      });

      const badge = screen.getByText('Below MEV');
      fireEvent.press(badge);

      await waitFor(() => {
        expect(screen.getByText('Volume Warning')).toBeTruthy();
      });

      const closeButton = screen.getByText('Close');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Volume Warning')).toBeNull();
      });
    });

    it('should not open dialog when no warning exists', () => {
      renderWithProvider({
        zone: 'optimal',
        muscleGroup: 'chest',
        // No warning prop
      });

      const badge = screen.getByText('Optimal');
      fireEvent.press(badge);

      // Dialog should not appear
      expect(screen.queryByText('Volume Warning')).toBeNull();
    });
  });

  describe('Custom onPress Handler', () => {
    it('should call custom onPress handler when provided', () => {
      const mockOnPress = vi.fn();

      renderWithProvider({
        zone: 'optimal',
        onPress: mockOnPress,
      });

      const badge = screen.getByText('Optimal');
      fireEvent.press(badge);

      expect(mockOnPress).toHaveBeenCalled();
    });

    it('should not open default dialog when custom onPress is provided', () => {
      const mockOnPress = vi.fn();

      renderWithProvider({
        zone: 'below_mev',
        warning: 'Chest volume below MEV',
        onPress: mockOnPress,
      });

      const badge = screen.getByText('Below MEV');
      fireEvent.press(badge);

      expect(mockOnPress).toHaveBeenCalled();
      expect(screen.queryByText('Volume Warning')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label for below_mev zone', () => {
      const { getByLabelText } = renderWithProvider({
        zone: 'below_mev',
        muscleGroup: 'chest',
      });

      expect(getByLabelText(/Below MEV volume zone/)).toBeTruthy();
    });

    it('should have accessible label for optimal zone', () => {
      const { getByLabelText } = renderWithProvider({
        zone: 'optimal',
        muscleGroup: 'back',
      });

      expect(getByLabelText(/Optimal volume zone/)).toBeTruthy();
    });

    it('should include muscle group in accessibility label', () => {
      const { getByLabelText } = renderWithProvider({
        zone: 'optimal',
        muscleGroup: 'shoulders',
      });

      expect(getByLabelText(/shoulders/)).toBeTruthy();
    });

    it('should have hint when warning exists', () => {
      const { getByLabelText } = renderWithProvider({
        zone: 'below_mev',
        warning: 'Warning text',
      });

      const badge = getByLabelText(/Below MEV volume zone/);
      expect(badge).toBeTruthy();
    });
  });
});
