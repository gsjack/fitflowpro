/**
 * Program Exercise Service (T034-T038)
 *
 * Handles CRUD operations for program exercises with volume validation.
 * Provides exercise swapping, reordering, and MEV/MAV/MRV volume warnings.
 */

import { db } from '../database/db.js';
import { VOLUME_LANDMARKS } from '../utils/constants.js';

/**
 * Program Exercise Data
 */
export interface ProgramExercise {
  id: number;
  program_day_id: number;
  exercise_id: number;
  order_index: number;
  sets: number;
  reps: string;
  rir: number;
}

/**
 * Program exercise with exercise details
 */
export interface ProgramExerciseWithDetails extends ProgramExercise {
  exercise_name: string;
  muscle_groups: string;
  equipment: string;
}

/**
 * Filters for getting program exercises
 */
export interface ProgramExerciseFilters {
  program_day_id?: number;
  exercise_id?: number;
}

/**
 * Data for creating a program exercise
 */
export interface CreateProgramExerciseData {
  program_day_id: number;
  exercise_id: number;
  target_sets: number;
  target_rep_range: string;
  target_rir: number;
  order_index?: number;
}

/**
 * Data for updating a program exercise
 */
export interface UpdateProgramExerciseData {
  target_sets?: number;
  target_rep_range?: string;
  target_rir?: number;
}

/**
 * Exercise reorder item
 */
export interface ExerciseReorderItem {
  program_exercise_id: number;
  new_order_index: number;
}

/**
 * Get program exercises with optional filters
 *
 * @param filters - Optional filters (program_day_id or exercise_id)
 * @returns Array of program exercises with exercise details
 */
export function getProgramExercises(
  filters: ProgramExerciseFilters = {}
): ProgramExerciseWithDetails[] {
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

  const params: number[] = [];

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
  return stmt.all(...params) as ProgramExerciseWithDetails[];
}

/**
 * Create a new program exercise with volume warning
 *
 * @param data - Program exercise data
 * @returns Object with program_exercise_id and optional volume_warning
 * @throws Error if program_day_id or exercise_id doesn't exist
 */
