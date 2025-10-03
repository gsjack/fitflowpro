#!/usr/bin/env node
/**
 * Update secondary_muscle_groups field in exercises table
 * Extracts all elements except the first from muscle_groups JSON array
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../data/fitflow.db');
const db = new Database(DB_PATH);

// Get all exercises
const exercises = db.prepare('SELECT id, muscle_groups FROM exercises').all();

console.log(`Updating ${exercises.length} exercises...`);

const updateStmt = db.prepare('UPDATE exercises SET secondary_muscle_groups = ? WHERE id = ?');

let updated = 0;
for (const exercise of exercises) {
  try {
    const muscleGroups = JSON.parse(exercise.muscle_groups);

    // Secondary muscles are all except the first
    const secondaryMuscles = muscleGroups.slice(1);

    updateStmt.run(JSON.stringify(secondaryMuscles), exercise.id);
    updated++;
  } catch (error) {
    console.error(`Failed to update exercise ${exercise.id}:`, error);
  }
}

console.log(`Updated ${updated} exercises with secondary muscle groups`);

// Verify
const sample = db.prepare(`
  SELECT id, name, primary_muscle_group, secondary_muscle_groups
  FROM exercises
  LIMIT 5
`).all();

console.log('\nSample results:');
console.table(sample);

db.close();
