/**
 * Volume Analytics Service (T041-T045)
 *
 * Provides volume analytics:
 * - Current week volume tracking (completed + planned)
 * - Volume history over multiple weeks
 * - Zone classification (below_mev, adequate, optimal, above_mrv)
 */

import { db } from '../database/db.js';

/**
 * Volume landmarks for muscle groups (from Renaissance Periodization)
 */
const VOLUME_LANDMARKS: Record<string, { mev: number; mav: number; mrv: number }> = {
  // Primary muscle groups
  chest: { mev: 8, mav: 14, mrv: 22 },
  biceps: { mev: 6, mav: 12, mrv: 20 },
  triceps: { mev: 6, mav: 12, mrv: 22 },
  quads: { mev: 8, mav: 14, mrv: 24 },
  hamstrings: { mev: 6, mav: 12, mrv: 20 },
  glutes: { mev: 6, mav: 12, mrv: 20 },
  calves: { mev: 8, mav: 14, mrv: 22 },
  abs: { mev: 8, mav: 16, mrv: 28 },

  // Back muscles (database uses lats, traps, mid_back, lower_back)
  lats: { mev: 10, mav: 16, mrv: 26 },
  traps: { mev: 6, mav: 12, mrv: 20 },
  mid_back: { mev: 10, mav: 16, mrv: 26 },
  lower_back: { mev: 6, mav: 12, mrv: 20 },

  // Shoulder muscles (database uses front_delts, side_delts, rear_delts)
  front_delts: { mev: 4, mav: 8, mrv: 14 },
  side_delts: { mev: 8, mav: 16, mrv: 26 },
  rear_delts: { mev: 8, mav: 14, mrv: 22 },

  // Supporting muscles
  core: { mev: 8, mav: 16, mrv: 28 },
  obliques: { mev: 6, mav: 12, mrv: 20 },
  forearms: { mev: 4, mav: 8, mrv: 16 },
  brachialis: { mev: 4, mav: 8, mrv: 14 },
  hip_flexors: { mev: 4, mav: 8, mrv: 14 },

  // Legacy/compatibility names (may not be in database)
  back: { mev: 10, mav: 16, mrv: 26 },
  shoulders: { mev: 8, mav: 14, mrv: 22 },
};

/**
 * Muscle group volume tracking data
 */
export interface MuscleGroupVolumeTracking {
  muscle_group: string;
  completed_sets: number;
  planned_sets: number;
  remaining_sets: number;
  mev: number;
  mav: number;
  mrv: number;
  completion_percentage: number;
  zone: 'below_mev' | 'adequate' | 'optimal' | 'above_mrv' | 'on_track';
  warning: string | null;
}

/**
 * Current week volume response
 */
export interface CurrentWeekVolume {
  week_start: string;
  week_end: string;
  muscle_groups: MuscleGroupVolumeTracking[];
}

/**
 * Historical volume data point
 */
export interface HistoricalVolume {
  muscle_group: string;
  completed_sets: number;
  mev: number;
  mav: number;
  mrv: number;
}

/**
 * Volume trends response (historical)
 */
export interface VolumeTrendsResponse {
  weeks: Array<{
    week_start: string;
    muscle_groups: HistoricalVolume[];
  }>;
}

/**
 * Program volume analysis data
 */
export interface ProgramVolumeAnalysis {
  program_id: number;
  mesocycle_phase: 'mev' | 'mav' | 'mrv' | 'deload';
  muscle_groups: Array<{
    muscle_group: string;
    planned_weekly_sets: number;
    mev: number;
    mav: number;
    mrv: number;
    zone: 'below_mev' | 'adequate' | 'optimal' | 'above_mrv';
    warning: string | null;
  }>;
}

/**
 * Get ISO week boundaries (Monday to Sunday) for a given date
 */