export function createProgramExercise(data: CreateProgramExerciseData): {
  program_exercise_id: number;
  volume_warning: string | null;
} {
  // Validate program_day_id exists
  const programDayStmt = db.prepare('SELECT id FROM program_days WHERE id = ?');
  const programDay = programDayStmt.get(data.program_day_id);
  if (!programDay) {
    throw new Error(`Program day with ID ${data.program_day_id} not found`);
  }

  // Validate exercise_id exists
  const exerciseStmt = db.prepare('SELECT * FROM exercises WHERE id = ?');
  const exercise = exerciseStmt.get(data.exercise_id) as any;
  if (!exercise) {
    throw new Error(`Exercise with ID ${data.exercise_id} not found`);
  }

  // Determine order_index if not provided
  let orderIndex = data.order_index;
  if (orderIndex === undefined) {
    const maxOrderStmt = db.prepare(
      'SELECT MAX(order_index) as max_order FROM program_exercises WHERE program_day_id = ?'
    );
    const result = maxOrderStmt.get(data.program_day_id) as any;
    orderIndex = (result?.max_order ?? 0) + 1;
  }

  // Insert program exercise
  const insertStmt = db.prepare(`
    INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertResult = insertStmt.run(
    data.program_day_id,
    data.exercise_id,
    orderIndex,
    data.target_sets,
    data.target_rep_range,
    data.target_rir
  );

  const programExerciseId = insertResult.lastInsertRowid as number;

  // Calculate volume warning
  const volumeWarning = calculateVolumeWarning(
    data.program_day_id,
    'add',
    data.target_sets,
    exercise
  );

  return {
    program_exercise_id: programExerciseId,
    volume_warning: volumeWarning,
  };
}

/**
 * Update a program exercise
 *
 * @param id - Program exercise ID
 * @param data - Update data (target_sets, target_rep_range, target_rir)
 * @returns Object with updated=true and optional volume_warning
 * @throws Error if program exercise doesn't exist
 */
export function updateProgramExercise(
  id: number,
  data: UpdateProgramExerciseData
): { updated: boolean; volume_warning: string | null } {
  // Check if program exercise exists
  const checkStmt = db.prepare('SELECT * FROM program_exercises WHERE id = ?');
  const programExercise = checkStmt.get(id) as ProgramExercise | undefined;
  if (!programExercise) {
    throw new Error(`Program exercise with ID ${id} not found`);
  }

  // Build dynamic update query
  const updates: string[] = [];
  const params: (string | number)[] = [];

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
    // No updates to perform
    return { updated: false, volume_warning: null };
  }

  params.push(id);

  const updateStmt = db.prepare(`
    UPDATE program_exercises
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  updateStmt.run(...params);

  // Calculate volume warning if sets changed
  let volumeWarning: string | null = null;
  if (data.target_sets !== undefined) {
    const exerciseStmt = db.prepare(`
      SELECT e.* FROM exercises e
      JOIN program_exercises pe ON e.id = pe.exercise_id
      WHERE pe.id = ?
    `);
    const exercise = exerciseStmt.get(id) as any;

    volumeWarning = calculateVolumeWarning(
      programExercise.program_day_id,
      'update',
      data.target_sets,
      exercise,
      programExercise.sets
    );
  }

  return { updated: true, volume_warning: volumeWarning };
}

/**
 * Delete a program exercise
 *
 * @param id - Program exercise ID
 * @returns Object with deleted=true and optional volume_warning
 * @throws Error if program exercise doesn't exist
 */
export function deleteProgramExercise(id: number): {
  deleted: boolean;
  volume_warning: string | null;
} {
  // Get program exercise details before deletion
  const stmt = db.prepare(`
    SELECT pe.*, e.muscle_groups
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.id = ?
  `);
  const programExercise = stmt.get(id) as any;

  if (!programExercise) {
    throw new Error(`Program exercise with ID ${id} not found`);
  }

  // Calculate volume warning before deletion
  const volumeWarning = calculateVolumeWarning(
    programExercise.program_day_id,
    'delete',
    programExercise.sets,
    programExercise
  );

  // Delete the program exercise
  const deleteStmt = db.prepare('DELETE FROM program_exercises WHERE id = ?');
  deleteStmt.run(id);

  return {
    deleted: true,
    volume_warning: volumeWarning,
  };
}

/**
 * Swap an exercise with a compatible alternative
 *
 * @param programExerciseId - Program exercise ID to swap
 * @param newExerciseId - New exercise ID
 * @returns Object with swapped=true, old_exercise_name, new_exercise_name
 * @throws Error if exercises are incompatible or don't exist
 */
export function swapExercise(
  programExerciseId: number,
  newExerciseId: number
): {
  swapped: boolean;
  old_exercise_name: string;
  new_exercise_name: string;
} {
  // Get current program exercise
  const programExerciseStmt = db.prepare(`
    SELECT pe.*, e.name as exercise_name, e.muscle_groups
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.id = ?
  `);
  const programExercise = programExerciseStmt.get(programExerciseId) as any;

  if (!programExercise) {
    throw new Error(`Program exercise with ID ${programExerciseId} not found`);
  }

  // Get new exercise
  const newExerciseStmt = db.prepare('SELECT * FROM exercises WHERE id = ?');
  const newExercise = newExerciseStmt.get(newExerciseId) as any;

  if (!newExercise) {
    throw new Error(`Exercise with ID ${newExerciseId} not found`);
  }

  // Check compatibility (at least one shared muscle group)
  const oldMuscleGroups = JSON.parse(programExercise.muscle_groups) as string[];
  const newMuscleGroups = JSON.parse(newExercise.muscle_groups) as string[];

  const hasSharedMuscle = oldMuscleGroups.some((mg) => newMuscleGroups.includes(mg));

  if (!hasSharedMuscle) {
    throw new Error(
      `Exercise "${newExercise.name}" is incompatible with "${programExercise.exercise_name}". ` +
        `Old targets: [${oldMuscleGroups.join(', ')}], New targets: [${newMuscleGroups.join(', ')}]`
    );
  }

  // Perform swap (preserve order_index, sets, reps, rir)
  const updateStmt = db.prepare('UPDATE program_exercises SET exercise_id = ? WHERE id = ?');
  updateStmt.run(newExerciseId, programExerciseId);

  return {
    swapped: true,
    old_exercise_name: programExercise.exercise_name,
    new_exercise_name: newExercise.name,
  };
}

/**
 * Reorder exercises within a program day
 *
 * @param programDayId - Program day ID
 * @param newOrder - Array of {program_exercise_id, new_order_index}
 * @returns Object with reordered=true
 */
export function reorderExercises(
  _programDayId: number,
  newOrder: ExerciseReorderItem[]
): { reordered: boolean } {
  // Execute as transaction for atomicity
  const reorder = db.transaction(() => {
    const updateStmt = db.prepare('UPDATE program_exercises SET order_index = ? WHERE id = ?');

    for (const item of newOrder) {
      updateStmt.run(item.new_order_index, item.program_exercise_id);
    }
  });

  reorder();

  return { reordered: true };
}

/**
 * Calculate volume warning when adding/updating/deleting exercises
 *
 * @param programDayId - Program day ID
 * @param operation - 'add', 'update', or 'delete'
 * @param sets - Number of sets being added/removed
 * @param exercise - Exercise data with muscle_groups
 * @param oldSets - Previous sets count (for update operation)
 * @returns Volume warning message or null
 */
function calculateVolumeWarning(
  programDayId: number,
  operation: 'add' | 'update' | 'delete',
  sets: number,
  exercise: { muscle_groups: string },
  oldSets?: number
): string | null {
  // Get program_id from program_day_id
  const programStmt = db.prepare(`
    SELECT program_id FROM program_days WHERE id = ?
  `);
  const programDay = programStmt.get(programDayId) as any;
  if (!programDay) {
    return null;
  }

  const programId = programDay.program_id;

  // Get all program days for this program
  const programDayIdsStmt = db.prepare(`
    SELECT id FROM program_days WHERE program_id = ?
  `);
  const programDayIds = (programDayIdsStmt.all(programId) as any[]).map((row) => row.id);

  // Get all exercises across all program days
  const exercisesStmt = db.prepare(`
    SELECT pe.sets, e.muscle_groups
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.program_day_id IN (${programDayIds.map(() => '?').join(',')})
  `);
  const allExercises = exercisesStmt.all(...programDayIds) as any[];

  // Parse muscle groups from exercise being added/updated/deleted
  const muscleGroups = JSON.parse(exercise.muscle_groups) as string[];

  // Calculate current weekly volume per muscle group
  const muscleVolume: Record<string, number> = {};

  for (const ex of allExercises) {
    const exMuscleGroups = JSON.parse(ex.muscle_groups) as string[];
    for (const mg of exMuscleGroups) {
      muscleVolume[mg] = (muscleVolume[mg] || 0) + ex.sets;
    }
  }

  // Apply operation delta
  let deltaMultiplier = 1;
  if (operation === 'add') {
    deltaMultiplier = 1; // Add sets
  } else if (operation === 'delete') {
    deltaMultiplier = -1; // Subtract sets
  } else if (operation === 'update' && oldSets !== undefined) {
    // Calculate net change
    const netChange = sets - oldSets;
    for (const mg of muscleGroups) {
      muscleVolume[mg] = (muscleVolume[mg] || 0) + netChange;
    }
    return checkVolumeThresholds(muscleVolume, muscleGroups, sets, operation);
  }

  // Apply delta for add/delete
  for (const mg of muscleGroups) {
    muscleVolume[mg] = (muscleVolume[mg] || 0) + sets * deltaMultiplier;
  }

  return checkVolumeThresholds(muscleVolume, muscleGroups, sets, operation);
}

/**
 * Check volume against MEV/MAV/MRV thresholds
 *
 * @param muscleVolume - Current weekly volume per muscle group
 * @param muscleGroups - Muscle groups affected by operation
 * @param sets - Sets being added/removed
 * @param operation - 'add', 'update', or 'delete'
 * @returns Warning message or null
 */
function checkVolumeThresholds(
  muscleVolume: Record<string, number>,
  muscleGroups: string[],
  _sets: number,
  operation: 'add' | 'update' | 'delete'
): string | null {
  const warnings: string[] = [];

  for (const mg of muscleGroups) {
    const currentVolume = muscleVolume[mg] || 0;
    const landmarks = VOLUME_LANDMARKS[mg];

    if (!landmarks) {
      continue; // Skip if no landmarks defined for this muscle group
    }

    if (operation === 'add' || operation === 'update') {
      // Check if exceeding MRV
      if (currentVolume > landmarks.mrv) {
        warnings.push(
          `Adding this exercise will exceed MRV for ${mg} (${currentVolume} > ${landmarks.mrv})`
        );
      }
    } else if (operation === 'delete') {
      // Check if dropping below MEV
      if (currentVolume < landmarks.mev) {
        warnings.push(
          `Removing this exercise will drop below MEV for ${mg} (${currentVolume} < ${landmarks.mev})`
        );
      }
    }
  }

  return warnings.length > 0 ? warnings.join('; ') : null;
}
