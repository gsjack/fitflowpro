/**
 * Sync Service (T040)
 *
 * Handles synchronization of local data with backend API.
 * Uses localId for deduplication to ensure idempotent operations.
 *
 * Features:
 * - Network listener: Auto-sync on reconnect
 * - Idempotent: Uses localId to prevent duplicate syncs
 * - Error handling: Returns errors to sync queue for retry
 */

import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markAsSynced } from '../../database/db';
import { SyncQueueItem } from './syncQueue';

// API client configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const AUTH_TOKEN_KEY = '@fitflow/auth_token';

// Create axios instance
let apiClient: AxiosInstance | null = null;

/**
 * Initialize the API client with authentication
 */
async function getApiClient(): Promise<AxiosInstance> {
  if (!apiClient) {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    // Add response interceptor for error handling
    apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error('[SyncService] Unauthorized - token may be expired');
          // TODO: Trigger logout or token refresh
        }
        return Promise.reject(error);
      }
    );
  }

  return apiClient;
}

/**
 * Sync a workout to the backend
 * @param data Workout data
 * @returns Promise resolving when sync complete
 */
export async function syncWorkout(data: Record<string, any>): Promise<void> {
  const client = await getApiClient();

  try {
    // Determine if this is a new workout or an update
    if (data.status === 'not_started' || data.status === 'in_progress') {
      // Create or update workout
      const response = await client.post('/api/workouts', {
        program_day_id: data.program_day_id,
        date: data.date,
        status: data.status,
        started_at: data.started_at,
      });

      console.log('[SyncService] Workout synced:', response.data);

      // Mark as synced in local database
      if (data.id) {
        await markAsSynced('workouts', data.id);
      }
    } else {
      // Update workout status (completed or cancelled)
      const response = await client.patch(`/api/workouts/${data.id}`, {
        status: data.status,
        completed_at: data.completed_at,
        total_volume_kg: data.total_volume_kg,
        average_rir: data.average_rir,
      });

      console.log('[SyncService] Workout status updated:', response.data);

      // Mark as synced in local database
      if (data.id) {
        await markAsSynced('workouts', data.id);
      }
    }
  } catch (error) {
    console.error('[SyncService] Failed to sync workout:', error);
    throw error;
  }
}

/**
 * Sync a set to the backend
 * @param data Set data with localId for deduplication
 * @returns Promise resolving when sync complete
 */
export async function syncSet(data: Record<string, any>): Promise<void> {
  const client = await getApiClient();

  try {
    const response = await client.post('/api/sets', {
      workout_id: data.workout_id,
      exercise_id: data.exercise_id,
      set_number: data.set_number,
      weight_kg: data.weight_kg,
      reps: data.reps,
      rir: data.rir,
      timestamp: data.timestamp,
      notes: data.notes,
      localId: data.id, // Send local ID for deduplication
    });

    console.log('[SyncService] Set synced:', response.data);

    // Mark as synced in local database
    if (data.id) {
      await markAsSynced('sets', data.id);
    }
  } catch (error) {
    console.error('[SyncService] Failed to sync set:', error);
    throw error;
  }
}

/**
 * Sync a recovery assessment to the backend
 * @param data Recovery assessment data
 * @returns Promise resolving when sync complete
 */
export async function syncRecoveryAssessment(data: Record<string, any>): Promise<void> {
  const client = await getApiClient();

  try {
    const response = await client.post('/api/recovery-assessments', {
      date: data.date,
      sleep_quality: data.sleep_quality,
      muscle_soreness: data.muscle_soreness,
      mental_motivation: data.mental_motivation,
      localId: data.id, // Send local ID for deduplication
    });

    console.log('[SyncService] Recovery assessment synced:', response.data);

    // Mark as synced in local database
    if (data.id) {
      await markAsSynced('recovery_assessments', data.id);
    }
  } catch (error) {
    console.error('[SyncService] Failed to sync recovery assessment:', error);
    throw error;
  }
}

/**
 * Sync a single queue item
 * @param item Sync queue item
 * @returns Promise resolving when sync complete
 */
export async function syncItem(item: SyncQueueItem): Promise<void> {
  switch (item.type) {
    case 'workout':
      return syncWorkout(item.data);
    case 'set':
      return syncSet(item.data);
    case 'recovery_assessment':
      return syncRecoveryAssessment(item.data);
    default:
      throw new Error(`Unknown sync item type: ${item.type}`);
  }
}

/**
 * Trigger immediate sync of all pending items
 * Called when network reconnects
 */
export async function triggerSync(): Promise<void> {
  console.log('[SyncService] Triggering immediate sync');

  // Import here to avoid circular dependency
  const { getSyncQueue } = await import('./syncQueue');

  const queue = getSyncQueue();

  if (queue.length === 0) {
    console.log('[SyncService] No items to sync');
    return;
  }

  console.log(`[SyncService] Syncing ${queue.length} items`);

  // Process each item
  for (const item of queue) {
    try {
      await syncItem(item);
    } catch (error) {
      console.error('[SyncService] Failed to sync item:', error);
      // Continue to next item - errors will be handled by sync queue retry logic
    }
  }
}

/**
 * Check network connectivity
 * @returns Promise resolving to true if connected
 */
export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const client = await getApiClient();
    await client.get('/api/health');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Setup network listener to trigger sync on reconnect
 * Note: This requires expo-network or similar package
 * For now, just export the function signature
 */
export function setupNetworkListener(): void {
  // TODO: Implement with expo-network
  // NetInfo.addEventListener((state) => {
  //   if (state.isConnected) {
  //     triggerSync();
  //   }
  // });

  console.log('[SyncService] Network listener setup (not implemented)');
}

/**
 * Reset the API client (for logout, token refresh, etc.)
 */
export function resetApiClient(): void {
  apiClient = null;
}
