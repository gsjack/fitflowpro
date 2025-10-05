export interface ProgramExercise {
    id: number;
    program_day_id: number;
    exercise_id: number;
    order_index: number;
    sets: number;
    reps: string;
    rir: number;
}
export interface ProgramExerciseWithDetails extends ProgramExercise {
    exercise_name: string;
    muscle_groups: string;
    equipment: string;
}
export interface ProgramExerciseFilters {
    program_day_id?: number;
    exercise_id?: number;
}
export interface CreateProgramExerciseData {
    program_day_id: number;
    exercise_id: number;
    target_sets: number;
    target_rep_range: string;
    target_rir: number;
    order_index?: number;
}
export interface UpdateProgramExerciseData {
    target_sets?: number;
    target_rep_range?: string;
    target_rir?: number;
}
export interface ExerciseReorderItem {
    program_exercise_id: number;
    new_order_index: number;
}
export declare function getProgramExercises(filters?: ProgramExerciseFilters): ProgramExerciseWithDetails[];
export declare function createProgramExercise(data: CreateProgramExerciseData): {
    program_exercise_id: number;
    volume_warning: string | null;
};
export declare function updateProgramExercise(id: number, data: UpdateProgramExerciseData): {
    updated: boolean;
    volume_warning: string | null;
};
export declare function deleteProgramExercise(id: number): {
    deleted: boolean;
    volume_warning: string | null;
};
export declare function swapExercise(programExerciseId: number, newExerciseId: number): {
    swapped: boolean;
    old_exercise_name: string;
    new_exercise_name: string;
};
export declare function reorderExercises(_programDayId: number, newOrder: ExerciseReorderItem[]): {
    reordered: boolean;
};
//# sourceMappingURL=programExerciseService.d.ts.map