import { useQuery, useMutation, UseQueryResult } from '@tanstack/react-query';
import { getAuthenticatedClient } from './authApi';

/**
 * VO2max Session API Client for FitFlow Pro
 *
 * Provides API calls and React Query hooks for VO2max cardio session tracking:
 * - Create VO2max sessions (Norwegian 4x4, Zone 2)
 * - List and filter sessions
 * - Get session details
 * - Track VO2max progression over time
 * - Update session data
 *
 * All endpoints use TanStack Query for automatic caching and background refresh.
 * Cache duration: 5 minutes for historical data, shorter for active sessions
 */

// Cache configuration for VO2max queries
const VO2MAX_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const VO2MAX_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * VO2max session data
 */
export interface VO2maxSession {
  id: number;
  user_id: number;
  workout_id?: number;
  date: string; // YYYY-MM-DD
  duration_minutes: number;
  protocol_type: 'norwegian_4x4' | 'zone2';
  average_heart_rate?: number;
  peak_heart_rate?: number;
  estimated_vo2max?: number;
  intervals_completed?: number;
  rpe?: number;
  completion_status: 'completed' | 'incomplete';
  notes?: string;
  created_at: number;
}

/**
 * Create VO2max session request
 */
export interface CreateVO2maxSessionRequest {
  workout_id?: number;
  date: string; // YYYY-MM-DD
  duration_minutes: number;
  protocol_type: 'norwegian_4x4' | 'zone2';
  average_heart_rate?: number;
  peak_heart_rate?: number;
  estimated_vo2max?: number;
  intervals_completed?: number;
  rpe?: number;
  notes?: string;
}

/**
 * Create VO2max session response
 */
export interface CreateVO2maxSessionResponse {
  session_id: number;
  estimated_vo2max: number | null;
  completion_status: 'completed' | 'incomplete';
}

/**
 * List VO2max sessions query parameters
 */
export interface ListVO2maxSessionsParams {
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  protocol_type?: 'norwegian_4x4' | 'zone2';
  limit?: number;
  offset?: number;
}

/**
 * List VO2max sessions response
 */
export interface ListVO2maxSessionsResponse {
  sessions: VO2maxSession[];
  count: number;
  has_more: boolean;
}

/**
 * VO2max progression data point
 */
export interface VO2maxProgressionPoint {
  date: string;
  estimated_vo2max: number;
  protocol_type: 'norwegian_4x4' | 'zone2';
}

/**
 * VO2max progression response
 */
export interface VO2maxProgressionResponse {
  sessions: VO2maxProgressionPoint[];
}

/**
 * Update VO2max session request
 */
export interface UpdateVO2maxSessionRequest {
  duration_minutes?: number;
  average_heart_rate?: number;
  peak_heart_rate?: number;
  rpe?: number;
  notes?: string;
}

/**
 * Create a new VO2max session
 *
 * Auto-calculates estimated VO2max using Cooper formula if not provided.
 * Determines completion status based on protocol type and intervals/duration.
 *
 * @param data - Session data (date, duration, protocol type, heart rate, etc.)
 * @returns Created session ID, estimated VO2max, and completion status
 * @throws Error if API call fails (400 validation, 401 unauthorized)
 */
export async function createVO2maxSession(
  data: CreateVO2maxSessionRequest
): Promise<CreateVO2maxSessionResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.post<CreateVO2maxSessionResponse>('/api/vo2max-sessions', data);

  return response.data;
}

/**
 * Get list of VO2max sessions with filtering and pagination
 *
 * @param params - Query parameters (date range, protocol type, limit, offset)
 * @returns List of sessions with pagination metadata
 * @throws Error if API call fails (401 unauthorized)
 */
export async function getVO2maxSessions(
  params?: ListVO2maxSessionsParams
): Promise<ListVO2maxSessionsResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.get<ListVO2maxSessionsResponse>('/api/vo2max-sessions', {
    params: params || {},
  });

  return response.data;
}

/**
 * Get a single VO2max session by ID
 *
 * Verifies user ownership before returning data.
 *
 * @param id - Session ID
 * @returns Session details
 * @throws Error if API call fails (401 unauthorized, 404 not found)
 */
export async function getVO2maxSessionById(id: number): Promise<VO2maxSession> {
  const client = await getAuthenticatedClient();

  const response = await client.get<VO2maxSession>(`/api/vo2max-sessions/${id}`);

  return response.data;
}

/**
 * Get VO2max progression over time
 *
 * Returns sessions with estimated VO2max ordered by date (oldest first).
 * Useful for tracking cardiovascular fitness improvements.
 *
 * @param startDate - Start date (YYYY-MM-DD, optional)
 * @param endDate - End date (YYYY-MM-DD, optional)
 * @returns Array of progression data points
 * @throws Error if API call fails (401 unauthorized)
 */
