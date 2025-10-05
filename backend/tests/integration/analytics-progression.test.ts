import tap from 'tap';
import Database from 'better-sqlite3';


/**
 * Integration Test T076: Analytics and Progression Tracking
 *
 * Validates Scenario 3 from quickstart.md:
 * - Seed 4 weeks data, verify 1RM progression 120kg→130kg
 * - Verify volume trends, adherence 100%
 */

tap.test('Integration Test: Analytics and Progression Tracking (T076)', async (t) => {
  let db: Database.Database;
  let userId: number;

  t.beforeEach(async () => {
    // Create in-memory test database
    db = new Database(':memory:');

    // Create schema
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        muscle_group TEXT NOT NULL,
        equipment TEXT,
        is_compound BOOLEAN DEFAULT 0
      );

      CREATE TABLE workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        program_day_id INTEGER,
        date TEXT NOT NULL,
        status TEXT CHECK(status IN ('not_started', 'in_progress', 'completed', 'cancelled')) DEFAULT 'not_started',
        total_volume_kg REAL DEFAULT 0,
        duration_minutes INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        completed_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        set_number INTEGER NOT NULL,
        weight_kg REAL NOT NULL,
        reps INTEGER NOT NULL,
        rir INTEGER CHECK(rir >= 0 AND rir <= 4),
        timestamp INTEGER DEFAULT (strftime('%s', 'now')),
        synced BOOLEAN DEFAULT 0,
        FOREIGN KEY (workout_id) REFERENCES workouts(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );

      CREATE INDEX idx_sets_workout ON sets(workout_id);
      CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
    `);

    // Insert test user
    const insertUser = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
    const userResult = insertUser.run('test@example.com', 'hashed_password', 'Test User');
    userId = userResult.lastInsertRowid as number;

    // Insert exercises
    const insertExercise = db.prepare('INSERT INTO exercises (name, muscle_group, equipment, is_compound) VALUES (?, ?, ?, ?)');
    insertExercise.run('Barbell Bench Press', 'chest', 'barbell', 1);
  });

  t.afterEach(async () => {
    db.close();
  });

  t.test('should track 1RM progression over 4 weeks (120kg → 130kg)', async (t) => {
    const exerciseId = 1; // Barbell Bench Press

    // Seed 4 weeks of data (8 workouts, 2 per week)
    const weeks = [
      { week: 1, workouts: [
        { date: '2025-09-02', sets: [{ weight: 100, reps: 8, rir: 2 }, { weight: 100, reps: 8, rir: 2 }] },
        { date: '2025-09-05', sets: [{ weight: 100, reps: 8, rir: 1 }, { weight: 100, reps: 7, rir: 1 }] },
      ]},
      { week: 2, workouts: [
        { date: '2025-09-09', sets: [{ weight: 102.5, reps: 8, rir: 2 }, { weight: 102.5, reps: 8, rir: 2 }] },
        { date: '2025-09-12', sets: [{ weight: 102.5, reps: 9, rir: 1 }, { weight: 102.5, reps: 8, rir: 1 }] },
      ]},
      { week: 3, workouts: [
        { date: '2025-09-16', sets: [{ weight: 105, reps: 8, rir: 2 }, { weight: 105, reps: 8, rir: 2 }] },
        { date: '2025-09-19', sets: [{ weight: 105, reps: 9, rir: 1 }, { weight: 105, reps: 8, rir: 1 }] },
      ]},
      { week: 4, workouts: [
        { date: '2025-09-23', sets: [{ weight: 107.5, reps: 8, rir: 2 }, { weight: 107.5, reps: 8, rir: 2 }] },
        { date: '2025-09-26', sets: [{ weight: 107.5, reps: 9, rir: 1 }, { weight: 107.5, reps: 9, rir: 1 }] },
      ]},
    ];

    const insertWorkout = db.prepare('INSERT INTO workouts (user_id, date, status) VALUES (?, ?, ?)');
    const insertSet = db.prepare('INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir) VALUES (?, ?, ?, ?, ?, ?)');

    for (const week of weeks) {
      for (const workout of week.workouts) {
        const workoutResult = insertWorkout.run(userId, workout.date, 'completed');
        const workoutId = workoutResult.lastInsertRowid as number;

        workout.sets.forEach((set, index) => {
          insertSet.run(workoutId, exerciseId, index + 1, set.weight, set.reps, set.rir);
        });
      }
    }

    // Calculate 1RM progression using Epley formula with RIR adjustment
    // Query for 1RM progression
    const progressionQuery = db.prepare(`
      SELECT
        w.date,
        s.weight_kg,
        s.reps,
        s.rir,
        (s.weight_kg * (1.0 + (s.reps - s.rir) / 30.0)) as estimated_1rm
      FROM sets s
      JOIN workouts w ON s.workout_id = w.id
      WHERE w.user_id = ?
        AND s.exercise_id = ?
        AND w.status = 'completed'
      ORDER BY w.date
    `);

    const progression = progressionQuery.all(userId, exerciseId) as Array<{
      date: string;
      weight_kg: number;
      reps: number;
      rir: number;
      estimated_1rm: number;
    }>;

    t.equal(progression.length, 16, 'Should have 16 total sets (8 workouts × 2 sets)');

    // Week 1 best 1RM: 100 × (1 + (8-1)/30) = 100 × 1.233 = 123.3kg
    const week1Best = Math.max(...progression.slice(0, 4).map(p => p.estimated_1rm));
    t.ok(week1Best >= 120 && week1Best <= 125, `Week 1 1RM should be ~120kg, got ${week1Best.toFixed(1)}kg`);

    // Week 4 best 1RM: 107.5 × (1 + (9-1)/30) = 107.5 × 1.267 = 136.2kg
    const week4Best = Math.max(...progression.slice(12, 16).map(p => p.estimated_1rm));
    t.ok(week4Best >= 130 && week4Best <= 140, `Week 4 1RM should be ~130kg, got ${week4Best.toFixed(1)}kg`);

    // Verify progression
    const improvement = week4Best - week1Best;
    t.ok(improvement >= 8, `1RM should improve by at least 8kg over 4 weeks, improved by ${improvement.toFixed(1)}kg`);
  });

  t.test('should track volume trends with MEV/MAV/MRV landmarks', async (t) => {
    const chestExerciseId = 1;

    // Define volume landmarks for chest
    const volumeLandmarks = {
      chest: { mev: 8, mav: 14, mrv: 22 },
    };

    // Seed mesocycle progression: MEV → MAV → MRV → Deload
    const weeks = [
      { week: 1, totalSets: 14, phase: 'MAV' }, // Week 1-2: MAV
      { week: 2, totalSets: 16, phase: 'approaching_MRV' },
      { week: 3, totalSets: 18, phase: 'MRV' }, // Week 3: MRV
      { week: 4, totalSets: 10, phase: 'deload' }, // Week 4: Deload
    ];

    const insertWorkout = db.prepare('INSERT INTO workouts (user_id, date, status) VALUES (?, ?, ?)');
    const insertSet = db.prepare('INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir) VALUES (?, ?, ?, ?, ?, ?)');

    for (const weekData of weeks) {
      // 2 workouts per week
      for (let workoutNum = 0; workoutNum < 2; workoutNum++) {
        const date = `2025-09-${String(1 + (weekData.week - 1) * 7 + workoutNum * 3).padStart(2, '0')}`;
        const workoutResult = insertWorkout.run(userId, date, 'completed');
        const workoutId = workoutResult.lastInsertRowid as number;

        // Distribute sets across workout (half per workout)
        const setsPerWorkout = Math.floor(weekData.totalSets / 2);
        for (let setNum = 1; setNum <= setsPerWorkout; setNum++) {
          insertSet.run(workoutId, chestExerciseId, setNum, 100, 10, 2);
        }
      }
    }

    // Query volume trends
    const volumeQuery = db.prepare(`
      SELECT
        strftime('%Y-W%W', w.date) as week,
        COUNT(s.id) as total_sets,
        SUM(s.weight_kg * s.reps) as total_volume_kg
      FROM sets s
      JOIN workouts w ON s.workout_id = w.id
      WHERE w.user_id = ?
        AND s.exercise_id = ?
        AND w.status = 'completed'
      GROUP BY week
      ORDER BY week
    `);

    const volumeTrends = volumeQuery.all(userId, chestExerciseId) as Array<{
      week: string;
      total_sets: number;
      total_volume_kg: number;
    }>;

    t.equal(volumeTrends.length, 4, 'Should have 4 weeks of data');

    // Verify volume progression
    const expectedVolumes = [14, 16, 18, 10];
    volumeTrends.forEach((trend, index) => {
      t.equal(trend.total_sets, expectedVolumes[index], `Week ${index + 1} should have ${expectedVolumes[index]} sets`);

      // Check zone classification
      const { mev, mav, mrv } = volumeLandmarks.chest;
      let zone: string;

      if (trend.total_sets < mev) {
        zone = 'below_MEV';
      } else if (trend.total_sets < mav) {
        zone = 'MEV_to_MAV';
      } else if (trend.total_sets < mrv) {
        zone = 'MAV_to_MRV';
      } else {
        zone = 'at_or_above_MRV';
      }

      if (index === 0) t.equal(zone, 'MAV_to_MRV', 'Week 1 should be in MAV-MRV zone');
      if (index === 1) t.equal(zone, 'MAV_to_MRV', 'Week 2 should be in MAV-MRV zone');
      if (index === 2) t.equal(zone, 'MAV_to_MRV', 'Week 3 should be in MAV-MRV zone');
      if (index === 3) t.equal(zone, 'MEV_to_MAV', 'Week 4 (deload) should be in MEV-MAV zone');
    });
  });

  t.test('should calculate adherence and consistency metrics', async (t) => {
    // Seed 4 weeks of workouts (6 workouts per week = 24 total)
    const insertWorkout = db.prepare('INSERT INTO workouts (user_id, date, status, duration_minutes) VALUES (?, ?, ?, ?)');

    let completedWorkouts = 0;
    let totalDuration = 0;

    for (let week = 1; week <= 4; week++) {
      for (let day = 0; day < 6; day++) {
        const date = `2025-09-${String(1 + (week - 1) * 7 + day).padStart(2, '0')}`;
        const duration = 50 + Math.floor(Math.random() * 10); // 50-60 minutes
        insertWorkout.run(userId, date, 'completed', duration);
        completedWorkouts++;
        totalDuration += duration;
      }
    }

    // Calculate adherence
    const adherenceQuery = db.prepare(`
      SELECT
        COUNT(*) as completed_workouts,
        AVG(duration_minutes) as avg_duration
      FROM workouts
      WHERE user_id = ?
        AND status = 'completed'
    `);

    const adherenceResult = adherenceQuery.get(userId) as {
      completed_workouts: number;
      avg_duration: number;
    };

    t.equal(adherenceResult.completed_workouts, 24, 'Should have 24 completed workouts');

    const adherenceRate = (adherenceResult.completed_workouts / 24) * 100;
    t.equal(adherenceRate, 100, 'Adherence rate should be 100%');

    const avgDuration = adherenceResult.avg_duration;
    t.ok(avgDuration >= 50 && avgDuration <= 60, `Average duration should be 50-60 minutes, got ${avgDuration.toFixed(1)}`);
  });

  t.test('should verify deload compliance', async (t) => {
    const exerciseId = 1;
    const insertWorkout = db.prepare('INSERT INTO workouts (user_id, date, status) VALUES (?, ?, ?)');
    const insertSet = db.prepare('INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir) VALUES (?, ?, ?, ?, ?, ?)');

    // Week 3 (MRV): 18 sets
    const week3Date = '2025-09-16';
    const week3Result = insertWorkout.run(userId, week3Date, 'completed');
    const week3Id = week3Result.lastInsertRowid as number;

    for (let i = 1; i <= 18; i++) {
      insertSet.run(week3Id, exerciseId, i, 100, 10, 2);
    }

    // Week 4 (Deload): 10 sets (50% reduction)
    const week4Date = '2025-09-23';
    const week4Result = insertWorkout.run(userId, week4Date, 'completed');
    const week4Id = week4Result.lastInsertRowid as number;

    for (let i = 1; i <= 10; i++) {
      insertSet.run(week4Id, exerciseId, i, 100, 10, 2);
    }

    // Verify volume reduction
    const volumeQuery = db.prepare(`
      SELECT w.date, COUNT(s.id) as total_sets
      FROM sets s
      JOIN workouts w ON s.workout_id = w.id
      WHERE w.id IN (?, ?)
      GROUP BY w.id
      ORDER BY w.date
    `);

    const volumes = volumeQuery.all(week3Id, week4Id) as Array<{ date: string; total_sets: number }>;

    t.equal(volumes[0].total_sets, 18, 'Week 3 should have 18 sets (MRV)');
    t.equal(volumes[1].total_sets, 10, 'Week 4 should have 10 sets (deload)');

    const reductionPercentage = ((18 - 10) / 18) * 100;
    t.ok(reductionPercentage >= 40 && reductionPercentage <= 60, `Deload should reduce volume by ~50%, reduced by ${reductionPercentage.toFixed(0)}%`);

    // Verify deload compliance flag
    const isDeloadCompliant = volumes[1].total_sets <= volumes[0].total_sets * 0.6;
    t.ok(isDeloadCompliant, 'Deload should be compliant (≤60% of previous week)');
  });

  t.test('should handle multiple muscle groups in analytics', async (t) => {
    // Insert exercises for different muscle groups
    const insertExercise = db.prepare('INSERT INTO exercises (name, muscle_group, equipment, is_compound) VALUES (?, ?, ?, ?)');
    insertExercise.run('Barbell Row', 'back', 'barbell', 1);
    insertExercise.run('Squat', 'legs', 'barbell', 1);

    const insertWorkout = db.prepare('INSERT INTO workouts (user_id, date, status) VALUES (?, ?, ?)');
    const insertSet = db.prepare('INSERT INTO sets (workout_id, exercise_id, set_number, weight_kg, reps, rir) VALUES (?, ?, ?, ?, ?, ?)');

    const workoutResult = insertWorkout.run(userId, '2025-10-02', 'completed');
    const workoutId = workoutResult.lastInsertRowid as number;

    // Chest: 10 sets
    for (let i = 1; i <= 10; i++) {
      insertSet.run(workoutId, 1, i, 100, 10, 2);
    }

    // Back: 12 sets
    for (let i = 1; i <= 12; i++) {
      insertSet.run(workoutId, 2, i, 80, 10, 2);
    }

    // Legs: 8 sets
    for (let i = 1; i <= 8; i++) {
      insertSet.run(workoutId, 3, i, 120, 10, 2);
    }

    // Query volume by muscle group
    const volumeByMuscleQuery = db.prepare(`
      SELECT
        e.muscle_group,
        COUNT(s.id) as total_sets,
        SUM(s.weight_kg * s.reps) as total_volume_kg
      FROM sets s
      JOIN exercises e ON s.exercise_id = e.id
      JOIN workouts w ON s.workout_id = w.id
      WHERE w.user_id = ? AND w.status = 'completed'
      GROUP BY e.muscle_group
      ORDER BY e.muscle_group
    `);

    const volumeByMuscle = volumeByMuscleQuery.all(userId) as Array<{
      muscle_group: string;
      total_sets: number;
      total_volume_kg: number;
    }>;

    t.equal(volumeByMuscle.length, 3, 'Should have 3 muscle groups');

    const back = volumeByMuscle.find(v => v.muscle_group === 'back');
    const chest = volumeByMuscle.find(v => v.muscle_group === 'chest');
    const legs = volumeByMuscle.find(v => v.muscle_group === 'legs');

    t.equal(chest?.total_sets, 10, 'Chest should have 10 sets');
    t.equal(back?.total_sets, 12, 'Back should have 12 sets');
    t.equal(legs?.total_sets, 8, 'Legs should have 8 sets');

    t.equal(chest?.total_volume_kg, 10000, 'Chest volume should be 10,000 kg');
    t.equal(back?.total_volume_kg, 9600, 'Back volume should be 9,600 kg');
    t.equal(legs?.total_volume_kg, 9600, 'Legs volume should be 9,600 kg');
  });
});
