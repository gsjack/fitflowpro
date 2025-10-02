/**
 * Sync Queue Service (T039)
 *
 * Manages background synchronization with exponential backoff.
 * Persists queue in AsyncStorage for reliability across app restarts.
 *
 * Retry strategy:
 * - Exponential backoff: 1s, 2s, 4s, 8s, 16s
 * - Max retries: 5
 * - Failed items moved to dead letter queue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthenticatedClient } from '../api/authApi';

const SYNC_QUEUE_KEY = '@fitflow/sync_queue';
const FAILED_QUEUE_KEY = '@fitflow/failed_queue';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000; // 1 second

// Sync queue item structure
export interface SyncQueueItem {
  id: string; // Unique ID for this queue item
  type: 'workout' | 'set' | 'recovery_assessment'; // Entity type
  data: Record<string, any>; // Data to sync
  localId?: number; // Local database ID for deduplication
  retries: number; // Retry count
  createdAt: number; // Timestamp when item was added
  nextRetryAt?: number; // Timestamp for next retry attempt
}

// In-memory queue (loaded from AsyncStorage on init)
let syncQueue: SyncQueueItem[] = [];
let isProcessing = false;
let processingTimeout: NodeJS.Timeout | null = null;

/**
 * Initialize the sync queue from AsyncStorage
 */
export async function initSyncQueue(): Promise<void> {
  try {
    const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (queueData) {
      syncQueue = JSON.parse(queueData);
      console.log(`[SyncQueue] Loaded ${syncQueue.length} items from storage`);

      // Start processing if there are items
      if (syncQueue.length > 0) {
        processQueue();
      }
    }
  } catch (error) {
    console.error('[SyncQueue] Failed to load queue from storage:', error);
  }
}

/**
 * Add an item to the sync queue
 * @param type Entity type
 * @param data Data to sync
 * @param localId Optional local database ID
 */
export function addToSyncQueue(
  type: 'workout' | 'set' | 'recovery_assessment',
  data: Record<string, any>,
  localId?: number
): void {
  const item: SyncQueueItem = {
    id: generateQueueItemId(),
    type,
    data,
    localId,
    retries: 0,
    createdAt: Date.now(),
  };

  syncQueue.push(item);
  console.log(`[SyncQueue] Added ${type} to queue:`, item.id);

  // Persist to storage
  persistQueue();

  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Process the sync queue with exponential backoff
 */
async function processQueue(): Promise<void> {
  if (isProcessing) {
    return;
  }

  if (syncQueue.length === 0) {
    console.log('[SyncQueue] Queue is empty');
    return;
  }

  isProcessing = true;

  while (syncQueue.length > 0) {
    const item = syncQueue[0];

    // Check if we should retry this item yet
    if (item.nextRetryAt && Date.now() < item.nextRetryAt) {
      // Schedule processing for later
      const delayMs = item.nextRetryAt - Date.now();
      console.log(`[SyncQueue] Waiting ${delayMs}ms before retrying item:`, item.id);

      processingTimeout = setTimeout(() => {
        isProcessing = false;
        processQueue();
      }, delayMs);

      break;
    }

    try {
      // Process the item
      console.log(`[SyncQueue] Processing ${item.type}:`, item.id);

      // Sync with backend API
      await syncItem(item);

      // Remove from queue on success
      syncQueue.shift();
      await persistQueue();

      console.log(`[SyncQueue] Successfully synced ${item.type}:`, item.id);
    } catch (error) {
      console.error(`[SyncQueue] Failed to sync ${item.type}:`, error);

      // Increment retry count
      item.retries += 1;

      if (item.retries >= MAX_RETRIES) {
        // Move to failed queue
        console.error(`[SyncQueue] Max retries exceeded for item:`, item.id);
        await moveToFailedQueue(item);
        syncQueue.shift();
      } else {
        // Calculate exponential backoff delay
        const delayMs = BASE_DELAY_MS * Math.pow(2, item.retries - 1);
        item.nextRetryAt = Date.now() + delayMs;

        console.log(`[SyncQueue] Scheduling retry ${item.retries}/${MAX_RETRIES} in ${delayMs}ms`);

        // Move to end of queue to process other items first
        syncQueue.shift();
        syncQueue.push(item);
      }

      await persistQueue();
    }
  }

  isProcessing = false;
  console.log('[SyncQueue] Queue processing complete');
}

/**
 * Persist the sync queue to AsyncStorage
 */
async function persistQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  } catch (error) {
    console.error('[SyncQueue] Failed to persist queue:', error);
  }
}

