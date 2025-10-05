/**
 * VO2max Session Hook
 *
 * Manages VO2max cardio workout session state including:
 * - User age and HR zone calculation
 * - Timer state for Norwegian 4x4 protocol
 * - Session data tracking and API creation
 * - Summary and navigation flow
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useCreateVO2maxSession } from '../services/api/vo2maxApi';
import { getUserId, User, getAuthenticatedClient } from '../services/api/authApi';

export interface HeartRateZone {
  min: number;
  max: number;
}

export interface WorkoutPhaseZones {
  work: HeartRateZone;
  recovery: HeartRateZone;
}

export interface SessionData {
  duration_minutes: number;
  intervals_completed: number;
  average_heart_rate?: number;
  peak_heart_rate?: number;
  session_id?: number;
  estimated_vo2max?: number;
  completion_status?: string;
}

export interface UseVO2maxSessionReturn {
  // User state
  userAge: number | null;
  hrZones: WorkoutPhaseZones | null;
  loadingUser: boolean;

  // Workout state
  timerStarted: boolean;
  showSummary: boolean;
  sessionData: SessionData | null;
  showCancelDialog: boolean;

  // Actions
  handleStartWorkout: () => void;
  handleComplete: (
    data: Omit<SessionData, 'session_id' | 'estimated_vo2max' | 'completion_status'>
  ) => Promise<void>;
  handleCancel: () => void;
  confirmCancel: () => void;
  handleViewDetails: (sessionId?: number) => void;
  handleDone: () => void;
  setShowCancelDialog: (show: boolean) => void;

  // Utilities
  calculateMaxHeartRate: (age: number) => number;
  calculateHeartRateZones: (age: number) => WorkoutPhaseZones;
}

/**
 * Calculate maximum heart rate using age-based formula
 * Formula: 220 - age
 */
function calculateMaxHeartRate(age: number): number {
  return 220 - age;
}

/**
 * Calculate heart rate zones for Norwegian 4x4 protocol
 * Work zone: 85-95% max HR
 * Recovery zone: 60-70% max HR
 */
function calculateHeartRateZones(age: number): WorkoutPhaseZones {
  const maxHR = calculateMaxHeartRate(age);

  return {
    work: {
      min: Math.round(maxHR * 0.85),
      max: Math.round(maxHR * 0.95),
    },
    recovery: {
      min: Math.round(maxHR * 0.6),
      max: Math.round(maxHR * 0.7),
    },
  };
}

/**
 * Hook for managing VO2max workout session state and logic
 *
 * @param onNavigateToAnalytics - Callback for navigation to analytics screen
 * @param onNavigateToDashboard - Callback for navigation to dashboard
 *
 * @example
 * const vo2maxSession = useVO2maxSession(
 *   (sessionId) => router.push({ pathname: '/analytics', params: { sessionId }}),
 *   () => router.replace('/dashboard')
 * );
 */
export function useVO2maxSession(
  onNavigateToAnalytics: (sessionId?: number) => void,
  onNavigateToDashboard: () => void
): UseVO2maxSessionReturn {
  const [timerStarted, setTimerStarted] = useState(false);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [hrZones, setHrZones] = useState<WorkoutPhaseZones | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const createMutation = useCreateVO2maxSession();

  // Fetch user data to get age for HR zone calculation
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoadingUser(true);
        const userId = await getUserId();

        if (!userId) {
          console.error('[useVO2maxSession] No user ID found');
          setLoadingUser(false);
          return;
        }

        const client = await getAuthenticatedClient();
        const response = await client.get<User>('/api/users/me');
        const user = response.data;

        if (user.age) {
          setUserAge(user.age);
          const zones = calculateHeartRateZones(user.age);
          setHrZones(zones);
          console.log('[useVO2maxSession] HR zones calculated:', {
            age: user.age,
            maxHR: calculateMaxHeartRate(user.age),
            zones,
          });
        } else {
          // Default to age 30 if not set
          console.warn('[useVO2maxSession] User age not set, defaulting to 30');
          setUserAge(30);
          const zones = calculateHeartRateZones(30);
          setHrZones(zones);
        }
      } catch (error) {
        console.error('[useVO2maxSession] Error fetching user data:', error);
        // Fallback to age 30
        setUserAge(30);
        const zones = calculateHeartRateZones(30);
        setHrZones(zones);
      } finally {
        setLoadingUser(false);
      }
    };

    void fetchUserData();
  }, []);

  const handleStartWorkout = useCallback(() => {
    setTimerStarted(true);
  }, []);

  const handleComplete = useCallback(
    async (data: Omit<SessionData, 'session_id' | 'estimated_vo2max' | 'completion_status'>) => {
      try {
        console.log('[useVO2maxSession] Timer completed, creating session:', data);

        // Create VO2max session via API
        const session = await createMutation.mutateAsync({
          date: format(new Date(), 'yyyy-MM-dd'),
          duration_minutes: data.duration_minutes,
          protocol_type: 'norwegian_4x4',
          intervals_completed: data.intervals_completed,
          average_heart_rate: data.average_heart_rate,
          peak_heart_rate: data.peak_heart_rate,
        });

        console.log('[useVO2maxSession] Session created:', session);

        // Store session data for summary
        setSessionData({
          ...data,
          session_id: session.session_id,
          estimated_vo2max: session.estimated_vo2max,
          completion_status: session.completion_status,
        });

        // Show summary modal
        setShowSummary(true);
      } catch (error) {
        console.error('[useVO2maxSession] Error creating session:', error);
        // Still show summary even if API fails (user can retry later)
        setSessionData(data);
        setShowSummary(true);
      }
    },
    [createMutation]
  );

  const handleCancel = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(() => {
    setShowCancelDialog(false);
    onNavigateToDashboard();
  }, [onNavigateToDashboard]);

  const handleViewDetails = useCallback(
    (sessionId?: number) => {
      setShowSummary(false);
      if (sessionId || sessionData?.session_id) {
        onNavigateToAnalytics(sessionId || sessionData?.session_id);
      } else {
        onNavigateToDashboard();
      }
    },
    [sessionData, onNavigateToAnalytics, onNavigateToDashboard]
  );

  const handleDone = useCallback(() => {
    setShowSummary(false);
    onNavigateToDashboard();
  }, [onNavigateToDashboard]);

  return {
    // User state
    userAge,
    hrZones,
    loadingUser,

    // Workout state
    timerStarted,
    showSummary,
    sessionData,
    showCancelDialog,

    // Actions
    handleStartWorkout,
    handleComplete,
    handleCancel,
    confirmCancel,
    handleViewDetails,
    handleDone,
    setShowCancelDialog,

    // Utilities
    calculateMaxHeartRate,
    calculateHeartRateZones,
  };
}
