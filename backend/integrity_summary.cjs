const Database = require('better-sqlite3');
const db = new Database('/mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db', { readonly: true });

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║        DATABASE INTEGRITY ANALYSIS SUMMARY                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// CRITICAL ISSUES (P0)
console.log('═══ CRITICAL ISSUES (P0) - MUST FIX BEFORE TRANSFER ═══\n');

// 1. Orphaned workout records
const orphanedWorkouts = db.prepare(`
  SELECT w.id, w.program_day_id, w.user_id, w.date, w.status
  FROM workouts w
  LEFT JOIN program_days pd ON w.program_day_id = pd.id
  WHERE w.program_day_id IS NOT NULL AND pd.id IS NULL
`).all();

if (orphanedWorkouts.length > 0) {
  console.log(`🔴 CRITICAL: ${orphanedWorkouts.length} workouts reference non-existent program_days`);
  console.log('   Impact: Foreign key constraint violation on transfer');
  console.log('   Affected workout IDs:', orphanedWorkouts.map(w => w.id).join(', '));
  console.log('   Missing program_day IDs:', [...new Set(orphanedWorkouts.map(w => w.program_day_id))].join(', '));

  // Check if users exist
  const userIds = [...new Set(orphanedWorkouts.map(w => w.user_id))];
  const userCheck = db.prepare(`SELECT id FROM users WHERE id IN (${userIds.join(',')})`).all();
  console.log('   Users exist:', userCheck.length === userIds.length ? 'YES' : 'NO (PHANTOM DATA!)');
  console.log('   Recommendation: DELETE these orphaned workouts before transfer\n');
} else {
  console.log('✅ No orphaned workouts\n');
}

// MODERATE ISSUES (P1) - Should fix but won't block transfer
console.log('═══ MODERATE ISSUES (P1) - SHOULD FIX ═══\n');

// 2. Duplicate exercises
const dupExercises = db.prepare(`
  SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
  FROM exercises
  GROUP BY name
  HAVING count > 1
`).all();

if (dupExercises.length > 0) {
  console.log(`🟡 MODERATE: ${dupExercises.length} duplicate exercise names`);
  dupExercises.forEach(ex => {
    console.log(`   - "${ex.name}": ${ex.count} copies (IDs: ${ex.ids})`);

    // Check if both are being used
    const ids = ex.ids.split(',').map(Number);
    const usage = db.prepare(`
      SELECT exercise_id, COUNT(*) as usage_count
      FROM sets
      WHERE exercise_id IN (${ids.join(',')})
      GROUP BY exercise_id
    `).all();

    if (usage.length > 0) {
      console.log(`     Usage: ${usage.map(u => `ID ${u.exercise_id}: ${u.usage_count} sets`).join(', ')}`);
    } else {
      console.log('     Usage: Not used in any sets (safe to delete duplicates)');
    }
  });
  console.log('   Recommendation: Consolidate duplicates, update FK references if needed\n');
} else {
  console.log('✅ No duplicate exercises\n');
}

// 3. Users with multiple programs
const multiplePrograms = db.prepare(`
  SELECT user_id, COUNT(*) as count, GROUP_CONCAT(id) as program_ids
  FROM programs
  GROUP BY user_id
  HAVING count > 1
`).all();