/**
 * Move a failed item to the dead letter queue
 * @param item Queue item that exceeded max retries
 */
async function moveToFailedQueue(item: SyncQueueItem): Promise<void> {
  try {
    const failedQueueData = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
    const failedQueue: SyncQueueItem[] = failedQueueData ? JSON.parse(failedQueueData) : [];

    failedQueue.push(item);

    await AsyncStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(failedQueue));
    console.log('[SyncQueue] Moved item to failed queue:', item.id);
  } catch (error) {
    console.error('[SyncQueue] Failed to move item to failed queue:', error);
  }
}

/**
 * Sync a single item to the backend API
 * @param item Queue item to sync
 */
async function syncItem(item: SyncQueueItem): Promise<void> {
  const client = await getAuthenticatedClient();

  switch (item.type) {
    case 'workout':
      await client.post('/api/workouts', item.data);
      break;

    case 'set':
      await client.post('/api/sets', item.data);
      break;

    case 'recovery_assessment':
      await client.post('/api/recovery-assessments', item.data);
      break;

    default:
      throw new Error(`Unknown sync item type: ${item.type}`);
  }
}

/**
 * Generate a unique ID for a queue item
 * @returns Unique ID string
 */
function generateQueueItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Export functions for external use
 */
export { processQueue };
export { addToSyncQueue as addToQueue };

/**
 * Get the current sync queue
 * @returns Array of queue items
 */
export function getSyncQueue(): SyncQueueItem[] {
  return [...syncQueue];
}

/**
 * Get the failed queue
 * @returns Promise resolving to array of failed items
 */
export async function getFailedQueue(): Promise<SyncQueueItem[]> {
  try {
    const failedQueueData = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
    return failedQueueData ? JSON.parse(failedQueueData) : [];
  } catch (error) {
    console.error('[SyncQueue] Failed to load failed queue:', error);
    return [];
  }
}

/**
 * Clear the sync queue (use with caution)
 */
export async function clearSyncQueue(): Promise<void> {
  syncQueue = [];
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  console.log('[SyncQueue] Queue cleared');
}

/**
 * Clear the failed queue
 */
export async function clearFailedQueue(): Promise<void> {
  await AsyncStorage.removeItem(FAILED_QUEUE_KEY);
  console.log('[SyncQueue] Failed queue cleared');
}

/**
 * Retry all items in the failed queue
 */
export async function retryFailedItems(): Promise<void> {
  const failedQueue = await getFailedQueue();

  if (failedQueue.length === 0) {
    console.log('[SyncQueue] No failed items to retry');
    return;
  }

  console.log(`[SyncQueue] Retrying ${failedQueue.length} failed items`);

  // Reset retry counts and add back to main queue
  failedQueue.forEach((item) => {
    item.retries = 0;
    item.nextRetryAt = undefined;
    syncQueue.push(item);
  });

  // Clear failed queue
  await clearFailedQueue();

  // Persist updated queue
  await persistQueue();

  // Start processing
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Stop queue processing (for cleanup)
 */
export function stopQueueProcessing(): void {
  if (processingTimeout) {
    clearTimeout(processingTimeout);
    processingTimeout = null;
  }
  isProcessing = false;
}

// Initialize queue on module load
initSyncQueue();
