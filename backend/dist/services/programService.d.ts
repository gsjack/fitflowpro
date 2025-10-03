export declare function createDefaultProgram(userId: number): number;
export declare function getUserProgram(userId: number): any | null;
export declare function getProgramDays(programId: number): any[];
export declare function getProgramDayExercises(programDayId: number): any[];
interface PhaseAdvancementResult {
    previous_phase: string;
    new_phase: string;
    volume_multiplier: number;
    exercises_updated: number;
}
export declare function advancePhase(programId: number, manual?: boolean, targetPhase?: string): PhaseAdvancementResult;
export {};
//# sourceMappingURL=programService.d.ts.map