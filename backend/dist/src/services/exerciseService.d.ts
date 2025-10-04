export interface Exercise {
    id: number;
    name: string;
    primary_muscle_group: string;
    secondary_muscle_groups: string[];
    equipment: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight';
    movement_pattern: 'compound' | 'isolation';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    default_sets: number;
    default_reps: string;
    default_rir: number;
    description: string;
    video_url?: string;
}
export interface ExerciseFilters {
    muscle_group?: string;
    equipment?: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight';
    movement_pattern?: 'compound' | 'isolation';
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
}
export declare function getExercises(filters?: ExerciseFilters): Exercise[];
export declare function getExerciseById(id: number): Exercise | undefined;
export interface SetPerformance {
    weight_kg: number;
    reps: number;
    rir: number;
}
export interface LastPerformance {
    last_workout_date: string;
    sets: SetPerformance[];
    estimated_1rm: number;
}
export declare function getLastPerformance(userId: number, exerciseId: number): LastPerformance | null;
//# sourceMappingURL=exerciseService.d.ts.map