const Database = require('better-sqlite3');
const db = new Database('/mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           DATABASE INTEGRITY FIX SCRIPT                        ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let fixCount = 0;
let errorCount = 0;

try {
  db.exec('BEGIN TRANSACTION');

  // FIX 1: Delete orphaned workouts (CRITICAL)
  console.log('FIX 1: Deleting orphaned workouts...');
  const deleteOrphaned = db.prepare('DELETE FROM workouts WHERE id IN (173, 183, 193)');
  const result1 = deleteOrphaned.run();
  console.log(`   ✓ Deleted ${result1.changes} orphaned workouts`);
  fixCount += result1.changes;

  // FIX 2: Consolidate duplicate "Barbell Bench Press" (keep ID 1, delete 2)
  console.log('\nFIX 2: Consolidating duplicate "Barbell Bench Press"...');

  // First check if ID 2 is used anywhere
  const bbpUsageInSets = db.prepare('SELECT COUNT(*) as c FROM sets WHERE exercise_id = 2').get();
  const bbpUsageInProgramEx = db.prepare('SELECT COUNT(*) as c FROM program_exercises WHERE exercise_id = 2').get();

  console.log(`   ID 2 usage: ${bbpUsageInSets.c} sets, ${bbpUsageInProgramEx.c} program_exercises`);

  if (bbpUsageInSets.c > 0) {
    const updateSets = db.prepare('UPDATE sets SET exercise_id = 1 WHERE exercise_id = 2');
    const r1 = updateSets.run();
    console.log(`   ✓ Updated ${r1.changes} sets to use ID 1`);
    fixCount += r1.changes;
  }

  if (bbpUsageInProgramEx.c > 0) {
    const updateProgEx = db.prepare('UPDATE program_exercises SET exercise_id = 1 WHERE exercise_id = 2');
    const r2 = updateProgEx.run();
    console.log(`   ✓ Updated ${r2.changes} program_exercises to use ID 1`);
    fixCount += r2.changes;
  }

  const deleteBBP = db.prepare('DELETE FROM exercises WHERE id = 2');
  const r3 = deleteBBP.run();
  console.log(`   ✓ Deleted duplicate exercise (ID 2)`);
  fixCount += r3.changes;

  // FIX 3: Consolidate duplicate "Face Pulls" (keep ID 16, delete 64)
  console.log('\nFIX 3: Consolidating duplicate "Face Pulls"...');

  const fpUsageInSets = db.prepare('SELECT COUNT(*) as c FROM sets WHERE exercise_id = 64').get();
  const fpUsageInProgramEx = db.prepare('SELECT COUNT(*) as c FROM program_exercises WHERE exercise_id = 64').get();

  console.log(`   ID 64 usage: ${fpUsageInSets.c} sets, ${fpUsageInProgramEx.c} program_exercises`);

  if (fpUsageInSets.c > 0) {
    const updateSets = db.prepare('UPDATE sets SET exercise_id = 16 WHERE exercise_id = 64');
    const r4 = updateSets.run();
    console.log(`   ✓ Updated ${r4.changes} sets to use ID 16`);
    fixCount += r4.changes;
  }

  if (fpUsageInProgramEx.c > 0) {
    const updateProgEx = db.prepare('UPDATE program_exercises SET exercise_id = 16 WHERE exercise_id = 64');
    const r5 = updateProgEx.run();
    console.log(`   ✓ Updated ${r5.changes} program_exercises to use ID 16`);
    fixCount += r5.changes;
  }

  const deleteFP = db.prepare('DELETE FROM exercises WHERE id = 64');
  const r6 = deleteFP.run();
  console.log(`   ✓ Deleted duplicate exercise (ID 64)`);
  fixCount += r6.changes;

  // FIX 4: Fix workout statuses (sets exist but status != completed)
  console.log('\nFIX 4: Fixing workout statuses...');
  const fixStatuses = db.prepare(`
    UPDATE workouts
    SET status = 'completed'
    WHERE id IN (1, 2, 5, 6, 7, 9, 21, 27)
  `);
  const result4 = fixStatuses.run();
  console.log(`   ✓ Updated ${result4.changes} workouts to status='completed'`);
  fixCount += result4.changes;

  // Commit transaction
  db.exec('COMMIT');

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log(`║ ✅ SUCCESS: ${fixCount} fixes applied                             `);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Verify fixes
  console.log('═══ VERIFICATION ═══\n');

  const orphanCheck = db.prepare(`
    SELECT COUNT(*) as count
    FROM workouts w
    LEFT JOIN program_days pd ON w.program_day_id = pd.id
    WHERE w.program_day_id IS NOT NULL AND pd.id IS NULL
  `).get();
  console.log(`Orphaned workouts: ${orphanCheck.count} ${orphanCheck.count === 0 ? '✓' : '✗'}`);

  const dupExCheck = db.prepare(`
    SELECT COUNT(*) as count
    FROM (
      SELECT name
      FROM exercises
      GROUP BY name
      HAVING COUNT(*) > 1
    )
  `).get();
  console.log(`Duplicate exercises: ${dupExCheck.count} ${dupExCheck.count === 0 ? '✓' : '✗'}`);

  const statusCheck = db.prepare(`
    SELECT COUNT(*) as count
    FROM workouts w
    INNER JOIN sets s ON w.id = s.workout_id
    WHERE w.status != 'completed'
    GROUP BY w.id
  `).all();
  console.log(`Workouts with sets but status != completed: ${statusCheck.length} ${statusCheck.length === 0 ? '✓' : '✗'}`);

  console.log('\n✅ Database is now ready for transfer!\n');

} catch (error) {
  db.exec('ROLLBACK');
  console.error('\n❌ ERROR: Fix failed, rolling back changes');
  console.error(error.message);
  errorCount++;
  process.exit(1);
} finally {
  db.close();
}

process.exit(errorCount > 0 ? 1 : 0);
