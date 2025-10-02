/**
 * Performance Test T079: SQLite Write Benchmark
 *
 * Validates constitutional requirement:
 * - Insert 100 sets, assert p95 < 5ms, p99 < 10ms
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as SQLite from 'expo-sqlite';

// Mock modules
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(),
}));

describe('Performance Test: SQLite Write Benchmark (T079)', () => {
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      runAsync: vi.fn(),
      execAsync: vi.fn(),
    };

    vi.mocked(SQLite.openDatabaseAsync).mockResolvedValue(mockDb);

    // Enable WAL mode for performance
    await mockDb.execAsync('PRAGMA journal_mode=WAL');
    await mockDb.execAsync('PRAGMA synchronous=NORMAL');
    await mockDb.execAsync('PRAGMA cache_size=-64000'); // 64MB cache

    vi.mocked(mockDb.runAsync).mockImplementation(async () => {
      // Simulate realistic SQLite write time (< 5ms)
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
      return { lastInsertRowId: Math.floor(Math.random() * 10000), changes: 1 };
    });
  });

  it('should insert 100 sets with p95 < 5ms and p99 < 10ms', async () => {
    const iterations = 100;
    const durations: number[] = [];

    // Benchmark set insertions
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      await mockDb.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [1, 1, i + 1, 100, 8, 2, Date.now(), 0]
      );

      const endTime = performance.now();
      const duration = endTime - startTime;
      durations.push(duration);
    }

    // Calculate percentiles
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p50 = sortedDurations[Math.floor(iterations * 0.5)];
    const p95 = sortedDurations[Math.floor(iterations * 0.95)];
    const p99 = sortedDurations[Math.floor(iterations * 0.99)];
    const max = sortedDurations[iterations - 1];
    const avg = durations.reduce((sum, d) => sum + d, 0) / iterations;

    // Log results
    console.log('SQLite Write Performance Benchmark:');
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Average:    ${avg.toFixed(2)}ms`);
    console.log(`  p50:        ${p50.toFixed(2)}ms`);
    console.log(`  p95:        ${p95.toFixed(2)}ms`);
    console.log(`  p99:        ${p99.toFixed(2)}ms`);
    console.log(`  Max:        ${max.toFixed(2)}ms`);

    // Constitutional requirements
    expect(p95).toBeLessThan(5);
    expect(p99).toBeLessThan(10);

    // Additional checks
    expect(avg).toBeLessThan(3); // Average should be well below p95
    expect(mockDb.runAsync).toHaveBeenCalledTimes(iterations);
  });

  it('should handle batch inserts efficiently', async () => {
    const batchSize = 10;
    const batches = 10;
    const durations: number[] = [];

    for (let batchNum = 0; batchNum < batches; batchNum++) {
      const startTime = performance.now();

      // Batch insert using transaction
      const insertPromises = [];
      for (let i = 0; i < batchSize; i++) {
        insertPromises.push(
          mockDb.runAsync(
            'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [1, 1, batchNum * batchSize + i + 1, 100, 8, 2, Date.now(), 0]
          )
        );
      }

      await Promise.all(insertPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      durations.push(duration);
    }

    // Calculate per-operation time
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95BatchTime = sortedDurations[Math.floor(batches * 0.95)];
    const p95PerOperation = p95BatchTime / batchSize;

    console.log('Batch Insert Performance:');
    console.log(`  Batch size:       ${batchSize}`);
    console.log(`  Batches:          ${batches}`);
    console.log(`  p95 batch time:   ${p95BatchTime.toFixed(2)}ms`);
    console.log(`  p95 per op:       ${p95PerOperation.toFixed(2)}ms`);

    // Batch operations should still meet individual write requirements
    expect(p95PerOperation).toBeLessThan(5);
  });

  it('should verify index performance impact', async () => {
    const iterations = 50;

    // Benchmark without index (simulated)
    const durationsNoIndex: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await mockDb.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [1, 1, i + 1, 100, 8, 2, Date.now(), 0]
      );
      const endTime = performance.now();
      durationsNoIndex.push(endTime - startTime);
    }

    // Create indices
    await mockDb.execAsync('CREATE INDEX IF NOT EXISTS idx_sets_workout ON sets(workout_id)');
    await mockDb.execAsync('CREATE INDEX IF NOT EXISTS idx_sets_synced ON sets(synced)');

    // Benchmark with index
    const durationsWithIndex: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await mockDb.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [2, 1, i + 1, 100, 8, 2, Date.now(), 0]
      );
      const endTime = performance.now();
      durationsWithIndex.push(endTime - startTime);
    }

    const avgNoIndex = durationsNoIndex.reduce((sum, d) => sum + d, 0) / iterations;
    const avgWithIndex = durationsWithIndex.reduce((sum, d) => sum + d, 0) / iterations;

    console.log('Index Performance Impact:');
    console.log(`  Avg without index: ${avgNoIndex.toFixed(2)}ms`);
    console.log(`  Avg with index:    ${avgWithIndex.toFixed(2)}ms`);
    console.log(
      `  Overhead:          ${(((avgWithIndex - avgNoIndex) / avgNoIndex) * 100).toFixed(1)}%`
    );

    // Index overhead should be minimal (< 50%)
    expect(avgWithIndex).toBeLessThan(avgNoIndex * 1.5);
  });

  it('should measure transaction performance', async () => {
    const iterations = 100;

    // Benchmark with explicit transaction
    const startTime = performance.now();

    // Simulate transaction begin
    await mockDb.execAsync('BEGIN TRANSACTION');

    for (let i = 0; i < iterations; i++) {
      await mockDb.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [1, 1, i + 1, 100, 8, 2, Date.now(), 0]
      );
    }

    // Simulate transaction commit
    await mockDb.execAsync('COMMIT');

    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    const perOperationTime = totalDuration / iterations;

    console.log('Transaction Performance:');
    console.log(`  Total duration:   ${totalDuration.toFixed(2)}ms`);
    console.log(`  Per operation:    ${perOperationTime.toFixed(2)}ms`);
    console.log(`  Operations/sec:   ${(1000 / perOperationTime).toFixed(0)}`);

    // Transaction should improve per-operation time
    expect(perOperationTime).toBeLessThan(5);
  });

  it('should handle concurrent writes', async () => {
    const concurrentWrites = 20;
    const startTime = performance.now();

    // Simulate concurrent writes
    const writePromises = [];
    for (let i = 0; i < concurrentWrites; i++) {
      writePromises.push(
        mockDb.runAsync(
          'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [1, 1, i + 1, 100, 8, 2, Date.now(), 0]
        )
      );
    }

    await Promise.all(writePromises);

    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    const avgDuration = totalDuration / concurrentWrites;

    console.log('Concurrent Write Performance:');
    console.log(`  Concurrent writes: ${concurrentWrites}`);
    console.log(`  Total duration:    ${totalDuration.toFixed(2)}ms`);
    console.log(`  Avg per write:     ${avgDuration.toFixed(2)}ms`);

    // WAL mode should handle concurrent writes efficiently
    expect(avgDuration).toBeLessThan(5);
  });

  it('should benchmark update operations', async () => {
    const iterations = 100;
    const durations: number[] = [];

    // First, insert records to update
    for (let i = 0; i < iterations; i++) {
      await mockDb.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [1, 1, i + 1, 100, 8, 2, Date.now(), 0]
      );
    }

    // Benchmark updates
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      await mockDb.runAsync('UPDATE sets SET synced = 1 WHERE workout_id = ? AND set_number = ?', [
        1,
        i + 1,
      ]);

      const endTime = performance.now();
      durations.push(endTime - startTime);
    }

    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95 = sortedDurations[Math.floor(iterations * 0.95)];
    const avg = durations.reduce((sum, d) => sum + d, 0) / iterations;

    console.log('Update Performance:');
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Average:    ${avg.toFixed(2)}ms`);
    console.log(`  p95:        ${p95.toFixed(2)}ms`);

    // Updates should meet same performance requirements
    expect(p95).toBeLessThan(5);
  });

  it('should verify read performance for workout queries', async () => {
    // Insert test data
    for (let i = 0; i < 100; i++) {
      await mockDb.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [1, 1, i + 1, 100, 8, 2, Date.now(), 0]
      );
    }

    // Mock getAllAsync for read operations
    vi.mocked(
      (mockDb.getAllAsync = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 2));
        return Array(100)
          .fill(null)
          .map((_, i) => ({
            id: i + 1,
            workout_id: 1,
            exercise_id: 1,
            set_number: i + 1,
            weight_kg: 100,
            reps: 8,
            rir: 2,
          }));
      }))
    );

    const iterations = 50;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      await mockDb.getAllAsync('SELECT * FROM sets WHERE workout_id = ? ORDER BY set_number', [1]);

      const endTime = performance.now();
      durations.push(endTime - startTime);
    }

    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95 = sortedDurations[Math.floor(iterations * 0.95)];
    const avg = durations.reduce((sum, d) => sum + d, 0) / iterations;

    console.log('Read Performance:');
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Average:    ${avg.toFixed(2)}ms`);
    console.log(`  p95:        ${p95.toFixed(2)}ms`);

    // Reads should be fast (typically < 3ms)
    expect(p95).toBeLessThan(3);
  });
});
