import { db } from '../database/db.js';
const DEFAULT_PROGRAM_DAYS = [
    { day_of_week: 1, day_name: 'Push A (Chest-Focused)', day_type: 'strength' },
    { day_of_week: 2, day_name: 'Pull A (Lat-Focused)', day_type: 'strength' },
    { day_of_week: 3, day_name: 'VO2max A (Norwegian 4x4)', day_type: 'vo2max' },
    { day_of_week: 4, day_name: 'Push B (Shoulder-Focused)', day_type: 'strength' },
    { day_of_week: 5, day_name: 'Pull B (Rhomboid/Trap-Focused)', day_type: 'strength' },
    { day_of_week: 6, day_name: 'VO2max B (30/30 or Zone 2)', day_type: 'vo2max' },
];
const getProgramExerciseTemplate = (programDayIds) => {
    if (programDayIds.length !== 6) {
        throw new Error('Expected 6 program day IDs');
    }
    const day1 = programDayIds[0];
    const day2 = programDayIds[1];
    const day4 = programDayIds[3];
    const day5 = programDayIds[4];
    return [
        { program_day_id: day1, exercise_id: 25, order_index: 1, sets: 3, reps: '6-8', rir: 3 },
        { program_day_id: day1, exercise_id: 1, order_index: 2, sets: 4, reps: '6-8', rir: 3 },
        { program_day_id: day1, exercise_id: 5, order_index: 3, sets: 3, reps: '8-10', rir: 2 },
        { program_day_id: day1, exercise_id: 7, order_index: 4, sets: 3, reps: '12-15', rir: 1 },
        { program_day_id: day1, exercise_id: 20, order_index: 5, sets: 4, reps: '12-15', rir: 1 },
        { program_day_id: day1, exercise_id: 49, order_index: 6, sets: 3, reps: '15-20', rir: 0 },
        { program_day_id: day2, exercise_id: 68, order_index: 1, sets: 3, reps: '5-8', rir: 3 },
        { program_day_id: day2, exercise_id: 14, order_index: 2, sets: 4, reps: '5-8', rir: 3 },
        { program_day_id: day2, exercise_id: 10, order_index: 3, sets: 4, reps: '8-10', rir: 2 },
        { program_day_id: day2, exercise_id: 13, order_index: 4, sets: 3, reps: '12-15', rir: 1 },
        { program_day_id: day2, exercise_id: 16, order_index: 5, sets: 3, reps: '15-20', rir: 0 },
        { program_day_id: day2, exercise_id: 39, order_index: 6, sets: 3, reps: '8-12', rir: 1 },
        { program_day_id: day4, exercise_id: 27, order_index: 1, sets: 3, reps: '8-12', rir: 3 },
        { program_day_id: day4, exercise_id: 18, order_index: 2, sets: 4, reps: '5-8', rir: 3 },
        { program_day_id: day4, exercise_id: 4, order_index: 3, sets: 3, reps: '8-12', rir: 2 },
        { program_day_id: day4, exercise_id: 21, order_index: 4, sets: 4, reps: '15-20', rir: 0 },
        { program_day_id: day4, exercise_id: 22, order_index: 5, sets: 3, reps: '15-20', rir: 0 },
        { program_day_id: day4, exercise_id: 46, order_index: 6, sets: 3, reps: '8-10', rir: 2 },
        { program_day_id: day5, exercise_id: 26, order_index: 1, sets: 3, reps: '6-8', rir: 3 },
        { program_day_id: day5, exercise_id: 10, order_index: 2, sets: 4, reps: '6-8', rir: 3 },
        { program_day_id: day5, exercise_id: 12, order_index: 3, sets: 3, reps: '10-12', rir: 2 },
        { program_day_id: day5, exercise_id: 62, order_index: 4, sets: 4, reps: '12-15', rir: 1 },
        { program_day_id: day5, exercise_id: 22, order_index: 5, sets: 3, reps: '15-20', rir: 0 },
        { program_day_id: day5, exercise_id: 41, order_index: 6, sets: 3, reps: '10-15', rir: 1 },
    ];
};
export function createDefaultProgram(userId) {
    const createProgram = db.transaction(() => {
        const now = Date.now();
        const stmtCreateProgram = db.prepare(`
      INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
        const programResult = stmtCreateProgram.run(userId, 'Renaissance Periodization 6-Day Split', 1, 'mev', now);
        const programId = programResult.lastInsertRowid;
        const stmtCreateProgramDay = db.prepare(`
      INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
      VALUES (?, ?, ?, ?)
    `);
        const programDayIds = [];
        for (const day of DEFAULT_PROGRAM_DAYS) {
            const dayResult = stmtCreateProgramDay.run(programId, day.day_of_week, day.day_name, day.day_type);
            programDayIds.push(dayResult.lastInsertRowid);
        }
        const stmtCreateProgramExercise = db.prepare(`
      INSERT INTO program_exercises (program_day_id, exercise_id, order_index, sets, reps, rir)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const exercises = getProgramExerciseTemplate(programDayIds);
        for (const exercise of exercises) {
            stmtCreateProgramExercise.run(exercise.program_day_id, exercise.exercise_id, exercise.order_index, exercise.sets, exercise.reps, exercise.rir);
        }
        const dayOfWeek = new Date().getDay();
        const dayMapping = [5, 0, 1, 2, 3, 4, 5];
        const todayProgramDayId = programDayIds[dayMapping[dayOfWeek]];
        const stmtCreateWorkout = db.prepare(`
      INSERT INTO workouts (user_id, program_day_id, date, status, synced)
      VALUES (?, ?, date('now'), 'not_started', 0)
    `);
        stmtCreateWorkout.run(userId, todayProgramDayId);
        return programId;
    });
    return createProgram();
}
export function getUserProgram(userId) {
    const stmt = db.prepare(`
    SELECT * FROM programs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
  `);
    return stmt.get(userId) || null;
}
export function getProgramDays(programId) {
    const stmt = db.prepare(`
    SELECT * FROM program_days WHERE program_id = ? ORDER BY day_of_week
  `);
    return stmt.all(programId);
}
export function getProgramDayExercises(programDayId) {
    const stmt = db.prepare(`
    SELECT
      pe.*,
      e.name as exercise_name,
      e.muscle_groups,
      e.equipment
    FROM program_exercises pe
    JOIN exercises e ON pe.exercise_id = e.id
    WHERE pe.program_day_id = ?
    ORDER BY pe.order_index
  `);
    return stmt.all(programDayId);
}
export function advancePhase(programId, manual = false, targetPhase) {
    if (manual && !targetPhase) {
        throw new Error('target_phase is required when manual=true');
    }
    if (targetPhase && !['mev', 'mav', 'mrv', 'deload'].includes(targetPhase)) {
        throw new Error(`Invalid target_phase: ${targetPhase}`);
    }
    const advance = db.transaction(() => {
        const programStmt = db.prepare('SELECT * FROM programs WHERE id = ?');
        const program = programStmt.get(programId);
        if (!program) {
            throw new Error(`Program with ID ${programId} not found`);
        }
        const previousPhase = program.mesocycle_phase;
        let newPhase;
        let volumeMultiplier;
        if (manual && targetPhase) {
            newPhase = targetPhase;
            if (previousPhase === 'mev' && newPhase === 'mav') {
                volumeMultiplier = 1.2;
            }
            else if (previousPhase === 'mav' && newPhase === 'mrv') {
                volumeMultiplier = 1.15;
            }
            else if (previousPhase === 'mrv' && newPhase === 'deload') {
                volumeMultiplier = 0.5;
            }
            else if (previousPhase === 'deload' && newPhase === 'mev') {
                volumeMultiplier = 2.0;
            }
            else if (previousPhase === newPhase) {
                volumeMultiplier = 1.0;
            }
            else {
                volumeMultiplier = calculateMultiplierForTransition(previousPhase, newPhase);
            }
        }
        else {
            const phaseProgression = {
                mev: { next: 'mav', multiplier: 1.2 },
                mav: { next: 'mrv', multiplier: 1.15 },
                mrv: { next: 'deload', multiplier: 0.5 },
                deload: { next: 'mev', multiplier: 2.0 },
            };
            const progression = phaseProgression[previousPhase];
            if (!progression) {
                throw new Error(`Invalid current phase: ${previousPhase}`);
            }
            newPhase = progression.next;
            volumeMultiplier = progression.multiplier;
        }
        const programDayIds = db
            .prepare('SELECT id FROM program_days WHERE program_id = ?')
            .all(programId)
            .map((row) => row.id);
        let exercisesUpdated = 0;
        for (const programDayId of programDayIds) {
            const exercises = db
                .prepare('SELECT id, sets FROM program_exercises WHERE program_day_id = ?')
                .all(programDayId);
            const updateStmt = db.prepare('UPDATE program_exercises SET sets = ? WHERE id = ?');
            for (const exercise of exercises) {
                const newSets = Math.round(exercise.sets * volumeMultiplier);
                updateStmt.run(newSets, exercise.id);
                exercisesUpdated++;
            }
        }
        db.prepare('UPDATE programs SET mesocycle_phase = ?, mesocycle_week = 1 WHERE id = ?').run(newPhase, programId);
        return {
            previous_phase: previousPhase,
            new_phase: newPhase,
            volume_multiplier: volumeMultiplier,
            exercises_updated: exercisesUpdated,
        };
    });
    return advance();
}
function calculateMultiplierForTransition(fromPhase, toPhase) {
    const phaseVolumes = {
        mev: 1.0,
        mav: 1.2,
        mrv: 1.38,
        deload: 0.69,
    };
    const fromVolume = phaseVolumes[fromPhase] || 1.0;
    const toVolume = phaseVolumes[toPhase] || 1.0;
    return toVolume / fromVolume;
}
//# sourceMappingURL=programService.js.map