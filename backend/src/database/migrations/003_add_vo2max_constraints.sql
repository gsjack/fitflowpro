-- Migration 003: Add VO2max table constraints
-- Created: 2025-10-03
-- Purpose: Add physiological validation constraints to vo2max_sessions table

-- ============================================================================
-- IMPORTANT: SQLite Constraint Limitations
-- ============================================================================
-- SQLite does NOT support ALTER TABLE ADD CONSTRAINT after table creation.
-- Options:
--   1. Drop and recreate table (requires data migration)
--   2. Use triggers to enforce constraints
--   3. Document constraints for new installations
--
-- This migration uses Option 2 (triggers) for existing databases
-- Option 3 is documented in schema.sql for fresh installations
-- ============================================================================

-- ============================================================================
-- Constraint Documentation (for schema.sql update)
-- ============================================================================

-- Add these CHECK constraints to schema.sql for new installations:
/*
CREATE TABLE IF NOT EXISTS vo2max_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  protocol TEXT NOT NULL CHECK(protocol IN ('4x4', 'zone2')),
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes >= 10 AND duration_minutes <= 120),
  intervals_completed INTEGER,
  average_heart_rate INTEGER CHECK(average_heart_rate >= 60 AND average_heart_rate <= 220),
  peak_heart_rate INTEGER CHECK(peak_heart_rate >= 60 AND peak_heart_rate <= 220),
  estimated_vo2max REAL CHECK(estimated_vo2max >= 20.0 AND estimated_vo2max <= 80.0),
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_id) REFERENCES workouts(id)
);
*/

-- ============================================================================
-- Trigger-Based Constraint Enforcement (for existing databases)
-- ============================================================================

-- Note: Current schema uses duration_seconds, not duration_minutes
-- Adjusted constraints to match existing column names

-- Trigger 1: Validate heart rate ranges on INSERT
CREATE TRIGGER IF NOT EXISTS validate_vo2max_hr_insert
BEFORE INSERT ON vo2max_sessions
FOR EACH ROW
WHEN NEW.average_hr IS NOT NULL AND (NEW.average_hr < 60 OR NEW.average_hr > 220)
BEGIN
  SELECT RAISE(ABORT, 'average_hr must be between 60 and 220 bpm');
END;

-- Trigger 2: Validate peak heart rate on INSERT
CREATE TRIGGER IF NOT EXISTS validate_vo2max_peak_hr_insert
BEFORE INSERT ON vo2max_sessions
FOR EACH ROW
WHEN NEW.peak_hr IS NOT NULL AND (NEW.peak_hr < 60 OR NEW.peak_hr > 220)
BEGIN
  SELECT RAISE(ABORT, 'peak_hr must be between 60 and 220 bpm');
END;

-- Trigger 3: Validate estimated VO2max on INSERT
CREATE TRIGGER IF NOT EXISTS validate_vo2max_estimate_insert
BEFORE INSERT ON vo2max_sessions
FOR EACH ROW
WHEN NEW.estimated_vo2max IS NOT NULL AND (NEW.estimated_vo2max < 20.0 OR NEW.estimated_vo2max > 80.0)
BEGIN
  SELECT RAISE(ABORT, 'estimated_vo2max must be between 20.0 and 80.0 ml/kg/min');
END;

-- Trigger 4: Validate duration on INSERT (convert seconds to minutes: 600s = 10min, 7200s = 120min)
CREATE TRIGGER IF NOT EXISTS validate_vo2max_duration_insert
BEFORE INSERT ON vo2max_sessions
FOR EACH ROW
WHEN NEW.duration_seconds < 600 OR NEW.duration_seconds > 7200
BEGIN
  SELECT RAISE(ABORT, 'duration_seconds must be between 600 (10 min) and 7200 (120 min)');
END;

-- Trigger 5: Validate heart rate ranges on UPDATE
CREATE TRIGGER IF NOT EXISTS validate_vo2max_hr_update
BEFORE UPDATE ON vo2max_sessions
FOR EACH ROW
WHEN NEW.average_hr IS NOT NULL AND (NEW.average_hr < 60 OR NEW.average_hr > 220)
BEGIN
  SELECT RAISE(ABORT, 'average_hr must be between 60 and 220 bpm');
END;

-- Trigger 6: Validate peak heart rate on UPDATE
CREATE TRIGGER IF NOT EXISTS validate_vo2max_peak_hr_update
BEFORE UPDATE ON vo2max_sessions
FOR EACH ROW
WHEN NEW.peak_hr IS NOT NULL AND (NEW.peak_hr < 60 OR NEW.peak_hr > 220)
BEGIN
  SELECT RAISE(ABORT, 'peak_hr must be between 60 and 220 bpm');
END;

-- Trigger 7: Validate estimated VO2max on UPDATE
CREATE TRIGGER IF NOT EXISTS validate_vo2max_estimate_update
BEFORE UPDATE ON vo2max_sessions
FOR EACH ROW
WHEN NEW.estimated_vo2max IS NOT NULL AND (NEW.estimated_vo2max < 20.0 OR NEW.estimated_vo2max > 80.0)
BEGIN
  SELECT RAISE(ABORT, 'estimated_vo2max must be between 20.0 and 80.0 ml/kg/min');
END;

-- Trigger 8: Validate duration on UPDATE
CREATE TRIGGER IF NOT EXISTS validate_vo2max_duration_update
BEFORE UPDATE ON vo2max_sessions
FOR EACH ROW
WHEN NEW.duration_seconds < 600 OR NEW.duration_seconds > 7200
BEGIN
  SELECT RAISE(ABORT, 'duration_seconds must be between 600 (10 min) and 7200 (120 min)');
END;

-- ============================================================================
-- Verification Queries (Run these after migration)
-- ============================================================================

-- List all triggers on vo2max_sessions table:
-- SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name='vo2max_sessions';

-- Test constraint enforcement (should fail):
-- INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, average_hr)
-- VALUES (1, '4x4', 1200, 250);  -- average_hr=250 exceeds limit

-- Test constraint enforcement (should succeed):
-- INSERT INTO vo2max_sessions (workout_id, protocol, duration_seconds, average_hr)
-- VALUES (1, '4x4', 1200, 165);  -- valid HR