function getISOWeekBoundaries(date: Date): { week_start: string; week_end: string } {
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = date.getDay();

  // Calculate Monday of the week (ISO week starts on Monday)
  const monday = new Date(date);
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
  monday.setDate(date.getDate() + daysToMonday);

  // Calculate Sunday of the week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = sunday.toISOString().split('T')[0];

  // Ensure non-undefined values
  if (!weekStart || !weekEnd) {
    throw new Error('Failed to calculate ISO week boundaries');
  }

  return {
    week_start: weekStart,
    week_end: weekEnd,
  };
}

/**
 * Classify volume zone based on completed sets
 */
function classifyZone(
  completedSets: number,
  mev: number,
  mav: number,
  mrv: number
): 'below_mev' | 'adequate' | 'optimal' | 'above_mrv' {
  if (completedSets < mev) {
    return 'below_mev';
  } else if (completedSets < mav) {
    return 'adequate';
  } else if (completedSets <= mrv) {
    return 'optimal';
  } else {
    return 'above_mrv';
  }
}

/**
 * Classify zone with on_track for current week tracking
 */
function classifyZoneWithOnTrack(
  completedSets: number,
  plannedSets: number,
  mev: number,
  mav: number,
  mrv: number
): 'below_mev' | 'adequate' | 'optimal' | 'above_mrv' | 'on_track' {
  // If planned sets are in optimal range and completion >= 50%, mark as on_track
  if (plannedSets >= mav && plannedSets <= mrv && completedSets >= plannedSets * 0.5) {
    return 'on_track';
  }

  // If planned sets are in adequate range and completion >= 50%, mark as on_track
  if (plannedSets >= mev && plannedSets < mav && completedSets >= plannedSets * 0.5) {
    return 'on_track';
  }

  // Otherwise use standard zone classification
  return classifyZone(completedSets, mev, mav, mrv);
}

/**
 * Generate warning message based on zone
 */
function generateWarning(zone: string, muscleGroup: string): string | null {
  if (zone === 'below_mev') {
    return `${muscleGroup} volume is below minimum effective volume (MEV). Increase sets for growth.`;
  } else if (zone === 'above_mrv') {
    return `${muscleGroup} volume exceeds maximum recoverable volume (MRV). Risk of overtraining.`;
  }
  return null;
}

/**
 * Get current week volume tracking (T017)
 *
 * Calculates:
 * - Completed sets from workouts with status='completed' in current ISO week
 * - Planned sets from program_exercises for all program_days in current week
 * - Zone classification based on completed sets
 * - Full set counting: Each set counts fully toward ALL muscle groups
 *
 * @param userId User ID
 * @returns Current week volume data with zone classification
 */
