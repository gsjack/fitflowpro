export interface Set {
    id: number;
    workout_id: number;
    exercise_id: number;
    set_number: number;
    weight_kg: number;
    reps: number;
    rir: number;
    timestamp: number;
    notes: string | null;
    synced: number;
}
export interface LogSetResponse {
    id: number;
    localId: number | null;
    synced: boolean;
    estimated_1rm: number;
    weight_kg: number;
    reps: number;
    rir: number;
}
export declare function logSet(workoutId: number, exerciseId: number, setNumber: number, weightKg: number, reps: number, rir: number, timestamp: number, localId?: number, notes?: string): LogSetResponse;
export declare function getSetsForWorkout(workoutId: number): Set[];
//# sourceMappingURL=setService.d.ts.map