export async function getVO2maxProgression(
  startDate?: string,
  endDate?: string
): Promise<VO2maxProgressionResponse> {
  const client = await getAuthenticatedClient();

  const response = await client.get<VO2maxProgressionResponse>('/api/vo2max-sessions/progression', {
    params: {
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    },
  });

  return response.data;
}

/**
 * Update a VO2max session
 *
 * Allows updating duration, heart rate, RPE, and notes.
 * Verifies user ownership before updating.
 *
 * @param id - Session ID
 * @param data - Fields to update
 * @returns Updated session details
 * @throws Error if API call fails (400 validation, 401 unauthorized, 404 not found)
 */
export async function updateVO2maxSession(
  id: number,
  data: UpdateVO2maxSessionRequest
): Promise<VO2maxSession> {
  const client = await getAuthenticatedClient();

  const response = await client.patch<VO2maxSession>(`/api/vo2max-sessions/${id}`, data);

  return response.data;
}

/**
 * React Query hook for listing VO2max sessions
 *
 * Automatically caches data for 5 minutes and refreshes in background.
 *
 * @param params - Query parameters (date range, protocol type, pagination)
 * @returns TanStack Query result with sessions list
 *
 * @example
 * const { data, isLoading, error } = useVO2maxSessions({
 *   start_date: '2025-01-01',
 *   end_date: '2025-03-31',
 *   protocol_type: 'norwegian_4x4',
 *   limit: 20
 * });
 */
export function useVO2maxSessions(
  params?: ListVO2maxSessionsParams
): UseQueryResult<ListVO2maxSessionsResponse, Error> {
  return useQuery({
    queryKey: ['vo2max', 'sessions', params],
    queryFn: () => getVO2maxSessions(params),
    staleTime: VO2MAX_STALE_TIME,
    gcTime: VO2MAX_CACHE_TIME,
    retry: 2,
  });
}

/**
 * React Query hook for getting a single VO2max session
 *
 * Automatically caches data for 5 minutes and refreshes in background.
 *
 * @param id - Session ID
 * @returns TanStack Query result with session details
 *
 * @example
 * const { data, isLoading, error } = useVO2maxSession(123);
 */
export function useVO2maxSession(id: number): UseQueryResult<VO2maxSession, Error> {
  return useQuery({
    queryKey: ['vo2max', 'session', id],
    queryFn: () => getVO2maxSessionById(id),
    staleTime: VO2MAX_STALE_TIME,
    gcTime: VO2MAX_CACHE_TIME,
    retry: 2,
  });
}

/**
 * React Query hook for VO2max progression
 *
 * Automatically caches data for 5 minutes and refreshes in background.
 *
 * @param startDate - Start date (YYYY-MM-DD, optional)
 * @param endDate - End date (YYYY-MM-DD, optional)
 * @returns TanStack Query result with progression data
 *
 * @example
 * const { data, isLoading, error } = useVO2maxProgression('2025-01-01', '2025-03-31');
 */
export function useVO2maxProgression(
  startDate?: string,
  endDate?: string
): UseQueryResult<VO2maxProgressionResponse, Error> {
  return useQuery({
    queryKey: ['vo2max', 'progression', startDate, endDate],
    queryFn: () => getVO2maxProgression(startDate, endDate),
    staleTime: VO2MAX_STALE_TIME,
    gcTime: VO2MAX_CACHE_TIME,
    retry: 2,
  });
}

/**
 * React Query mutation hook for creating VO2max sessions
 *
 * @returns TanStack Query mutation with create function
 *
 * @example
 * const createMutation = useCreateVO2maxSession();
 * await createMutation.mutateAsync({
 *   date: '2025-10-04',
 *   duration_minutes: 40,
 *   protocol_type: 'norwegian_4x4',
 *   intervals_completed: 4,
 *   average_heart_rate: 165,
 *   peak_heart_rate: 185,
 *   rpe: 8
 * });
 */
export function useCreateVO2maxSession() {
  return useMutation({
    mutationFn: createVO2maxSession,
  });
}

/**
 * React Query mutation hook for updating VO2max sessions
 *
 * @returns TanStack Query mutation with update function
 *
 * @example
 * const updateMutation = useUpdateVO2maxSession();
 * await updateMutation.mutateAsync({
 *   id: 123,
 *   data: { rpe: 9, notes: 'Felt stronger today' }
 * });
 */
export function useUpdateVO2maxSession() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVO2maxSessionRequest }) =>
      updateVO2maxSession(id, data),
  });
}
