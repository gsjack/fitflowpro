import { db } from '../database/db.js';
const VOLUME_LANDMARKS = {
    chest: { mev: 8, mav: 14, mrv: 22 },
    back: { mev: 10, mav: 16, mrv: 26 },
    back_lats: { mev: 10, mav: 16, mrv: 26 },
    back_traps: { mev: 6, mav: 12, mrv: 20 },
    shoulders: { mev: 8, mav: 14, mrv: 22 },
    shoulders_front: { mev: 4, mav: 8, mrv: 14 },
    shoulders_side: { mev: 8, mav: 16, mrv: 26 },
    shoulders_rear: { mev: 8, mav: 14, mrv: 22 },
    front_delts: { mev: 4, mav: 8, mrv: 14 },
    side_delts: { mev: 8, mav: 16, mrv: 26 },
    rear_delts: { mev: 8, mav: 14, mrv: 22 },
    biceps: { mev: 6, mav: 12, mrv: 20 },
    triceps: { mev: 6, mav: 12, mrv: 22 },
    quads: { mev: 8, mav: 14, mrv: 24 },
    hamstrings: { mev: 6, mav: 12, mrv: 20 },
    glutes: { mev: 6, mav: 12, mrv: 20 },
    calves: { mev: 8, mav: 14, mrv: 22 },
    abs: { mev: 8, mav: 16, mrv: 28 },
};
function getISOWeekBoundaries(date) {
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(date.getDate() + daysToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];
    if (!weekStart || !weekEnd) {
        throw new Error('Failed to calculate ISO week boundaries');
    }
    return {
        week_start: weekStart,
        week_end: weekEnd,
    };
}
function classifyZone(completedSets, mev, mav, mrv) {
    if (completedSets < mev) {
        return 'below_mev';
    }
    else if (completedSets < mav) {
        return 'adequate';
    }
    else if (completedSets <= mrv) {
        return 'optimal';
    }
    else {
        return 'above_mrv';
    }
}
function classifyZoneWithOnTrack(completedSets, plannedSets, mev, mav, mrv) {
    if (plannedSets >= mav && plannedSets <= mrv && completedSets >= plannedSets * 0.5) {
        return 'on_track';
    }
    if (plannedSets >= mev && plannedSets < mav && completedSets >= plannedSets * 0.5) {
        return 'on_track';
    }
    return classifyZone(completedSets, mev, mav, mrv);
}
function generateWarning(zone, muscleGroup) {
    if (zone === 'below_mev') {
        return `${muscleGroup} volume is below minimum effective volume (MEV). Increase sets for growth.`;
    }
    else if (zone === 'above_mrv') {
        return `${muscleGroup} volume exceeds maximum recoverable volume (MRV). Risk of overtraining.`;
    }
    return null;
}
export function getCurrentWeekVolume(userId) {
    const now = new Date();
    const { week_start, week_end } = getISOWeekBoundaries(now);
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
    const completedResults = completedQuery.all(userId, week_start, week_end);
    const activeProgramQuery = db.prepare(`
    SELECT id FROM programs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
    const activeProgram = activeProgramQuery.get(userId);
    let plannedResults = [];
    if (activeProgram) {
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
        plannedResults = plannedQuery.all(activeProgram.id);
    }
    const muscleGroupMap = new Map();
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
    plannedResults.forEach((row) => {
        const landmarks = VOLUME_LANDMARKS[row.muscle_group] || { mev: 0, mav: 0, mrv: 0 };
        const existing = muscleGroupMap.get(row.muscle_group);
        if (existing) {
            existing.planned_sets = row.planned_sets;
        }
        else {
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
    const muscleGroups = [];
    muscleGroupMap.forEach((mg) => {
        mg.remaining_sets = Math.max(0, mg.planned_sets - mg.completed_sets);
        mg.completion_percentage = mg.planned_sets > 0
            ? Math.round((mg.completed_sets / mg.planned_sets) * 100 * 10) / 10
            : 0;
        mg.zone = classifyZoneWithOnTrack(mg.completed_sets, mg.planned_sets, mg.mev, mg.mav, mg.mrv);
        mg.warning = generateWarning(mg.zone, mg.muscle_group);
        muscleGroups.push(mg);
    });
    muscleGroups.sort((a, b) => a.muscle_group.localeCompare(b.muscle_group));
    return {
        week_start,
        week_end,
        muscle_groups: muscleGroups,
    };
}
export function getVolumeHistory(userId, weeks = 8, muscleGroupFilter) {
    if (weeks < 1 || weeks > 52) {
        throw new Error('Weeks parameter must be between 1 and 52');
    }
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (weeks * 7));
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
    const params = [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]];
    if (muscleGroupFilter) {
        params.push(muscleGroupFilter);
    }
    const results = query.all(...params);
    const weekMap = new Map();
    results.forEach((row) => {
        const date = new Date(row.date);
        const { week_start } = getISOWeekBoundaries(date);
        if (!weekMap.has(week_start)) {
            weekMap.set(week_start, new Map());
        }
        const muscleGroupMap = weekMap.get(week_start);
        const currentSets = muscleGroupMap.get(row.muscle_group) || 0;
        muscleGroupMap.set(row.muscle_group, currentSets + row.completed_sets);
    });
    const weekArray = [];
    weekMap.forEach((muscleGroupMap, week_start) => {
        const muscleGroups = [];
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
        muscleGroups.sort((a, b) => a.muscle_group.localeCompare(b.muscle_group));
        weekArray.push({
            week_start,
            muscle_groups: muscleGroups,
        });
    });
    weekArray.sort((a, b) => a.week_start.localeCompare(b.week_start));
    return {
        weeks: weekArray,
    };
}
export function getProgramVolumeAnalysis(userId) {
    const activeProgramQuery = db.prepare(`
    SELECT id, mesocycle_phase
    FROM programs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
    const activeProgram = activeProgramQuery.get(userId);
    if (!activeProgram) {
        return null;
    }
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
    const results = plannedQuery.all(activeProgram.id);
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
    muscleGroups.sort((a, b) => a.muscle_group.localeCompare(b.muscle_group));
    return {
        program_id: activeProgram.id,
        mesocycle_phase: activeProgram.mesocycle_phase,
        muscle_groups: muscleGroups,
    };
}
//# sourceMappingURL=volumeService.js.map