export function getCurrentWeekVolume(userId: number): CurrentWeekVolume {
  const now = new Date();
  const { week_start, week_end } = getISOWeekBoundaries(now);

  // Query completed sets grouped by muscle group for current week
  const completedQuery = db.prepare(`
    SELECT
      mg.value as muscle_group,
      COUNT(s.id) as completed_sets
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    JOIN exercises e ON s.exercise_id = e.id
    JOIN json_each(e.muscle_groups) mg
    WHERE w.user_id = ?
      AND w.status = 'completed'
      AND w.date >= ?
      AND w.date <= ?
    GROUP BY mg.value
  `);

  const completedResults = completedQuery.all(userId, week_start, week_end) as Array<{
    muscle_group: string;
    completed_sets: number;
  }>;

  // Query planned sets from active program for current week
  // Get active program first
  const activeProgramQuery = db.prepare(`
    SELECT id FROM programs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const activeProgram = activeProgramQuery.get(userId) as { id: number } | undefined;

  let plannedResults: Array<{ muscle_group: string; planned_sets: number }> = [];

  if (activeProgram) {
    // Calculate day of week for current week (1-7, Monday = 1)
    // Get all program days for this week and sum their planned sets
    const plannedQuery = db.prepare(`
      SELECT
        mg.value as muscle_group,
        SUM(pe.sets) as planned_sets
      FROM program_exercises pe
      JOIN program_days pd ON pe.program_day_id = pd.id
      JOIN exercises e ON pe.exercise_id = e.id
      JOIN json_each(e.muscle_groups) mg
      WHERE pd.program_id = ?
      GROUP BY mg.value
    `);

    plannedResults = plannedQuery.all(activeProgram.id) as Array<{
      muscle_group: string;
      planned_sets: number;
    }>;
  }

  // Merge completed and planned data
  const muscleGroupMap = new Map<string, MuscleGroupVolumeTracking>();

  // Process completed sets
  completedResults.forEach((row) => {
    const landmarks = VOLUME_LANDMARKS[row.muscle_group] || { mev: 0, mav: 0, mrv: 0 };
    muscleGroupMap.set(row.muscle_group, {
      muscle_group: row.muscle_group,
      completed_sets: row.completed_sets,
      planned_sets: 0,
      remaining_sets: 0,
      mev: landmarks.mev,
      mav: landmarks.mav,
      mrv: landmarks.mrv,
      completion_percentage: 0,
      zone: 'below_mev',
      warning: null,
    });
  });

  // Process planned sets
  plannedResults.forEach((row) => {
    const landmarks = VOLUME_LANDMARKS[row.muscle_group] || { mev: 0, mav: 0, mrv: 0 };
    const existing = muscleGroupMap.get(row.muscle_group);

    if (existing) {
      existing.planned_sets = row.planned_sets;
    } else {
      muscleGroupMap.set(row.muscle_group, {
        muscle_group: row.muscle_group,
        completed_sets: 0,
        planned_sets: row.planned_sets,
        remaining_sets: 0,
        mev: landmarks.mev,
        mav: landmarks.mav,
        mrv: landmarks.mrv,
        completion_percentage: 0,
        zone: 'below_mev',
        warning: null,
      });
    }
  });

  // Calculate derived fields and classify zones
  const muscleGroups: MuscleGroupVolumeTracking[] = [];
  muscleGroupMap.forEach((mg) => {
    mg.remaining_sets = Math.max(0, mg.planned_sets - mg.completed_sets);
    mg.completion_percentage =
      mg.planned_sets > 0 ? Math.round((mg.completed_sets / mg.planned_sets) * 100 * 10) / 10 : 0;

    mg.zone = classifyZoneWithOnTrack(mg.completed_sets, mg.planned_sets, mg.mev, mg.mav, mg.mrv);

    mg.warning = generateWarning(mg.zone, mg.muscle_group);

    muscleGroups.push(mg);
  });

  // Sort by muscle group name
  muscleGroups.sort((a, b) => a.muscle_group.localeCompare(b.muscle_group));

  return {
    week_start,
    week_end,
    muscle_groups: muscleGroups,
  };
}

/**
 * Get volume history over multiple weeks (T018)
 *
 * @param userId User ID
 * @param weeks Number of weeks to retrieve (default: 8, max: 52)
 * @param muscleGroupFilter Optional muscle group filter
 * @returns Historical volume data grouped by week
 */
export function getVolumeHistory(
  userId: number,
  weeks: number = 8,
  muscleGroupFilter?: string
): VolumeTrendsResponse {
  // Validate weeks parameter
  if (weeks < 1 || weeks > 52) {
    throw new Error('Weeks parameter must be between 1 and 52');
  }

  // Calculate start date (weeks ago from today)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - weeks * 7);

  // Query volume by week
  const query = db.prepare(`
    SELECT
      w.date,
      mg.value as muscle_group,
      COUNT(s.id) as completed_sets
    FROM sets s
    JOIN workouts w ON s.workout_id = w.id
    JOIN exercises e ON s.exercise_id = e.id
    JOIN json_each(e.muscle_groups) mg
    WHERE w.user_id = ?
      AND w.status = 'completed'
      AND w.date >= ?
      AND w.date <= ?
      ${muscleGroupFilter ? 'AND mg.value = ?' : ''}
    GROUP BY w.date, mg.value
    ORDER BY w.date
  `);

  const params = [
    userId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0],
  ];
  if (muscleGroupFilter) {
    params.push(muscleGroupFilter);
  }

  const results = query.all(...params) as Array<{
    date: string;
    muscle_group: string;
    completed_sets: number;
  }>;

  // Group by week
  const weekMap = new Map<string, Map<string, number>>();

  results.forEach((row) => {
    const date = new Date(row.date);
    const { week_start } = getISOWeekBoundaries(date);

    if (!weekMap.has(week_start)) {
      weekMap.set(week_start, new Map());
    }

    const muscleGroupMap = weekMap.get(week_start)!;
    const currentSets = muscleGroupMap.get(row.muscle_group) || 0;
    muscleGroupMap.set(row.muscle_group, currentSets + row.completed_sets);
  });

  // Convert to response format
  const weekArray: Array<{
    week_start: string;
    muscle_groups: HistoricalVolume[];
  }> = [];

  weekMap.forEach((muscleGroupMap, week_start) => {
    const muscleGroups: HistoricalVolume[] = [];

    muscleGroupMap.forEach((completed_sets, muscle_group) => {
      const landmarks = VOLUME_LANDMARKS[muscle_group] || { mev: 0, mav: 0, mrv: 0 };
      muscleGroups.push({
        muscle_group,
        completed_sets,
        mev: landmarks.mev,
        mav: landmarks.mav,
        mrv: landmarks.mrv,
      });
    });

    // Sort muscle groups alphabetically
    muscleGroups.sort((a, b) => a.muscle_group.localeCompare(b.muscle_group));

    weekArray.push({
      week_start,
      muscle_groups: muscleGroups,
    });
  });

  // Sort weeks chronologically (oldest first)
  weekArray.sort((a, b) => a.week_start.localeCompare(b.week_start));

  return {
    weeks: weekArray,
  };
}

/**
 * Get program volume analysis (T019)
 *
 * Analyzes planned volume for the active program and classifies zones.
 *
 * @param userId User ID
 * @returns Program volume analysis or null if no active program
 */
export function getProgramVolumeAnalysis(userId: number): ProgramVolumeAnalysis | null {
  // Get active program
  const activeProgramQuery = db.prepare(`
    SELECT id, mesocycle_phase
    FROM programs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const activeProgram = activeProgramQuery.get(userId) as
    | { id: number; mesocycle_phase: 'mev' | 'mav' | 'mrv' | 'deload' }
    | undefined;

  if (!activeProgram) {
    return null;
  }

  // Query planned weekly sets by muscle group
  const plannedQuery = db.prepare(`
    SELECT
      mg.value as muscle_group,
      SUM(pe.sets) as planned_weekly_sets
    FROM program_exercises pe
    JOIN program_days pd ON pe.program_day_id = pd.id
    JOIN exercises e ON pe.exercise_id = e.id
    JOIN json_each(e.muscle_groups) mg
    WHERE pd.program_id = ?
    GROUP BY mg.value
  `);

  const results = plannedQuery.all(activeProgram.id) as Array<{
    muscle_group: string;
    planned_weekly_sets: number;
  }>;

  // Classify zones
  const muscleGroups = results.map((row) => {
    const landmarks = VOLUME_LANDMARKS[row.muscle_group] || { mev: 0, mav: 0, mrv: 0 };
    const zone = classifyZone(row.planned_weekly_sets, landmarks.mev, landmarks.mav, landmarks.mrv);

    return {
      muscle_group: row.muscle_group,
      planned_weekly_sets: row.planned_weekly_sets,
      mev: landmarks.mev,
      mav: landmarks.mav,
      mrv: landmarks.mrv,
      zone,
      warning: generateWarning(zone, row.muscle_group),
    };
  });

  // Sort by muscle group name
  muscleGroups.sort((a, b) => a.muscle_group.localeCompare(b.muscle_group));

  return {
    program_id: activeProgram.id,
    mesocycle_phase: activeProgram.mesocycle_phase,
    muscle_groups: muscleGroups,
  };
}
