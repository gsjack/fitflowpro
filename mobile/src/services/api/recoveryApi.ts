import { useQuery, useMutation, UseQueryResult } from '@tanstack/react-query';
import { getAuthenticatedClient } from './authApi';

/**
 * Recovery Assessment API Client for FitFlow Pro
 *
 * Provides API calls and React Query hooks for recovery assessments:
 * - Submit daily 3-question recovery check-in (sleep, soreness, motivation)
 * - Get today's assessment
 * - Auto-regulation volume adjustments based on recovery score
 *
 * All endpoints use TanStack Query for automatic caching and background refresh.
 * Recovery data is cached for shorter duration due to daily nature.
 */

// Cache configuration for recovery queries
const RECOVERY_STALE_TIME = 2 * 60 * 1000; // 2 minutes (fresher than analytics)
const RECOVERY_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Recovery assessment data
 */
export interface RecoveryAssessment {
  id: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  sleep_quality: number; // 1-5 scale
  muscle_soreness: number; // 1-5 scale
  mental_motivation: number; // 1-5 scale
  total_score: number; // 3-15 (sum of 3 subscores)
  volume_adjustment: 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day';
  created_at: number; // Unix timestamp
}

/**
 * Create recovery assessment request
 */
export interface CreateRecoveryAssessmentRequest {
  date: string; // YYYY-MM-DD
  sleep_quality: number; // 1-5
  muscle_soreness: number; // 1-5
  mental_motivation: number; // 1-5
}

/**
 * Create recovery assessment response
 */
export interface CreateRecoveryAssessmentResponse {
  total_score: number; // 3-15
  volume_adjustment: 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day';
}

/**
 * Submit a daily recovery assessment
 *
 * Calculates total score from 3 subscores (sleep, soreness, motivation)
 * and determines volume adjustment based on Renaissance Periodization guidelines:
 * - 12-15: No adjustment (good recovery)
 * - 9-11: Reduce by 1 set per exercise
 * - 6-8: Reduce by 2 sets per exercise
 * - 3-5: Rest day recommended
 *
 * @param data - Assessment data (date, sleep quality, muscle soreness, mental motivation)
 * @returns Total score and volume adjustment recommendation
 * @throws Error if API call fails (400 validation, 401 unauthorized, 409 duplicate)
 */
export async function createRecoveryAssessment(
  data: CreateRecoveryAssessmentRequest
): Promise<CreateRecoveryAssessmentResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.post<CreateRecoveryAssessmentResponse>(
    '/api/recovery-assessments',
    data
  );

  return response.data;
}

/**
 * Get today's recovery assessment for the authenticated user
 *
 * @param userId - User ID (must match authenticated user)
 * @returns Today's recovery assessment
 * @throws Error if API call fails (401 unauthorized, 403 forbidden, 404 not found)
 */
export async function getTodayRecoveryAssessment(userId: number): Promise<RecoveryAssessment> {
  const client = await getAuthenticatedClient();

  const response = await client.get<RecoveryAssessment>(
    `/api/recovery-assessments/${userId}/today`
  );

  return response.data;
}

/**
 * React Query hook for getting today's recovery assessment
 *
 * Automatically caches data for 2 minutes and refreshes in background.
 * Shorter cache time due to daily nature of recovery data.
 *
 * @param userId - User ID (must match authenticated user)
 * @returns TanStack Query result with today's assessment
 *
 * @example
 * const { data, isLoading, error } = useTodayRecoveryAssessment(userId);
 * if (data) {
 *   console.log(`Recovery score: ${data.total_score}`);
 *   console.log(`Adjustment: ${data.volume_adjustment}`);
 * }
 */
export function useTodayRecoveryAssessment(
  userId: number
): UseQueryResult<RecoveryAssessment, Error> {
  return useQuery({
    queryKey: ['recovery', 'today', userId],
    queryFn: () => getTodayRecoveryAssessment(userId),
    staleTime: RECOVERY_STALE_TIME,
    gcTime: RECOVERY_CACHE_TIME,
    retry: 1, // Only retry once (404 is expected if no assessment today)
  });
}

/**
 * React Query mutation hook for creating recovery assessments
 *
 * @returns TanStack Query mutation with create function
 *
 * @example
 * const createMutation = useCreateRecoveryAssessment();
 * await createMutation.mutateAsync({
 *   date: '2025-10-04',
 *   sleep_quality: 4,
 *   muscle_soreness: 3,
 *   mental_motivation: 5
 * });
 * // Response: { total_score: 12, volume_adjustment: 'none' }
 */
export function useCreateRecoveryAssessment() {
  return useMutation({
    mutationFn: createRecoveryAssessment,
  });
}

/**
 * Helper function to interpret volume adjustment
 *
 * Converts volume adjustment code to human-readable description.
 *
 * @param adjustment - Volume adjustment code
 * @returns Human-readable description
 *
 * @example
 * getVolumeAdjustmentDescription('reduce_1_set') // "Reduce by 1 set per exercise"
 * getVolumeAdjustmentDescription('rest_day') // "Rest day recommended"
 */
export function getVolumeAdjustmentDescription(
  adjustment: 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day'
): string {
  switch (adjustment) {
    case 'none':
      return 'No adjustment needed';
    case 'reduce_1_set':
      return 'Reduce by 1 set per exercise';
    case 'reduce_2_sets':
      return 'Reduce by 2 sets per exercise';
    case 'rest_day':
      return 'Rest day recommended';
    default:
      return 'Unknown adjustment';
  }
}

/**
 * Helper function to get recovery score interpretation
 *
 * Provides qualitative assessment of recovery score.
 *
 * @param score - Total recovery score (3-15)
 * @returns Qualitative assessment
 *
 * @example
 * getRecoveryScoreInterpretation(14) // "Excellent recovery"
 * getRecoveryScoreInterpretation(7) // "Poor recovery"
 */
export function getRecoveryScoreInterpretation(score: number): string {
  if (score >= 12) {
    return 'Excellent recovery';
  } else if (score >= 9) {
    return 'Moderate recovery';
  } else if (score >= 6) {
    return 'Poor recovery';
  } else {
    return 'Very poor recovery - rest recommended';
  }
}
