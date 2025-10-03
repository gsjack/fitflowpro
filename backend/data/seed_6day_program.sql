-- Seed 6-Day Renaissance Periodization Split
-- Based on Mike Israetel's hypertrophy and VO2max training methodology
-- Program structure: Push A / Pull A / VO2max A / Push B / Pull B / VO2max B

-- Clear existing program data
DELETE FROM program_exercises;
DELETE FROM program_days;
DELETE FROM programs WHERE user_id = 1;

-- Create the 6-day program for user 1
INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
VALUES (1, 'Renaissance Periodization 6-Day Split', 1, 'mev', strftime('%s', 'now') * 1000);

-- Get the auto-generated program ID
-- Since we deleted all programs, this will be ID 1

-- ============================================================================
-- Program Days (6 days: Mon-Sat)
-- ============================================================================

-- Day 1 (Monday) - Push A (Chest-Focused)
INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
VALUES (1, 1, 'Push A (Chest-Focused)', 'strength');

-- Day 2 (Tuesday) - Pull A (Lat-Focused)
INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
VALUES (1, 2, 'Pull A (Lat-Focused)', 'strength');

-- Day 3 (Wednesday) - VO2max A
INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
VALUES (1, 3, 'VO2max A (Norwegian 4x4)', 'vo2max');

-- Day 4 (Thursday) - Push B (Shoulder-Focused)
INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
VALUES (1, 4, 'Push B (Shoulder-Focused)', 'strength');

-- Day 5 (Friday) - Pull B (Rhomboid/Trap-Focused)
INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
VALUES (1, 5, 'Pull B (Rhomboid/Trap-Focused)', 'strength');

-- Day 6 (Saturday) - VO2max B
INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
VALUES (1, 6, 'VO2max B (30/30 or Zone 2)', 'vo2max');

-- ============================================================================
-- Program Exercises - Day 1: Push A (Chest-Focused)
-- ============================================================================

-- 1. Compound leg exercise for testosterone boost
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (1, 25, 1, 3, '6-8', 3); -- Barbell Back Squat

-- 2. Heavy chest pressing
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (1, 1, 2, 4, '6-8', 3); -- Barbell Bench Press

-- 3. Incline pressing
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (1, 5, 3, 3, '8-10', 2); -- Incline Dumbbell Press

-- 4. Chest isolation
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (1, 7, 4, 3, '12-15', 1); -- Cable Flyes

-- 5. Lateral delts
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (1, 20, 5, 4, '12-15', 1); -- Lateral Raises

-- 6. Triceps isolation
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (1, 49, 6, 3, '15-20', 0); -- Tricep Pushdown

-- ============================================================================
-- Program Exercises - Day 2: Pull A (Lat-Focused)
-- ============================================================================

-- 1. Compound leg exercise for testosterone boost
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (2, 68, 1, 3, '5-8', 3); -- Conventional Deadlift

-- 2. Vertical pull
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (2, 14, 2, 4, '5-8', 3); -- Pull-Ups

-- 3. Horizontal pull
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (2, 10, 3, 4, '8-10', 2); -- Barbell Row

-- 4. Cable row variation
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (2, 13, 4, 3, '12-15', 1); -- Seated Cable Row

-- 5. Rear delts
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (2, 16, 5, 3, '15-20', 0); -- Face Pulls

-- 6. Biceps
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (2, 39, 6, 3, '8-12', 1); -- Barbell Curl

-- ============================================================================
-- Program Exercises - Day 3: VO2max A (Norwegian 4x4)
-- ============================================================================

-- No exercises for cardio day (interval protocol handled separately)

-- ============================================================================
-- Program Exercises - Day 4: Push B (Shoulder-Focused)
-- ============================================================================

-- 1. Compound leg exercise for testosterone boost
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (4, 71, 1, 3, '8-12', 3); -- Goblet Squat

-- 2. Overhead pressing
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (4, 18, 2, 4, '5-8', 3); -- Overhead Press

-- 3. Flat pressing variation
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (4, 4, 3, 3, '8-12', 2); -- Dumbbell Bench Press

-- 4. Lateral delt emphasis
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (4, 21, 4, 4, '15-20', 0); -- Cable Lateral Raises

-- 5. Rear delts
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (4, 22, 5, 3, '15-20', 0); -- Rear Delt Flyes

-- 6. Triceps compound
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (4, 46, 6, 3, '8-10', 2); -- Close-Grip Bench Press

-- ============================================================================
-- Program Exercises - Day 5: Pull B (Rhomboid/Trap-Focused)
-- ============================================================================

-- 1. Compound leg exercise for testosterone boost
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (5, 26, 1, 3, '6-8', 3); -- Front Squat

-- 2. Explosive horizontal pull (Pendlay Row equivalent)
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (5, 10, 2, 4, '6-8', 3); -- Barbell Row

-- 3. Wide-grip cable row
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (5, 12, 3, 3, '10-12', 2); -- Lat Pulldown (wide grip)

-- 4. Trap work
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (5, 62, 4, 4, '12-15', 1); -- Barbell Shrugs

-- 5. Rear delts
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (5, 22, 5, 3, '15-20', 0); -- Rear Delt Flyes

-- 6. Biceps variation
INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
VALUES (5, 41, 6, 3, '10-15', 1); -- Hammer Curl

-- ============================================================================
-- Program Exercises - Day 6: VO2max B (30/30 or Zone 2)
-- ============================================================================

-- No exercises for cardio day (interval protocol handled separately)

-- ============================================================================
-- Create today's workout for user 1 (based on current day of week)
-- This allows the Dashboard to immediately show a workout
-- ============================================================================

INSERT INTO workouts (user_id, program_day_id, date, status, synced)
SELECT
  1,
  CASE CAST(strftime('%w', 'now') AS INTEGER)
    WHEN 0 THEN 6  -- Sunday -> Saturday's workout (VO2max B)
    WHEN 1 THEN 1  -- Monday -> Push A
    WHEN 2 THEN 2  -- Tuesday -> Pull A
    WHEN 3 THEN 3  -- Wednesday -> VO2max A
    WHEN 4 THEN 4  -- Thursday -> Push B
    WHEN 5 THEN 5  -- Friday -> Pull B
    WHEN 6 THEN 6  -- Saturday -> VO2max B
  END,
  date('now'),
  'not_started',
  0;
