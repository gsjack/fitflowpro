-- Migration: Add video_url column to exercises table
-- Purpose: Enable exercise video demonstrations for user safety and form guidance
-- Created: 2025-10-04

-- Add video_url column (nullable - not all exercises have videos initially)
ALTER TABLE exercises ADD COLUMN video_url TEXT;
