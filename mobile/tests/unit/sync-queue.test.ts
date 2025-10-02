/**
 * Unit Test T084: Sync Queue Logic
 *
 * Tests background sync queue with exponential backoff and conflict resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Sync queue item
 */
interface SyncQueueItem {
  id: number;
  type: 'set' | 'workout' | 'recovery';
  localId: number;
  data: any;
  retryCount: number;
  lastAttempt: number;
  synced: boolean;
}

/**
 * Sync queue manager
 */
class SyncQueue {
  private queue: SyncQueueItem[] = [];
  private maxRetries = 5;
  private baseDelay = 1000; // 1 second

  /**
   * Add item to sync queue
   */
  addToQueue(type: 'set' | 'workout' | 'recovery', data: any, localId: number): void {
    const item: SyncQueueItem = {
      id: this.queue.length + 1,
      type,
      localId,
      data,
      retryCount: 0,
      lastAttempt: 0,
      synced: false,
    };

    this.queue.push(item);
  }

  /**
   * Get items ready for sync (based on exponential backoff)
   */
  getReadyItems(currentTime: number): SyncQueueItem[] {
    return this.queue.filter((item) => {
      if (item.synced) return false;
      if (item.retryCount >= this.maxRetries) return false;

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const backoffDelay = this.baseDelay * Math.pow(2, item.retryCount);
      const nextAttemptTime = item.lastAttempt + backoffDelay;

      return currentTime >= nextAttemptTime;
    });
  }

  /**
   * Mark item as synced
   */
  markSynced(itemId: number): void {
    const item = this.queue.find((i) => i.id === itemId);
    if (item) {
      item.synced = true;
    }
  }

  /**
   * Record failed sync attempt
   */
  recordFailure(itemId: number, currentTime: number): void {
    const item = this.queue.find((i) => i.id === itemId);
    if (item) {
      item.retryCount++;
      item.lastAttempt = currentTime;
    }
  }

  /**
   * Get unsynced count
   */
  getUnsyncedCount(): number {
    return this.queue.filter((item) => !item.synced).length;
  }

  /**
   * Get failed items (exceeded max retries)
   */
  getFailedItems(): SyncQueueItem[] {
    return this.queue.filter((item) => !item.synced && item.retryCount >= this.maxRetries);
  }

  /**
   * Clear synced items
   */
  clearSyncedItems(): void {
    this.queue = this.queue.filter((item) => !item.synced);
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get item by ID
   */
  getItem(itemId: number): SyncQueueItem | undefined {
    return this.queue.find((i) => i.id === itemId);
  }
}

/**
 * Conflict resolution strategy
 */
function resolveConflict(
  localTimestamp: number,
  serverTimestamp: number,
  isActiveWorkout: boolean
): 'client' | 'server' {
  // During active workouts, client always wins
  if (isActiveWorkout) {
    return 'client';
  }

  // Otherwise, most recent timestamp wins
  return localTimestamp > serverTimestamp ? 'client' : 'server';
}

describe('Unit Test: Sync Queue Logic (T084)', () => {
  let syncQueue: SyncQueue;

  beforeEach(() => {
    syncQueue = new SyncQueue();
  });

  describe('Queue management', () => {
    it('should add items to queue', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);
      syncQueue.addToQueue('workout', { status: 'completed' }, 1);

      expect(syncQueue.getQueueLength()).toBe(2);
    });

    it('should track unsynced count', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);
      syncQueue.addToQueue('set', { weight: 100, reps: 7 }, 2);

      expect(syncQueue.getUnsyncedCount()).toBe(2);

      syncQueue.markSynced(1);
      expect(syncQueue.getUnsyncedCount()).toBe(1);
    });

    it('should mark items as synced', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);
      const item = syncQueue.getItem(1);

      expect(item?.synced).toBe(false);

