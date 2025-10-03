-- FitFlow Pro - Exercise Library Seed Data
-- Renaissance Periodization Exercise Database
-- 100+ exercises covering all muscle groups

-- ============================================================================
-- CHEST EXERCISES
-- ============================================================================

INSERT INTO exercises (name, muscle_groups, equipment, difficulty, default_sets, default_reps, default_rir, notes) VALUES
('Barbell Bench Press', '["chest","front_delts","triceps"]', 'barbell', 'intermediate', 4, '6-8', 2, 'Compound chest exercise'),
('Incline Barbell Bench Press', '["chest","front_delts","triceps"]', 'barbell', 'intermediate', 4, '6-8', 2, 'Upper chest focus'),
('Dumbbell Bench Press', '["chest","front_delts","triceps"]', 'dumbbell', 'intermediate', 4, '8-10', 2, 'Greater ROM than barbell'),
('Incline Dumbbell Press', '["chest","front_delts","triceps"]', 'dumbbell', 'intermediate', 4, '8-10', 2, 'Upper chest hypertrophy'),
('Dumbbell Flyes', '["chest"]', 'dumbbell', 'intermediate', 3, '10-12', 2, 'Chest isolation'),
('Cable Flyes', '["chest"]', 'cable', 'beginner', 3, '12-15', 2, 'Constant tension'),
('Pec Deck Machine', '["chest"]', 'machine', 'beginner', 3, '12-15', 2, 'Safe chest isolation'),
('Push-Ups', '["chest","front_delts","triceps"]', 'bodyweight', 'beginner', 3, '10-15', 3, 'Bodyweight compound'),

-- ============================================================================
-- BACK EXERCISES
-- ============================================================================

('Barbell Row', '["lats","mid_back","rear_delts"]', 'barbell', 'intermediate', 4, '6-8', 2, 'Compound back builder'),
('Dumbbell Row', '["lats","mid_back","rear_delts"]', 'dumbbell', 'intermediate', 4, '8-10', 2, 'Unilateral back work'),
('Lat Pulldown', '["lats","mid_back"]', 'cable', 'beginner', 4, '10-12', 2, 'Vertical pull pattern'),
('Seated Cable Row', '["mid_back","lats"]', 'cable', 'beginner', 4, '10-12', 2, 'Horizontal pull pattern'),
('Pull-Ups', '["lats","mid_back","biceps"]', 'bodyweight', 'advanced', 4, '6-10', 2, 'Advanced vertical pull'),
('T-Bar Row', '["lats","mid_back","rear_delts"]', 'barbell', 'intermediate', 4, '8-10', 2, 'Thick back builder'),
('Face Pulls', '["rear_delts","mid_back"]', 'cable', 'beginner', 3, '15-20', 3, 'Rear delt health'),
('Chest Supported Row', '["mid_back","lats"]', 'machine', 'beginner', 4, '10-12', 2, 'Lower back friendly'),

-- ============================================================================
-- SHOULDER EXERCISES
-- ============================================================================

('Overhead Press', '["front_delts","side_delts","triceps"]', 'barbell', 'intermediate', 4, '6-8', 2, 'Compound shoulder press'),
('Dumbbell Shoulder Press', '["front_delts","side_delts","triceps"]', 'dumbbell', 'intermediate', 4, '8-10', 2, 'Greater ROM'),
('Lateral Raises', '["side_delts"]', 'dumbbell', 'beginner', 3, '12-15', 2, 'Side delt isolation'),
('Cable Lateral Raises', '["side_delts"]', 'cable', 'beginner', 3, '15-20', 2, 'Constant tension delts'),
('Rear Delt Flyes', '["rear_delts"]', 'dumbbell', 'beginner', 3, '12-15', 2, 'Rear delt isolation'),
('Arnold Press', '["front_delts","side_delts","triceps"]', 'dumbbell', 'intermediate', 4, '8-10', 2, 'Full delt activation'),
('Machine Shoulder Press', '["front_delts","side_delts","triceps"]', 'machine', 'beginner', 4, '10-12', 2, 'Stable pressing'),