if (multiplePrograms.length > 0) {
  console.log(`🟡 MODERATE: ${multiplePrograms.length} users with multiple programs`);
  multiplePrograms.slice(0, 3).forEach(up => {
    const programs = db.prepare(`
      SELECT id, name, mesocycle_phase, created_at
      FROM programs
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(up.user_id);

    console.log(`   User ${up.user_id}: ${up.count} programs`);
    programs.forEach(p => {
      const ts = new Date(p.created_at).toISOString().split('T')[0];
      console.log(`     - ID ${p.id}: ${p.mesocycle_phase} phase (${ts})`);
    });
  });
  console.log('   Recommendation: This is normal if users created multiple programs over time\n');
} else {
  console.log('✅ Users have single programs\n');
}

// 4. Workouts with sets but status != completed
const incompleteSets = db.prepare(`
  SELECT w.id, w.status, w.date, COUNT(s.id) as set_count
  FROM workouts w
  INNER JOIN sets s ON w.id = s.workout_id
  WHERE w.status != 'completed'
  GROUP BY w.id, w.status, w.date
`).all();

if (incompleteSets.length > 0) {
  console.log(`🟡 MODERATE: ${incompleteSets.length} workouts have sets but status != 'completed'`);
  const sample = incompleteSets.slice(0, 3);
  sample.forEach(w => {
    console.log(`   Workout ${w.id}: ${w.set_count} sets, status='${w.status}' (${w.date})`);
  });
  console.log('   Recommendation: Update status to "completed" or delete sets\n');
} else {
  console.log('✅ Workout statuses are consistent with sets\n');
}

// LOW PRIORITY ISSUES (P2) - Informational
console.log('═══ LOW PRIORITY ISSUES (P2) - INFORMATIONAL ═══\n');

// 5. Sync status
const unsyncedWorkouts = db.prepare(`SELECT COUNT(*) as count FROM workouts WHERE synced = 0`).get();
const unsyncedSets = db.prepare(`SELECT COUNT(*) as count FROM sets WHERE synced = 0`).get();

console.log(`ℹ️  Unsynced data:`);
console.log(`   - Workouts: ${unsyncedWorkouts.count}`);
console.log(`   - Sets: ${unsyncedSets.count}`);
console.log('   Recommendation: Normal for local-first architecture, will sync post-transfer\n');

// DATA STATISTICS
console.log('═══ DATA STATISTICS ═══\n');

const stats = [
  { table: 'users', query: 'SELECT COUNT(*) as c FROM users' },
  { table: 'programs', query: 'SELECT COUNT(*) as c FROM programs' },
  { table: 'program_days', query: 'SELECT COUNT(*) as c FROM program_days' },
  { table: 'exercises', query: 'SELECT COUNT(*) as c FROM exercises' },
  { table: 'workouts', query: 'SELECT COUNT(*) as c FROM workouts' },
  { table: 'sets', query: 'SELECT COUNT(*) as c FROM sets' },
  { table: 'recovery_assessments', query: 'SELECT COUNT(*) as c FROM recovery_assessments' },
];

stats.forEach(s => {
  const count = db.prepare(s.query).get().c;
  console.log(`   ${s.table.padEnd(25)}: ${count.toLocaleString()} records`);
});

console.log('\n═══ TRANSFER READINESS SUMMARY ═══\n');

const totalCritical = orphanedWorkouts.length;
const totalModerate = dupExercises.length + incompleteSets.length;

if (totalCritical > 0) {
  console.log('🔴 TRANSFER BLOCKED: Critical issues must be fixed first');
  console.log(`   Critical issues: ${totalCritical}`);
} else {
  console.log('✅ TRANSFER READY: No critical blockers');
}

console.log(`   Moderate issues: ${totalModerate} (recommended to fix)`);
console.log(`   Low priority: 2 (informational only)\n`);

// RECOMMENDED FIXES
console.log('═══ RECOMMENDED FIX SCRIPT ═══\n');

if (orphanedWorkouts.length > 0) {
  console.log('-- Delete orphaned workouts (run with caution!)');
  const ids = orphanedWorkouts.map(w => w.id).join(', ');
  console.log(`DELETE FROM workouts WHERE id IN (${ids});\n`);
}

if (dupExercises.length > 0) {
  console.log('-- Consolidate duplicate exercises (manual review required)');
  dupExercises.forEach(ex => {
    const ids = ex.ids.split(',').map(Number);
    const keepId = Math.min(...ids);
    const deleteIds = ids.filter(id => id !== keepId);

    console.log(`-- Consolidate "${ex.name}": keep ID ${keepId}, delete ${deleteIds.join(', ')}`);
    if (deleteIds.length > 0) {
      console.log(`UPDATE sets SET exercise_id = ${keepId} WHERE exercise_id IN (${deleteIds.join(', ')});`);
      console.log(`UPDATE program_exercises SET exercise_id = ${keepId} WHERE exercise_id IN (${deleteIds.join(', ')});`);
      console.log(`DELETE FROM exercises WHERE id IN (${deleteIds.join(', ')});\n`);
    }
  });
}

if (incompleteSets.length > 0) {
  console.log('-- Fix workout statuses (sets exist but status != completed)');
  const ids = incompleteSets.map(w => w.id).join(', ');
  console.log(`UPDATE workouts SET status = 'completed' WHERE id IN (${ids});\n`);
}

db.close();

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                    END OF ANALYSIS                              ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
