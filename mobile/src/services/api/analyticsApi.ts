import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getAuthenticatedClient } from './authApi';

/**
 * Analytics API Client for FitFlow Pro
 *
 * Provides API calls and React Query hooks for analytics endpoints:
 * - 1RM progression tracking
 * - Volume trends by muscle group
 * - Consistency metrics
 *
 * All endpoints use TanStack Query for automatic caching and background refresh.
 * Cache duration: 5 minutes (analytics data is not real-time critical)
 */

// Cache configuration for analytics queries
const ANALYTICS_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const ANALYTICS_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * 1RM progression data point
 */
export interface OneRMDataPoint {
  date: string; // ISO 8601 date
  estimated_1rm: number; // in kg
}

/**
 * Volume trend data point
 */
export interface VolumeTrendDataPoint {
  week: string; // ISO 8601 week (e.g., "2025-W01")
  total_sets: number;
  mev: number; // Minimum Effective Volume
  mav: number; // Maximum Adaptive Volume
  mrv: number; // Maximum Recoverable Volume
}

/**
 * Consistency metrics
 */
export interface ConsistencyMetrics {
  adherence_rate: number; // 0-1 (percentage of completed workouts)
  avg_session_duration: number; // in minutes
  total_workouts: number;
}

/**
 * Get 1RM progression for a specific exercise over a date range
 *
 * @param exerciseId - Exercise ID
 * @param startDate - Start date (ISO 8601)
 * @param endDate - End date (ISO 8601)
 * @returns Array of {date, estimated_1rm} data points
 * @throws Error if API call fails (401 unauthorized, 400 validation)
 */
export async function get1RMProgression(
  exerciseId: number,
  startDate: string,
  endDate: string
): Promise<OneRMDataPoint[]> {
  const client = await getAuthenticatedClient();

  const response = await client.get<OneRMDataPoint[]>('/api/analytics/1rm-progression', {
    params: {
      exercise_id: exerciseId,
      start_date: startDate,
      end_date: endDate,
    },
  });

  return response.data;
}

/**
 * Get volume trends for a specific muscle group over a date range
 *
 * @param muscleGroup - Muscle group (e.g., "chest", "back", "legs")
 * @param startDate - Start date (ISO 8601)
 * @param endDate - End date (ISO 8601)
 * @returns Array of {week, total_sets, mev, mav, mrv} data points
 * @throws Error if API call fails (401 unauthorized, 400 validation)
 */
export async function getVolumeTrends(
  muscleGroup: string,
  startDate: string,
  endDate: string
): Promise<VolumeTrendDataPoint[]> {
  const client = await getAuthenticatedClient();

  const response = await client.get<VolumeTrendDataPoint[]>('/api/analytics/volume-trends', {
    params: {
      muscle_group: muscleGroup,
      start_date: startDate,
      end_date: endDate,
    },
  });

  return response.data;
}

/**
 * Get consistency metrics for the current user
 *
 * @returns Consistency metrics (adherence_rate, avg_session_duration, total_workouts)
 * @throws Error if API call fails (401 unauthorized)
 */
export async function getConsistencyMetrics(): Promise<ConsistencyMetrics> {
  const client = await getAuthenticatedClient();

  const response = await client.get<ConsistencyMetrics>('/api/analytics/consistency');

  return response.data;
}

/**
 * React Query hook for 1RM progression
 *
 * Automatically caches data for 5 minutes and refreshes in background.
 *
 * @param exerciseId - Exercise ID
 * @param startDate - Start date (ISO 8601)
 * @param endDate - End date (ISO 8601)
 * @returns TanStack Query result with 1RM progression data
 *
 * @example
 * const { data, isLoading, error } = use1RMProgression(1, '2025-01-01', '2025-03-01');
 */
export function use1RMProgression(
  exerciseId: number,
  startDate: string,
  endDate: string
): UseQueryResult<OneRMDataPoint[], Error> {
  return useQuery({
    queryKey: ['analytics', '1rm-progression', exerciseId, startDate, endDate],
    queryFn: () => get1RMProgression(exerciseId, startDate, endDate),
    staleTime: ANALYTICS_STALE_TIME,
    gcTime: ANALYTICS_CACHE_TIME, // TanStack Query v5 uses gcTime instead of cacheTime
    retry: 2, // Retry failed requests up to 2 times
  });
}

/**
 * React Query hook for volume trends
 *
 * Automatically caches data for 5 minutes and refreshes in background.
 *
 * @param muscleGroup - Muscle group (e.g., "chest", "back", "legs")
 * @param startDate - Start date (ISO 8601)
 * @param endDate - End date (ISO 8601)
 * @returns TanStack Query result with volume trend data
 *
 * @example
 * const { data, isLoading, error } = useVolumeTrends('chest', '2025-01-01', '2025-03-01');
 */
export function useVolumeTrends(
  muscleGroup: string,
  startDate: string,
  endDate: string
): UseQueryResult<VolumeTrendDataPoint[], Error> {
  return useQuery({
    queryKey: ['analytics', 'volume-trends', muscleGroup, startDate, endDate],
    queryFn: () => getVolumeTrends(muscleGroup, startDate, endDate),
    staleTime: ANALYTICS_STALE_TIME,
    gcTime: ANALYTICS_CACHE_TIME,
    retry: 2,
  });
}

/**
 * React Query hook for consistency metrics
 *
 * Automatically caches data for 5 minutes and refreshes in background.
 *
 * @returns TanStack Query result with consistency metrics
 *
 * @example
 * const { data, isLoading, error } = useConsistencyMetrics();
 */
export function useConsistencyMetrics(): UseQueryResult<ConsistencyMetrics, Error> {
  return useQuery({
    queryKey: ['analytics', 'consistency'],
    queryFn: getConsistencyMetrics,
    staleTime: ANALYTICS_STALE_TIME,
    gcTime: ANALYTICS_CACHE_TIME,
    retry: 2,
  });
}