-- ============================================================================
-- LEG EXERCISES (QUADS)
-- ============================================================================

('Barbell Back Squat', '["quads","glutes","hamstrings"]', 'barbell', 'intermediate', 4, '6-8', 2, 'King of leg exercises'),
('Front Squat', '["quads","glutes"]', 'barbell', 'advanced', 4, '6-8', 2, 'Quad-dominant squat'),
('Leg Press', '["quads","glutes","hamstrings"]', 'machine', 'beginner', 4, '10-12', 2, 'Lower back friendly'),
('Bulgarian Split Squat', '["quads","glutes"]', 'dumbbell', 'intermediate', 3, '10-12', 2, 'Unilateral quad work'),
('Goblet Squat', '["quads","glutes"]', 'dumbbell', 'beginner', 3, '8-12', 3, 'Beginner-friendly squat variation with dumbbell held at chest'),
('Leg Extension', '["quads"]', 'machine', 'beginner', 3, '12-15', 2, 'Quad isolation'),
('Walking Lunges', '["quads","glutes"]', 'dumbbell', 'intermediate', 3, '10-12', 2, 'Functional leg work'),
('Hack Squat', '["quads","glutes"]', 'machine', 'intermediate', 4, '8-10', 2, 'Quad-focused machine'),

-- ============================================================================
-- LEG EXERCISES (HAMSTRINGS/GLUTES)
-- ============================================================================

('Romanian Deadlift', '["hamstrings","glutes","lower_back"]', 'barbell', 'intermediate', 4, '8-10', 2, 'Hip hinge pattern'),
('Lying Leg Curl', '["hamstrings"]', 'machine', 'beginner', 3, '12-15', 2, 'Hamstring isolation'),
('Seated Leg Curl', '["hamstrings"]', 'machine', 'beginner', 3, '12-15', 2, 'Hamstring isolation'),
('Glute Ham Raise', '["hamstrings","glutes"]', 'bodyweight', 'advanced', 3, '8-10', 2, 'Advanced hamstring'),
('Hip Thrust', '["glutes","hamstrings"]', 'barbell', 'intermediate', 4, '8-10', 2, 'Glute builder'),
('Cable Pull-Through', '["glutes","hamstrings"]', 'cable', 'beginner', 3, '12-15', 2, 'Hip hinge pattern'),
('Good Mornings', '["hamstrings","lower_back","glutes"]', 'barbell', 'intermediate', 3, '10-12', 2, 'Posterior chain'),

-- ============================================================================
-- ARM EXERCISES (BICEPS)
-- ============================================================================

('Barbell Curl', '["biceps"]', 'barbell', 'beginner', 3, '8-10', 2, 'Classic bicep builder'),
('Dumbbell Curl', '["biceps"]', 'dumbbell', 'beginner', 3, '10-12', 2, 'Bicep isolation'),
('Hammer Curl', '["biceps","brachialis"]', 'dumbbell', 'beginner', 3, '10-12', 2, 'Brachialis focus'),
('Preacher Curl', '["biceps"]', 'barbell', 'beginner', 3, '10-12', 2, 'Strict bicep curl'),
('Cable Curl', '["biceps"]', 'cable', 'beginner', 3, '12-15', 2, 'Constant tension'),
('Incline Dumbbell Curl', '["biceps"]', 'dumbbell', 'intermediate', 3, '10-12', 2, 'Bicep stretch'),
('Concentration Curl', '["biceps"]', 'dumbbell', 'beginner', 3, '12-15', 2, 'Peak contraction'),

-- ============================================================================
-- ARM EXERCISES (TRICEPS)
-- ============================================================================

