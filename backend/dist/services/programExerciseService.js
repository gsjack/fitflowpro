import { db } from '../database/db.js';
import { VOLUME_LANDMARKS } from '../utils/constants.js';
export function getProgramExercises(filters = {}) {
    let query = `
    SELECT
      pe.*,
      e.name as exercise_name,
      e.muscle_groups,
      e.equipment
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE 1=1
  `;
    const params = [];
    if (filters.program_day_id !== undefined) {
        query += ' AND pe.program_day_id = ?';
        params.push(filters.program_day_id);
    }
    if (filters.exercise_id !== undefined) {
        query += ' AND pe.exercise_id = ?';
        params.push(filters.exercise_id);
    }
    query += ' ORDER BY pe.order_index';
    const stmt = db.prepare(query);
    return stmt.all(...params);
}
export function createProgramExercise(data) {
    const programDayStmt = db.prepare('SELECT id FROM program_days WHERE id = ?');
    const programDay = programDayStmt.get(data.program_day_id);
    if (!programDay) {
        throw new Error(`Program day with ID ${data.program_day_id} not found`);
    }
    const exerciseStmt = db.prepare('SELECT * FROM exercises WHERE id = ?');
    const exercise = exerciseStmt.get(data.exercise_id);
    if (!exercise) {
        throw new Error(`Exercise with ID ${data.exercise_id} not found`);
    }
    let orderIndex = data.order_index;
    if (orderIndex === undefined) {
        const maxOrderStmt = db.prepare('SELECT MAX(order_index) as max_order FROM program_exercises WHERE program_day_id = ?');
        const result = maxOrderStmt.get(data.program_day_id);
        orderIndex = (result?.max_order ?? 0) + 1;
    }
    const insertStmt = db.prepare(`
    INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    const insertResult = insertStmt.run(data.program_day_id, data.exercise_id, orderIndex, data.target_sets, data.target_rep_range, data.target_rir);
    const programExerciseId = insertResult.lastInsertRowid;
    const volumeWarning = calculateVolumeWarning(data.program_day_id, 'add', data.target_sets, exercise);
    return {
        program_exercise_id: programExerciseId,
        volume_warning: volumeWarning,
    };
}
export function updateProgramExercise(id, data) {
    const checkStmt = db.prepare('SELECT * FROM program_exercises WHERE id = ?');
    const programExercise = checkStmt.get(id);
    if (!programExercise) {
        throw new Error(`Program exercise with ID ${id} not found`);
    }
    const updates = [];
    const params = [];
    if (data.target_sets !== undefined) {
        updates.push('sets = ?');
        params.push(data.target_sets);
    }
    if (data.target_rep_range !== undefined) {
        updates.push('reps = ?');
        params.push(data.target_rep_range);
    }
    if (data.target_rir !== undefined) {
        updates.push('rir = ?');
        params.push(data.target_rir);
    }
    if (updates.length === 0) {
        return { updated: false, volume_warning: null };
    }
    params.push(id);
    const updateStmt = db.prepare(`
    UPDATE program_exercises
    SET ${updates.join(', ')}
    WHERE id = ?
  `);
    updateStmt.run(...params);
    let volumeWarning = null;
    if (data.target_sets !== undefined) {
        const exerciseStmt = db.prepare(`
      SELECT e.* FROM exercises e
      JOIN program_exercises pe ON e.id = pe.exercise_id
      WHERE pe.id = ?
    `);
        const exercise = exerciseStmt.get(id);
        volumeWarning = calculateVolumeWarning(programExercise.program_day_id, 'update', data.target_sets, exercise, programExercise.sets);
    }
    return { updated: true, volume_warning: volumeWarning };
}
export function deleteProgramExercise(id) {
    const stmt = db.prepare(`
    SELECT pe.*, e.muscle_groups
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.id = ?
  `);
    const programExercise = stmt.get(id);
    if (!programExercise) {
        throw new Error(`Program exercise with ID ${id} not found`);
    }
    const volumeWarning = calculateVolumeWarning(programExercise.program_day_id, 'delete', programExercise.sets, programExercise);
    const deleteStmt = db.prepare('DELETE FROM program_exercises WHERE id = ?');
    deleteStmt.run(id);
    return {
        deleted: true,
        volume_warning: volumeWarning,
    };
}
export function swapExercise(programExerciseId, newExerciseId) {
    const programExerciseStmt = db.prepare(`
    SELECT pe.*, e.name as exercise_name, e.muscle_groups
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.id = ?
  `);
    const programExercise = programExerciseStmt.get(programExerciseId);
    if (!programExercise) {
        throw new Error(`Program exercise with ID ${programExerciseId} not found`);
    }
    const newExerciseStmt = db.prepare('SELECT * FROM exercises WHERE id = ?');
    const newExercise = newExerciseStmt.get(newExerciseId);
    if (!newExercise) {
        throw new Error(`Exercise with ID ${newExerciseId} not found`);
    }
    const oldMuscleGroups = JSON.parse(programExercise.muscle_groups);
    const newMuscleGroups = JSON.parse(newExercise.muscle_groups);
    const hasSharedMuscle = oldMuscleGroups.some((mg) => newMuscleGroups.includes(mg));
    if (!hasSharedMuscle) {
        throw new Error(`Exercise "${newExercise.name}" is incompatible with "${programExercise.exercise_name}". ` +
            `Old targets: [${oldMuscleGroups.join(', ')}], New targets: [${newMuscleGroups.join(', ')}]`);
    }
    const updateStmt = db.prepare('UPDATE program_exercises SET exercise_id = ? WHERE id = ?');
    updateStmt.run(newExerciseId, programExerciseId);
    return {
        swapped: true,
        old_exercise_name: programExercise.exercise_name,
        new_exercise_name: newExercise.name,
    };
}
export function reorderExercises(_programDayId, newOrder) {
    const reorder = db.transaction(() => {
        const updateStmt = db.prepare('UPDATE program_exercises SET order_index = ? WHERE id = ?');
        for (const item of newOrder) {
            updateStmt.run(item.new_order_index, item.program_exercise_id);
        }
    });
    reorder();
    return { reordered: true };
}
function calculateVolumeWarning(programDayId, operation, sets, exercise, oldSets) {
    const programStmt = db.prepare(`
    SELECT program_id FROM program_days WHERE id = ?
  `);
    const programDay = programStmt.get(programDayId);
    if (!programDay) {
        return null;
    }
    const programId = programDay.program_id;
    const programDayIdsStmt = db.prepare(`
    SELECT id FROM program_days WHERE program_id = ?
  `);
    const programDayIds = programDayIdsStmt.all(programId).map((row) => row.id);
    const exercisesStmt = db.prepare(`
    SELECT pe.sets, e.muscle_groups
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.program_day_id IN (${programDayIds.map(() => '?').join(',')})
  `);
    const allExercises = exercisesStmt.all(...programDayIds);
    const muscleGroups = JSON.parse(exercise.muscle_groups);
    const muscleVolume = {};
    for (const ex of allExercises) {
        const exMuscleGroups = JSON.parse(ex.muscle_groups);
        for (const mg of exMuscleGroups) {
            muscleVolume[mg] = (muscleVolume[mg] || 0) + ex.sets;
        }
    }
    let deltaMultiplier = 1;
    if (operation === 'add') {
        deltaMultiplier = 1;
    }
    else if (operation === 'delete') {
        deltaMultiplier = -1;
    }
    else if (operation === 'update' && oldSets !== undefined) {
        const netChange = sets - oldSets;
        for (const mg of muscleGroups) {
            muscleVolume[mg] = (muscleVolume[mg] || 0) + netChange;
        }
        return checkVolumeThresholds(muscleVolume, muscleGroups, sets, operation);
    }
    for (const mg of muscleGroups) {
        muscleVolume[mg] = (muscleVolume[mg] || 0) + sets * deltaMultiplier;
    }
    return checkVolumeThresholds(muscleVolume, muscleGroups, sets, operation);
}
function checkVolumeThresholds(muscleVolume, muscleGroups, _sets, operation) {
    const warnings = [];
    for (const mg of muscleGroups) {
        const currentVolume = muscleVolume[mg] || 0;
        const landmarks = VOLUME_LANDMARKS[mg];
        if (!landmarks) {
            continue;
        }
        if (operation === 'add' || operation === 'update') {
            if (currentVolume > landmarks.mrv) {
                warnings.push(`Adding this exercise will exceed MRV for ${mg} (${currentVolume} > ${landmarks.mrv})`);
            }
        }
        else if (operation === 'delete') {
            if (currentVolume < landmarks.mev) {
                warnings.push(`Removing this exercise will drop below MEV for ${mg} (${currentVolume} < ${landmarks.mev})`);
            }
        }
    }
    return warnings.length > 0 ? warnings.join('; ') : null;
}
//# sourceMappingURL=programExerciseService.js.map