      syncQueue.markSynced(1);
      expect(syncQueue.getItem(1)?.synced).toBe(true);
    });

    it('should clear synced items', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);
      syncQueue.addToQueue('set', { weight: 100, reps: 7 }, 2);
      syncQueue.addToQueue('set', { weight: 100, reps: 6 }, 3);

      syncQueue.markSynced(1);
      syncQueue.markSynced(2);

      syncQueue.clearSyncedItems();

      expect(syncQueue.getQueueLength()).toBe(1);
      expect(syncQueue.getItem(3)).toBeDefined();
    });
  });

  describe('Exponential backoff', () => {
    it('should retry immediately on first attempt (0 retries)', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);

      const currentTime = Date.now();
      const readyItems = syncQueue.getReadyItems(currentTime);

      expect(readyItems.length).toBe(1);
      expect(readyItems[0].retryCount).toBe(0);
    });

    it('should wait 1 second after first failure (1 retry)', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);

      const time1 = 1000;
      syncQueue.recordFailure(1, time1);

      // Should not be ready immediately
      expect(syncQueue.getReadyItems(time1).length).toBe(0);

      // Should be ready after 1 second (1000ms * 2^0 = 1000ms)
      const time2 = time1 + 1000;
      expect(syncQueue.getReadyItems(time2).length).toBe(1);
    });

    it('should wait 2 seconds after second failure (2 retries)', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);

      const time1 = 1000;
      syncQueue.recordFailure(1, time1);
      syncQueue.recordFailure(1, time1 + 1000);

      const item = syncQueue.getItem(1);
      expect(item?.retryCount).toBe(2);

      // Should not be ready at 2 seconds
      expect(syncQueue.getReadyItems(time1 + 2000).length).toBe(0);

      // Should be ready after 2 seconds (1000ms * 2^1 = 2000ms)
      expect(syncQueue.getReadyItems(time1 + 1000 + 2000).length).toBe(1);
    });

    it('should follow exponential backoff pattern (1s, 2s, 4s, 8s, 16s)', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);

      const startTime = 0;
      const expectedDelays = [1000, 2000, 4000, 8000, 16000];

      for (let i = 0; i < 5; i++) {
        const attemptTime =
          startTime + (i > 0 ? expectedDelays.slice(0, i).reduce((a, b) => a + b, 0) : 0);
        syncQueue.recordFailure(1, attemptTime);

        const item = syncQueue.getItem(1);
        expect(item?.retryCount).toBe(i + 1);

        if (i < 4) {
          const nextReadyTime = attemptTime + expectedDelays[i];
          expect(syncQueue.getReadyItems(nextReadyTime - 1).length).toBe(0);
          expect(syncQueue.getReadyItems(nextReadyTime).length).toBe(1);
        }
      }
    });

    it('should stop retrying after max retries (5)', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);

      // Record 5 failures
      for (let i = 0; i < 5; i++) {
        syncQueue.recordFailure(1, i * 1000);
      }

      const item = syncQueue.getItem(1);
      expect(item?.retryCount).toBe(5);

      // Should not be ready even with time passed
      expect(syncQueue.getReadyItems(Date.now() + 100000).length).toBe(0);

      // Should be in failed items
      expect(syncQueue.getFailedItems().length).toBe(1);
    });
  });

  describe('Failed items handling', () => {
    it('should track failed items (exceeded max retries)', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);
      syncQueue.addToQueue('set', { weight: 100, reps: 7 }, 2);

      // Fail first item 5 times
      for (let i = 0; i < 5; i++) {
        syncQueue.recordFailure(1, i * 1000);
      }

      // Fail second item 3 times
      for (let i = 0; i < 3; i++) {
        syncQueue.recordFailure(2, i * 1000);
      }

      const failedItems = syncQueue.getFailedItems();
      expect(failedItems.length).toBe(1);
      expect(failedItems[0].localId).toBe(1);
    });

    it('should identify items needing manual intervention', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);

      // Exceed max retries
      for (let i = 0; i < 6; i++) {
        syncQueue.recordFailure(1, i * 1000);
      }

      const failedItems = syncQueue.getFailedItems();
      expect(failedItems.length).toBe(1);

      // These items should be flagged for manual intervention
      const needsIntervention = failedItems.filter((item) => item.retryCount >= 5);
      expect(needsIntervention.length).toBe(1);
    });
  });

  describe('Conflict resolution', () => {
    it('should resolve client wins during active workout', () => {
      const localTimestamp = 1000;
      const serverTimestamp = 2000; // Server is newer
      const isActiveWorkout = true;

      const winner = resolveConflict(localTimestamp, serverTimestamp, isActiveWorkout);
      expect(winner).toBe('client');
    });

    it('should resolve server wins if server is newer (inactive workout)', () => {
      const localTimestamp = 1000;
      const serverTimestamp = 2000; // Server is newer
      const isActiveWorkout = false;

      const winner = resolveConflict(localTimestamp, serverTimestamp, isActiveWorkout);
      expect(winner).toBe('server');
    });

    it('should resolve client wins if client is newer (inactive workout)', () => {
      const localTimestamp = 3000; // Client is newer
      const serverTimestamp = 2000;
      const isActiveWorkout = false;

      const winner = resolveConflict(localTimestamp, serverTimestamp, isActiveWorkout);
      expect(winner).toBe('client');
    });

    it('should resolve client wins if timestamps equal during active workout', () => {
      const timestamp = 2000;
      const isActiveWorkout = true;

      const winner = resolveConflict(timestamp, timestamp, isActiveWorkout);
      expect(winner).toBe('client');
    });

    it('should resolve server wins if timestamps equal (inactive workout)', () => {
      const timestamp = 2000;
      const isActiveWorkout = false;

      const winner = resolveConflict(timestamp, timestamp, isActiveWorkout);
      expect(winner).toBe('server');
    });
  });

  describe('Queue processing scenarios', () => {
    it('should process items in order when ready', () => {
      const currentTime = 1000;

      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);
      syncQueue.addToQueue('set', { weight: 100, reps: 7 }, 2);
      syncQueue.addToQueue('set', { weight: 100, reps: 6 }, 3);

      // All items ready initially
      let readyItems = syncQueue.getReadyItems(currentTime);
      expect(readyItems.length).toBe(3);

      // Simulate processing: first succeeds, second and third fail
      syncQueue.markSynced(1);
      syncQueue.recordFailure(2, currentTime);
      syncQueue.recordFailure(3, currentTime);

      // Immediately after, only item 1 is synced
      readyItems = syncQueue.getReadyItems(currentTime);
      expect(readyItems.length).toBe(0);

      // After 1 second, items 2 and 3 are ready again
      readyItems = syncQueue.getReadyItems(currentTime + 1000);
      expect(readyItems.length).toBe(2);
    });

    it('should handle partial sync success', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);
      syncQueue.addToQueue('set', { weight: 100, reps: 7 }, 2);
      syncQueue.addToQueue('set', { weight: 100, reps: 6 }, 3);

      const currentTime = 1000;

      // Sync first two successfully
      syncQueue.markSynced(1);
      syncQueue.markSynced(2);

      // Third fails
      syncQueue.recordFailure(3, currentTime);

      expect(syncQueue.getUnsyncedCount()).toBe(1);

      // After clearing synced items
      syncQueue.clearSyncedItems();
      expect(syncQueue.getQueueLength()).toBe(1);
      expect(syncQueue.getItem(3)).toBeDefined();
    });

    it('should handle batch sync of 100 items', () => {
      // Add 100 items
      for (let i = 1; i <= 100; i++) {
        syncQueue.addToQueue('set', { weight: 100, reps: 8, set_number: i }, i);
      }

      expect(syncQueue.getQueueLength()).toBe(100);
      expect(syncQueue.getUnsyncedCount()).toBe(100);

      const currentTime = 1000;
      const readyItems = syncQueue.getReadyItems(currentTime);
      expect(readyItems.length).toBe(100);

      // Simulate 90% success rate
      for (let i = 1; i <= 90; i++) {
        syncQueue.markSynced(i);
      }

      // 10 failures
      for (let i = 91; i <= 100; i++) {
        syncQueue.recordFailure(i, currentTime);
      }

      expect(syncQueue.getUnsyncedCount()).toBe(10);

      // After cleanup
      syncQueue.clearSyncedItems();
      expect(syncQueue.getQueueLength()).toBe(10);
    });
  });

  describe('Priority and type handling', () => {
    it('should handle different item types', () => {
      syncQueue.addToQueue('set', { weight: 100 }, 1);
      syncQueue.addToQueue('workout', { status: 'completed' }, 1);
      syncQueue.addToQueue('recovery', { score: 12 }, 1);

      expect(syncQueue.getQueueLength()).toBe(3);

      const items = [syncQueue.getItem(1), syncQueue.getItem(2), syncQueue.getItem(3)];

      expect(items[0]?.type).toBe('set');
      expect(items[1]?.type).toBe('workout');
      expect(items[2]?.type).toBe('recovery');
    });

    it('should maintain local ID reference', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 123);

      const item = syncQueue.getItem(1);
      expect(item?.localId).toBe(123);

      // Used to update local database after successful sync
      // UPDATE sets SET synced = 1 WHERE id = item.localId
    });
  });

  describe('Network recovery scenarios', () => {
    it('should handle offline to online transition', () => {
      // Add items while offline
      for (let i = 1; i <= 10; i++) {
        syncQueue.addToQueue('set', { weight: 100, reps: 8 }, i);
      }

      expect(syncQueue.getUnsyncedCount()).toBe(10);

      // Come back online
      const currentTime = 5000;
      const readyItems = syncQueue.getReadyItems(currentTime);

      expect(readyItems.length).toBe(10);

      // Sync all successfully
      for (let i = 1; i <= 10; i++) {
        syncQueue.markSynced(i);
      }

      expect(syncQueue.getUnsyncedCount()).toBe(0);
    });

    it('should handle intermittent connectivity', () => {
      syncQueue.addToQueue('set', { weight: 100, reps: 8 }, 1);

      let currentTime = 1000;

      // Fail 3 times with backoff
      for (let i = 0; i < 3; i++) {
        syncQueue.recordFailure(1, currentTime);
        const delay = 1000 * Math.pow(2, i);
        currentTime += delay;

        // Wait for next attempt
        expect(syncQueue.getReadyItems(currentTime).length).toBe(1);
      }

      // Finally succeed
      syncQueue.markSynced(1);
      expect(syncQueue.getUnsyncedCount()).toBe(0);

      const item = syncQueue.getItem(1);
      expect(item?.retryCount).toBe(3);
      expect(item?.synced).toBe(true);
    });
  });
});
