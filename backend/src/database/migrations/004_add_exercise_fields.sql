-- Migration 004: Add movement_pattern and restructure muscle_groups
-- Created: 2025-10-03
-- Purpose: Support exercise filtering by movement pattern and primary/secondary muscle groups

-- Add movement_pattern column
ALTER TABLE exercises ADD COLUMN movement_pattern TEXT CHECK(movement_pattern IN ('compound', 'isolation'));

-- Add primary_muscle_group column
ALTER TABLE exercises ADD COLUMN primary_muscle_group TEXT;

-- Add secondary_muscle_groups column (JSON array)
ALTER TABLE exercises ADD COLUMN secondary_muscle_groups TEXT;

-- Add description column for detailed exercise info
ALTER TABLE exercises ADD COLUMN description TEXT;

-- Update existing exercises to populate new fields
-- Movement pattern: Exercises with 2+ muscle groups are compound, others are isolation
UPDATE exercises
SET movement_pattern = CASE
  WHEN json_array_length(muscle_groups) >= 2 THEN 'compound'
  ELSE 'isolation'
END;

-- Primary muscle group: First element of muscle_groups array
UPDATE exercises
SET primary_muscle_group = json_extract(muscle_groups, '$[0]');

-- Secondary muscle groups: We'll populate this via application logic
-- SQLite doesn't support array slicing in JSON, so we'll handle this in the service
UPDATE exercises
SET secondary_muscle_groups = '[]';

-- Add description based on notes column
UPDATE exercises
SET description = COALESCE(notes, 'No description available');

-- Create index for movement_pattern
CREATE INDEX IF NOT EXISTS idx_exercises_movement_pattern ON exercises(movement_pattern);

-- Create index for primary_muscle_group
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle_group ON exercises(primary_muscle_group);
