/**
 * Tests for useVO2maxSession hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useVO2maxSession } from '../useVO2maxSession';
import * as vo2maxApi from '../../services/api/vo2maxApi';
import * as authApi from '../../services/api/authApi';

// Mock dependencies
vi.mock('../../services/api/vo2maxApi');
vi.mock('../../services/api/authApi');

describe('useVO2maxSession', () => {
  const mockOnNavigateToAnalytics = vi.fn();
  const mockOnNavigateToDashboard = vi.fn();

  const mockCreateSession = vi.fn();
  const mockGetUserId = vi.fn();
  const mockGetAuthenticatedClient = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockGetUserId.mockResolvedValue(1);
    mockGetAuthenticatedClient.mockResolvedValue({
      get: vi.fn().mockResolvedValue({
        data: { id: 1, age: 28, username: 'test@example.com' },
      }),
    });

    mockCreateSession.mockResolvedValue({
      session_id: 1,
      estimated_vo2max: 48.5,
      completion_status: 'completed',
    });

    vi.mocked(authApi.getUserId).mockImplementation(mockGetUserId);
    vi.mocked(authApi.getAuthenticatedClient).mockImplementation(mockGetAuthenticatedClient);
    vi.mocked(vo2maxApi.useCreateVO2maxSession).mockReturnValue({
      mutateAsync: mockCreateSession,
    } as any);
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    expect(result.current.timerStarted).toBe(false);
    expect(result.current.showSummary).toBe(false);
    expect(result.current.sessionData).toBeNull();
    expect(result.current.showCancelDialog).toBe(false);
  });

  it('calculates max heart rate correctly', () => {
    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    expect(result.current.calculateMaxHeartRate(28)).toBe(192); // 220 - 28
    expect(result.current.calculateMaxHeartRate(35)).toBe(185); // 220 - 35
    expect(result.current.calculateMaxHeartRate(50)).toBe(170); // 220 - 50
  });

  it('calculates heart rate zones correctly for Norwegian 4x4', () => {
    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    const zones = result.current.calculateHeartRateZones(28);
    const maxHR = 192; // 220 - 28

    expect(zones.work.min).toBe(Math.round(maxHR * 0.85)); // 163
    expect(zones.work.max).toBe(Math.round(maxHR * 0.95)); // 182
    expect(zones.recovery.min).toBe(Math.round(maxHR * 0.6)); // 115
    expect(zones.recovery.max).toBe(Math.round(maxHR * 0.7)); // 134
  });

  it('loads user age and calculates HR zones on mount', async () => {
    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    expect(result.current.loadingUser).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingUser).toBe(false);
    });

    expect(result.current.userAge).toBe(28);
    expect(result.current.hrZones).toBeDefined();
    expect(result.current.hrZones?.work.min).toBe(163); // 85% of 192
    expect(result.current.hrZones?.work.max).toBe(182); // 95% of 192
  });

  it('defaults to age 30 if user age not set', async () => {
    mockGetAuthenticatedClient.mockResolvedValue({
      get: vi.fn().mockResolvedValue({
        data: { id: 1, username: 'test@example.com' }, // No age
      }),
    });

    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    await waitFor(() => {
      expect(result.current.loadingUser).toBe(false);
    });

    expect(result.current.userAge).toBe(30);
    const maxHR = 190; // 220 - 30
    expect(result.current.hrZones?.work.min).toBe(Math.round(maxHR * 0.85)); // 162
  });

  it('handles workout start', () => {
    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    expect(result.current.timerStarted).toBe(false);

    act(() => {
      result.current.handleStartWorkout();
    });

    expect(result.current.timerStarted).toBe(true);
  });

  it('creates session on completion', async () => {
    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    const completionData = {
      duration_minutes: 28,
      intervals_completed: 4,
      average_heart_rate: 170,
      peak_heart_rate: 185,
    };

    await act(async () => {
      await result.current.handleComplete(completionData);
    });

    expect(mockCreateSession).toHaveBeenCalledWith({
      date: expect.any(String),
      duration_minutes: 28,
      protocol_type: 'norwegian_4x4',
      intervals_completed: 4,
      average_heart_rate: 170,
      peak_heart_rate: 185,
    });

    expect(result.current.showSummary).toBe(true);
    expect(result.current.sessionData).toEqual({
      ...completionData,
      session_id: 1,
      estimated_vo2max: 48.5,
      completion_status: 'completed',
    });
  });

  it('shows summary even if API fails', async () => {
    mockCreateSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    const completionData = {
      duration_minutes: 28,
      intervals_completed: 4,
    };

    await act(async () => {
      await result.current.handleComplete(completionData);
    });

    expect(result.current.showSummary).toBe(true);
    expect(result.current.sessionData).toEqual(completionData);
  });

  it('handles cancel workflow', () => {
    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    expect(result.current.showCancelDialog).toBe(false);

    act(() => {
      result.current.handleCancel();
    });

    expect(result.current.showCancelDialog).toBe(true);

    act(() => {
      result.current.confirmCancel();
    });

    expect(mockOnNavigateToDashboard).toHaveBeenCalled();
    expect(result.current.showCancelDialog).toBe(false);
  });

  it('handles view details navigation', () => {
    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    act(() => {
      result.current.handleViewDetails(123);
    });

    expect(mockOnNavigateToAnalytics).toHaveBeenCalledWith(123);
    expect(result.current.showSummary).toBe(false);
  });

  it('handles done action', () => {
    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    act(() => {
      result.current.handleDone();
    });

    expect(mockOnNavigateToDashboard).toHaveBeenCalled();
    expect(result.current.showSummary).toBe(false);
  });

  it('handles cancel dialog visibility toggle', () => {
    const { result } = renderHook(() =>
      useVO2maxSession(mockOnNavigateToAnalytics, mockOnNavigateToDashboard)
    );

    expect(result.current.showCancelDialog).toBe(false);

    act(() => {
      result.current.setShowCancelDialog(true);
    });

    expect(result.current.showCancelDialog).toBe(true);

    act(() => {
      result.current.setShowCancelDialog(false);
    });

    expect(result.current.showCancelDialog).toBe(false);
  });
});
