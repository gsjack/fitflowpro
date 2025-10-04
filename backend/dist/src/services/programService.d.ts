export interface Program {
    id: number;
    user_id: number;
    name: string;
    created_at: number;
}
export interface ProgramDayRecord {
    id: number;
    program_id: number;
    day_of_week: number;
    day_name: string;
    day_type: 'strength' | 'vo2max';
}
export interface ProgramExerciseWithDetails {
    id: number;
    program_day_id: number;
    exercise_id: number;
    order_index: number;
    sets: number;
    reps: string;
    rir: number;
    exercise_name: string;
    muscle_groups: string;
    equipment: string;
}
export declare function createDefaultProgram(userId: number): number;
export declare function getUserProgram(userId: number): Program | null;
export declare function getProgramDays(programId: number): ProgramDayRecord[];
export declare function getProgramDayExercises(programDayId: number): ProgramExerciseWithDetails[];
interface PhaseAdvancementResult {
    previous_phase: string;
    new_phase: string;
    volume_multiplier: number;
    exercises_updated: number;
}
export declare function advancePhase(programId: number, manual?: boolean, targetPhase?: string): PhaseAdvancementResult;
export {};
//# sourceMappingURL=programService.d.ts.map