('Close-Grip Bench Press', '["triceps","chest"]', 'barbell', 'intermediate', 4, '6-8', 2, 'Compound tricep work'),
('Tricep Dips', '["triceps","chest","front_delts"]', 'bodyweight', 'intermediate', 3, '8-12', 2, 'Bodyweight triceps'),
('Overhead Tricep Extension', '["triceps"]', 'dumbbell', 'beginner', 3, '10-12', 2, 'Long head focus'),
('Tricep Pushdown', '["triceps"]', 'cable', 'beginner', 3, '12-15', 2, 'Tricep isolation'),
('Skull Crushers', '["triceps"]', 'barbell', 'intermediate', 3, '10-12', 2, 'Lying tricep extension'),
('Cable Overhead Extension', '["triceps"]', 'cable', 'beginner', 3, '12-15', 2, 'Long head stretch'),
('Diamond Push-Ups', '["triceps","chest"]', 'bodyweight', 'intermediate', 3, '10-15', 2, 'Tricep push-up variant'),

-- ============================================================================
-- CORE/ABS
-- ============================================================================

('Plank', '["abs","core"]', 'bodyweight', 'beginner', 3, '30-60s', 3, 'Isometric core'),
('Russian Twists', '["abs","obliques"]', 'dumbbell', 'beginner', 3, '20-30', 3, 'Rotational core'),
('Hanging Leg Raise', '["abs","hip_flexors"]', 'bodyweight', 'intermediate', 3, '10-15', 2, 'Lower abs'),
('Cable Crunch', '["abs"]', 'cable', 'beginner', 3, '15-20', 2, 'Loaded ab work'),
('Ab Wheel Rollout', '["abs","core"]', 'bodyweight', 'advanced', 3, '8-12', 2, 'Advanced core'),
('Side Plank', '["obliques","core"]', 'bodyweight', 'beginner', 3, '30-45s', 3, 'Lateral stability'),

-- ============================================================================
-- CALVES
-- ============================================================================

('Standing Calf Raise', '["calves"]', 'machine', 'beginner', 4, '12-15', 2, 'Gastrocnemius focus'),
('Seated Calf Raise', '["calves"]', 'machine', 'beginner', 4, '15-20', 2, 'Soleus focus'),
('Calf Press on Leg Press', '["calves"]', 'machine', 'beginner', 4, '12-15', 2, 'Heavy calf work'),

-- ============================================================================
-- TRAPS
-- ============================================================================

('Barbell Shrugs', '["traps"]', 'barbell', 'beginner', 3, '12-15', 2, 'Upper trap mass'),
('Dumbbell Shrugs', '["traps"]', 'dumbbell', 'beginner', 3, '12-15', 2, 'Greater ROM'),
('Face Pulls', '["traps","rear_delts"]', 'cable', 'beginner', 3, '15-20', 3, 'Upper back health'),

-- ============================================================================
-- FOREARMS
-- ============================================================================

('Wrist Curls', '["forearms"]', 'dumbbell', 'beginner', 3, '15-20', 3, 'Forearm flexors'),
('Reverse Wrist Curls', '["forearms"]', 'dumbbell', 'beginner', 3, '15-20', 3, 'Forearm extensors'),
('Farmers Walk', '["forearms","traps","core"]', 'dumbbell', 'intermediate', 3, '30-60s', 3, 'Grip strength'),

-- ============================================================================
-- COMPOUND/POWERLIFTS
-- ============================================================================

('Conventional Deadlift', '["hamstrings","glutes","lower_back","traps"]', 'barbell', 'advanced', 4, '5-6', 2, 'King of lifts'),
('Sumo Deadlift', '["hamstrings","glutes","quads"]', 'barbell', 'advanced', 4, '5-6', 2, 'Wide stance deadlift'),
('Trap Bar Deadlift', '["quads","hamstrings","glutes","traps"]', 'barbell', 'intermediate', 4, '6-8', 2, 'Safer deadlift variant');
