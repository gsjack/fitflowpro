import { stmtLogSet, db, calculateOneRepMax } from '../database/db.js';
export function logSet(workoutId, exerciseId, setNumber, weightKg, reps, rir, timestamp, localId, notes) {
    if (weightKg < 0 || weightKg > 500) {
        throw new Error('Weight must be between 0 and 500 kg');
    }
    if (reps < 1 || reps > 50) {
        throw new Error('Reps must be between 1 and 50');
    }
    if (rir < 0 || rir > 4) {
        throw new Error('RIR must be between 0 and 4');
    }
    if (notes && notes.length > 500) {
        throw new Error('Notes must be 500 characters or less');
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
    const result = stmtLogSet.run(workoutId, exerciseId, setNumber, weightKg, reps, rir, timestamp, notes ?? null);
    const setId = result.lastInsertRowid;
    const estimated1RM = calculateOneRepMax(weightKg, reps, rir);
    console.log(`Set logged: workout=${workoutId}, exercise=${exerciseId}, ` +
        `${weightKg}kg × ${reps} @ RIR ${rir} (Est. 1RM: ${estimated1RM.toFixed(1)}kg)`);
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