import { stmtLogSet, db } from '../database/db.js';
import { calculateOneRepMax, roundToDecimals } from '../utils/calculations.js';
import { validateSetParameters, validateNotes } from '../utils/validation.js';
export function logSet(workoutId, exerciseId, setNumber, weightKg, reps, rir, timestamp, localId, notes) {
    validateSetParameters(weightKg, reps, rir);
    validateNotes(notes);
    let finalSetNumber = setNumber;
    if (finalSetNumber === undefined) {
        const existingSets = db
            .prepare('SELECT COUNT(*) as count FROM sets WHERE workout_id = ? AND exercise_id = ?')
            .get(workoutId, exerciseId);
        finalSetNumber = existingSets.count + 1;
    }
    let finalTimestamp;
    if (timestamp === undefined) {
        finalTimestamp = Date.now();
    }
    else if (typeof timestamp === 'string') {
        finalTimestamp = new Date(timestamp).getTime();
    }
    else {
        finalTimestamp = timestamp;
    }
    if (localId) {
        const existingSet = db
            .prepare(`SELECT id, weight_kg, reps, rir FROM sets
         WHERE workout_id = ? AND id = ?`)
            .get(workoutId, localId);
        if (existingSet) {
            const estimated1RM = calculateOneRepMax(existingSet.weight_kg, existingSet.reps, existingSet.rir);
            return {
                id: existingSet.id,
                localId: localId,
                synced: true,
                estimated_1rm: estimated1RM,
                weight_kg: existingSet.weight_kg,
                reps: existingSet.reps,
                rir: existingSet.rir,
            };
        }
    }
    const result = stmtLogSet.run(workoutId, exerciseId, finalSetNumber, weightKg, reps, rir, finalTimestamp, notes ?? null);
    const setId = result.lastInsertRowid;
    const estimated1RM = calculateOneRepMax(weightKg, reps, rir);
    console.log(`Set logged: workout=${workoutId}, exercise=${exerciseId}, ` +
        `${weightKg}kg × ${reps} @ RIR ${rir} (Est. 1RM: ${roundToDecimals(estimated1RM, 1)}kg)`);
    return {
        id: setId,
        localId: localId ?? null,
        synced: true,
        estimated_1rm: estimated1RM,
        weight_kg: weightKg,
        reps: reps,
        rir: rir,
    };
}
export function getSetsForWorkout(workoutId) {
    const sets = db
        .prepare(`SELECT id, workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, notes, synced
       FROM sets
       WHERE workout_id = ?
       ORDER BY id ASC`)
        .all(workoutId);
    return sets;
}
//# sourceMappingURL=setService.js.map