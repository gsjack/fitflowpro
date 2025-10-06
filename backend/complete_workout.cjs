#!/usr/bin/env node
const Database = require('better-sqlite3');

const db = new Database('./data/fitflow.db');

console.log('=== Completing Workout 27 ===\n');

// Calculate metrics from sets
const sets = db.prepare('SELECT weight_kg, reps, rir FROM sets WHERE workout_id = 27').all();

const totalVolume = sets.reduce((sum, set) => sum + (set.weight_kg * set.reps), 0);
const avgRir = sets.reduce((sum, set) => sum + set.rir, 0) / sets.length;

console.log(`Total sets: ${sets.length}`);
console.log(`Total volume: ${totalVolume.toFixed(2)} kg`);
console.log(`Average RIR: ${avgRir.toFixed(2)}\n`);

// Update workout to completed
const completedAt = Date.now();

db.prepare(`
  UPDATE workouts
  SET status = 'completed',
      completed_at = ?,
      total_volume_kg = ?,
      average_rir = ?,
      synced = 0
  WHERE id = 27
`).run(completedAt, totalVolume, avgRir);

console.log('✅ Workout 27 marked as completed');

// Verify
const workout = db.prepare('SELECT id, user_id, status, date, total_volume_kg, average_rir FROM workouts WHERE id = 27').get();
console.log('\nUpdated workout:', workout);

db.close();
